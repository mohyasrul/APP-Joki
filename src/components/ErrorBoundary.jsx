import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    handleReload = () => {
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center px-4" role="alert">
                    <div className="max-w-md w-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h1 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h1>
                        <p className="text-sm text-slate-400 mb-6">
                            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <pre className="glass rounded-xl p-4 text-xs text-red-300 text-left mb-6 overflow-auto max-h-40">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 rounded-xl glass glass-hover text-white font-medium text-sm flex items-center justify-center gap-2 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Coba Lagi
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
                            >
                                Ke Halaman Utama
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
