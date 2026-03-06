import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar, { AdminHeader } from './Navbar'
import BottomNav from './BottomNav'
import PushPrompt from './PushPrompt'
import ScrollToTop from './ScrollToTop'
import Sidebar from './Sidebar'
import SearchCommand from './SearchCommand'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
    const { isAdmin } = useAuth()
    const [showSearch, setShowSearch] = useState(false)

    const toggleSearch = useCallback(() => setShowSearch(v => !v), [])

    useEffect(() => {
        if (!isAdmin) return
        const handleKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                toggleSearch()
            }
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [isAdmin, toggleSearch])

    return (
        <div className="min-h-screen flex flex-col bg-pagebg">
            <ScrollToTop />
            {/* Client: top navbar */}
            {!isAdmin && <Navbar />}
            <div className="flex flex-1">
                {/* Admin: sidebar left + main right */}
                {isAdmin && <Sidebar />}
                <main className={`flex-1 min-w-0 flex flex-col ${isAdmin ? 'h-screen overflow-hidden' : 'px-3 sm:px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full'}`}>
                    {/* Admin header inside main area */}
                    {isAdmin && <AdminHeader onOpenSearch={() => setShowSearch(true)} />}
                    <div className={isAdmin ? 'flex-1 overflow-y-auto px-3 md:px-8 pb-24 md:pb-8' : ''}>
                        <Outlet />
                    </div>
                </main>
            </div>
            <PushPrompt />
            <BottomNav />
            {isAdmin && <SearchCommand open={showSearch} onClose={() => setShowSearch(false)} />}
        </div>
    )
}
