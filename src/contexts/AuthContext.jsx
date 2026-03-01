import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/pushManager'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
                // Re-subscribe push on session restore
                if (isPushSupported()) {
                    setTimeout(() => subscribeToPush(session.user.id), 2000)
                }
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        setProfile(data)
        setLoading(false)
    }

    const signUp = async (email, password, fullName, phone) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                phone: phone || null,
                role: 'client',
            })
        }
        return data
    }

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Subscribe to push notifications after login
        if (data.user && isPushSupported()) {
            // Delay slightly to not block login flow
            setTimeout(() => subscribeToPush(data.user.id), 2000)
        }

        return data
    }

    const signOut = async () => {
        if (user && isPushSupported()) {
            await unsubscribeFromPush(user.id).catch(() => {})
        }
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
    }

    const isAdmin = profile?.role === 'admin'

    return (
        <AuthContext.Provider value={{ user, profile, setProfile, loading, signUp, signIn, signOut, isAdmin }}>
            {children}
        </AuthContext.Provider>
    )
}
