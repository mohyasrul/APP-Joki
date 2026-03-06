import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from '@phosphor-icons/react'

const ToastContext = createContext({})

export const useToast = () => useContext(ToastContext)

const ICONS = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
}

const COLORS = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }, [])

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
    }

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-24 sm:bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full pointer-events-none" role="status" aria-live="polite">
                {toasts.map(t => {
                    const Icon = ICONS[t.type]
                    return (
                        <div
                            key={t.id}
                            role="alert"
                            className={`border rounded-2xl p-4 flex items-start gap-3 shadow-lg slide-up pointer-events-auto ${COLORS[t.type]}`}
                        >
                            <Icon weight="fill" className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm flex-1">{t.message}</p>
                            <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                                <X weight="bold" className="w-4 h-4" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}
