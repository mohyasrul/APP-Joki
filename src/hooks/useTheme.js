import { useState, useEffect } from 'react'

/**
 * Hook for managing dark/light theme.
 * Persists user preference to localStorage.
 * Applies theme by setting `data-theme` attribute on <html>.
 */
export function useTheme() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark'
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

    return { theme, toggleTheme }
}
