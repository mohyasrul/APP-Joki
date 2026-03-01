import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import PushPrompt from './PushPrompt'

export default function Layout() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <Outlet />
            </main>
            <PushPrompt />
        </div>
    )
}
