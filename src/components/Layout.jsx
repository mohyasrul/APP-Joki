import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import PushPrompt from './PushPrompt'
import ScrollToTop from './ScrollToTop'
import Sidebar from './Sidebar'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
    const { isAdmin } = useAuth()

    return (
        <div className="min-h-screen flex flex-col">
            <ScrollToTop />
            <Navbar />
            <div className="flex flex-1">
                {isAdmin && <Sidebar />}
                <main className={`flex-1 min-w-0 px-4 sm:px-6 py-6 pb-28 md:pb-6 ${
                    isAdmin ? '' : 'max-w-7xl mx-auto w-full'
                }`}>
                    <Outlet />
                </main>
            </div>
            <PushPrompt />
            <BottomNav />
        </div>
    )
}
