import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isPushSupported, unsubscribeFromPush } from '../lib/pushManager'

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
                // Push re-subscribe is now handled by PushPrompt component
                // (requires user gesture on mobile Chrome)
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
            if (error) throw error
            setProfile(data)
        } catch (err) {
            console.error('Failed to fetch profile:', err)
            setProfile(null)
        } finally {
            setLoading(false)
        }
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

        // Push subscription is now handled by PushPrompt component
        // (requires user gesture on mobile Chrome)

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
