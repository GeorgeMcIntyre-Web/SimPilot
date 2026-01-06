import { useState } from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { useWarnings } from '../../ui/hooks/useDomainData'
import { AlertTriangle, FileText, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { EmptyState } from '../../ui/components/EmptyState'
import { PageHint } from '../../ui/components/PageHint'

export function WarningsPage() {
    const warnings = useWarnings()
    const [copied, setCopied] = useState(false)
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

    // Mock parsing for now since we only have strings
    // We'll treat the whole string as the message if we can't parse
    const parsedWarnings = warnings.map(w => {
        // Try to extract some structure if possible, otherwise default
        return {
            original: w,
            file: 'Unknown File', // We might not have this in the string
            kind: 'Warning',
            details: w
        }
    })

    // Group by file
    const grouped = parsedWarnings.reduce((acc, w) => {
        if (!acc[w.file]) acc[w.file] = []
        acc[w.file].push(w)
        return acc
    }, {} as Record<string, typeof parsedWarnings>)

    const toggleFile = (file: string) => {
        const next = new Set(expandedFiles)
        if (next.has(file)) next.delete(file)
        else next.add(file)
        setExpandedFiles(next)
    }

    const handleCopy = async () => {
        if (!navigator.clipboard) return
        try {
            await navigator.clipboard.writeText(warnings.join('\n'))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <PageHeader
                    title="Ingestion Warnings"
                    subtitle={
                        <PageHint
                            standardText="Review issues found during data loading"
                            flowerText="No major thorns detected – data looks clean."
                        />
                    }
                />
                <button
                    onClick={handleCopy}
                    disabled={warnings.length === 0}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                    {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied' : 'Copy Visible'}
                </button>
            </div>

            {/* Summary */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-3" />
                <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                    {warnings.length} total warnings found.
                </span>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                {Object.keys(grouped).length === 0 ? (
                    <EmptyState
                        title="All Clear"
                        message="No warnings found"
                    />
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(grouped).map(([file, fileWarnings]) => (
                            <div key={file} className="bg-white dark:bg-gray-800">
                                <button
                                    onClick={() => toggleFile(file)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                                >
                                    <div className="flex items-center">
                                        {expandedFiles.has(file) ? (
                                            <ChevronDown className="h-5 w-5 text-gray-400 mr-2" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-gray-400 mr-2" />
                                        )}
                                        <FileText className="h-5 w-5 text-blue-500 mr-2" />
                                        <span className="font-medium text-gray-900 dark:text-white">{file}</span>
                                        <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                                            {fileWarnings.length}
                                        </span>
                                    </div>
                                </button>

                                {expandedFiles.has(file) && (
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-100 dark:border-gray-700">
                                        <ul className="space-y-2">
                                            {fileWarnings.map((w, idx) => (
                                                <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300 font-mono">
                                                    <span className="mr-2 text-yellow-600 dark:text-yellow-500">•</span>
                                                    {w.details}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default WarningsPage
