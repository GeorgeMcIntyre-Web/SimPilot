import { useState } from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { DataTable, Column } from '../../ui/components/DataTable'
import { useChangeLog, coreStore } from '../../domain/coreStore'
import { ChangeRecord, summarizeChange } from '../../domain/changeLog'
import { downloadChangesAsCsv } from '../../utils/csvExport'
import { Download, Trash2, AlertCircle } from 'lucide-react'

export function ChangesPage() {
    const changes = useChangeLog()
    const [confirmClear, setConfirmClear] = useState(false)

    const columns: Column<ChangeRecord>[] = [
        { header: 'Date', accessor: (c) => new Date(c.createdAt).toLocaleString() },
        { header: 'Type', accessor: (c) => c.kind },
        { header: 'Summary', accessor: (c) => summarizeChange(c) },
        { header: 'ID', accessor: (c) => <span className="text-xs text-gray-400">{c.id}</span> }
    ]

    const handleExport = () => {
        downloadChangesAsCsv(changes)
    }

    const handleClear = () => {
        coreStore.clearChangeLog()
        setConfirmClear(false)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pending Changes"
                subtitle="Review and export changes before they are synced to the master source."
                actions={
                    <div className="flex space-x-3">
                        {confirmClear ? (
                            <div className="flex items-center space-x-2 bg-red-50 p-1 rounded border border-red-200">
                                <span className="text-sm text-red-700 px-2">Are you sure?</span>
                                <button
                                    onClick={handleClear}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                >
                                    Yes, Clear
                                </button>
                                <button
                                    onClick={() => setConfirmClear(false)}
                                    className="px-3 py-1 bg-white text-gray-700 text-sm rounded border hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmClear(true)}
                                disabled={changes.length === 0}
                                className="flex items-center px-4 py-2 border border-red-200 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear Log
                            </button>
                        )}

                        <button
                            onClick={handleExport}
                            disabled={changes.length === 0}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </button>
                    </div>
                }
            />

            {changes.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Pending Changes</h3>
                    <p className="text-gray-500 mt-2">Edits you make to engineer assignments will appear here.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <DataTable
                        data={changes}
                        columns={columns}
                        emptyMessage="No changes found."
                    />
                </div>
            )}
        </div>
    )
}
