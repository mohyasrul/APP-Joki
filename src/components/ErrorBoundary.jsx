import { Component } from 'react'
import { Warning, ArrowsClockwise } from '@phosphor-icons/react'

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
                <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50" role="alert">
                    <div className="max-w-md w-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <Warning weight="fill" className="w-8 h-8 text-red-400" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h1>
                        <p className="text-sm text-slate-500 mb-6">
                            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
                        </p>
                        {this.state.error && (
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-xs text-red-500 text-left mb-6 overflow-auto max-h-64">
                                <p className="font-bold mb-2">{this.state.error.message}</p>
                                <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                            >
                                <ArrowsClockwise weight="bold" className="w-4 h-4" />
                                Coba Lagi
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-all shadow-sm"
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
