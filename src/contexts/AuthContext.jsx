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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                localStorage.setItem('awaiting_password_reset', 'true')
            }
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

            // PGRST116 = no rows found; can happen for accounts that registered
            // after email verification was enabled but before upgrade-v8 was applied
            // (profile insert was silently rejected by RLS — no session during signUp).
            // Safety-net: create the missing profile now that the user is authenticated.
            if (error?.code === 'PGRST116') {
                const { data: { user: authUser } } = await supabase.auth.getUser()
                const meta = authUser?.user_metadata ?? {}
                const { data: newProfile, error: insertErr } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        full_name: meta.full_name || '',
                        phone: meta.phone || null,
                        role: 'client',
                    })
                    .select()
                    .single()
                if (insertErr) throw insertErr
                setProfile(newProfile)
            } else {
                if (error) throw error
                setProfile(data)
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err)
            setProfile(null)
        } finally {
            setLoading(false)
        }
    }

    const signUp = async (email, password, fullName, phone) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin + '/login',
                // Store metadata so the DB trigger (handle_new_user) and the
                // fetchProfile safety-net can populate the profile row correctly.
                data: { full_name: fullName, phone: phone || null },
            },
        })
        if (error) throw error

        // Only attempt manual profile insert when a session is present
        // (i.e. email verification is disabled / user is auto-confirmed).
        // When email verification is ON, data.session is null here — the DB
        // trigger handle_new_user() will create the profile row instead.
        if (data.user && data.session) {
            const { error: profileErr } = await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                phone: phone || null,
                role: 'client',
            })
            if (profileErr) console.warn('Profile insert warning:', profileErr.message)
        }
        return data
    }

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        localStorage.removeItem('awaiting_password_reset') // Clear lock on manual login

        // Push subscription is now handled by PushPrompt component
        // (requires user gesture on mobile Chrome)

        return data
    }

    const signOut = async () => {
        if (user && isPushSupported()) {
            await unsubscribeFromPush(user.id).catch(() => { })
        }
        await supabase.auth.signOut()
        localStorage.removeItem('awaiting_password_reset')
        setUser(null)
        setProfile(null)
    }

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
    }

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
    }

    const isAdmin = profile?.role === 'admin'

    return (
        <AuthContext.Provider value={{ user, profile, setProfile, loading, signUp, signIn, signOut, resetPassword, updatePassword, isAdmin }}>
            {children}
        </AuthContext.Provider>
    )
}
