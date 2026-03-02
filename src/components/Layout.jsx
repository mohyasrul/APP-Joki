import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import PushPrompt from './PushPrompt'
import ScrollToTop from './ScrollToTop'

export default function Layout() {
    return (
        <div className="min-h-screen">
            <ScrollToTop />
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
                <Outlet />
            </main>
            <PushPrompt />
            <BottomNav />
        </div>
    )
}
