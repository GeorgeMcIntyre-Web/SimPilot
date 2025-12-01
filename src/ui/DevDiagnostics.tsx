import { useState, useEffect } from 'react'
import { useCoreStore, useWarnings } from '../domain/coreStore'
import { AlertTriangle, Activity, X } from 'lucide-react'

export function DevDiagnostics() {
    const [isVisible, setIsVisible] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const store = useCoreStore()
    const warnings = useWarnings()

    useEffect(() => {
        const checkDebug = () => {
            const searchParams = new URLSearchParams(window.location.search)
            setIsVisible(searchParams.has('debug'))
        }

        checkDebug()
        window.addEventListener('popstate', checkDebug)
        return () => window.removeEventListener('popstate', checkDebug)
    }, [])

    if (!isVisible) return null

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="fixed bottom-4 right-4 bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-mono shadow-lg z-50 hover:bg-gray-800 flex items-center space-x-2 opacity-75 hover:opacity-100 transition-opacity"
            >
                <Activity className="h-3 w-3" />
                <span>Diagnostics</span>
            </button>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg p-4 w-80 z-50 text-sm font-mono">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-blue-500" />
                    Dev Diagnostics
                </h3>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Store Counts</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between">
                            <span>Projects:</span>
                            <span className="font-bold">{store.projects.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Cells:</span>
                            <span className="font-bold">{store.cells.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Robots:</span>
                            <span className="font-bold">{store.assets.filter(a => a.kind === 'ROBOT').length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tools:</span>
                            <span className="font-bold">{store.assets.filter(a => a.kind !== 'ROBOT').length}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Ingestion</h4>
                    <div className="flex justify-between">
                        <span>Last Updated:</span>
                        <span className="text-xs">{store.lastUpdated ? new Date(store.lastUpdated).toLocaleTimeString() : 'Never'}</span>
                    </div>
                    <div className="flex justify-between text-yellow-600 dark:text-yellow-500">
                        <span>Warnings:</span>
                        <span className="font-bold">{warnings.length}</span>
                    </div>
                </div>

                {warnings.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Latest Warnings</h4>
                        <ul className="space-y-1 max-h-32 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
                            {warnings.slice(0, 5).map((w, i) => (
                                <li key={i} className="truncate flex items-start">
                                    <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0 text-yellow-500 mt-0.5" />
                                    <span>{w}</span>
                                </li>
                            ))}
                            {warnings.length > 5 && (
                                <li className="text-center italic text-gray-400">
                                    +{warnings.length - 5} more
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}
