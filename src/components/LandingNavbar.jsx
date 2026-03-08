import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkle, List, X, ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingNavbar() {
    const { user, isAdmin } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        setMobileMenuOpen(false);
        if (location.pathname !== '/') {
            return;
        }
        const element = document.getElementById(id);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const navLinks = [
        { name: 'Cara Kerja', id: 'cara-kerja' },
        { name: 'Katalog', id: 'katalog' },
        { name: 'Fitur', id: 'fitur' },
        { name: 'Testimoni', id: 'testimoni' },
        { name: 'FAQ', id: 'faq' },
    ];

    return (
        <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300">
                        <Sparkle weight="fill" className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-extrabold text-xl md:text-2xl text-slate-800 tracking-tight">Jok<span className="text-brand-500">skuy</span></span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <button
                            key={link.id}
                            onClick={() => scrollToSection(link.id)}
                            className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
                        >
                            {link.name}
                        </button>
                    ))}
                </nav>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <Link
                            to={isAdmin ? '/admin' : '/katalog'}
                            className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/25 transition-all duration-300 flex items-center gap-2 group"
                        >
                            Dashboard
                            <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-brand-600 transition-colors"
                            >
                                Masuk
                            </Link>
                            <Link
                                to="/register"
                                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all duration-300"
                            >
                                Daftar Gratis
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Nav */}
            <div className={`md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-xl overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-screen border-t' : 'max-h-0 border-t-0'}`}>
                <div className="py-4 px-4 sm:px-6 flex flex-col gap-2">
                    {navLinks.map((link) => (
                        <button
                            key={link.id}
                            onClick={() => scrollToSection(link.id)}
                            className="text-left text-base font-semibold text-slate-700 p-4 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            {link.name}
                        </button>
                    ))}
                    <div className="h-px bg-slate-100 my-2" />
                    <div className="flex flex-col gap-3 pb-2">
                        {user ? (
                            <Link
                                to={isAdmin ? '/admin' : '/katalog'}
                                className="w-full py-4 rounded-xl bg-brand-500 text-white font-bold text-center shadow-lg shadow-brand-500/20"
                            >
                                Masuk ke Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="w-full py-4 rounded-xl bg-slate-100 text-slate-800 font-bold text-center transition-colors hover:bg-slate-200"
                                >
                                    Masuk
                                </Link>
                                <Link
                                    to="/register"
                                    className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-center shadow-lg shadow-slate-900/20"
                                >
                                    Daftar Gratis
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
