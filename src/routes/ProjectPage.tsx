import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '../hooks/useProject'
import AreaCellTree from '../components/cells/AreaCellTree'
import CellDetailPanel from '../components/cells/CellDetailPanel'

export default function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>()
    const { project, areas, cellsByArea, loading } = useProject(projectId)
    const [selectedCellId, setSelectedCellId] = useState<string | null>(null)

    if (loading) return <div className="p-8 text-gray-500">Loading project...</div>
    if (!project) return <div className="p-8 text-red-500">Project not found.</div>

    return (
        <div className="flex flex-col h-full">
            <div className="flex-none mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500">{project.OEM} • {project.model} • {project.status}</p>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Sidebar Tree */}
                <div className="w-1/3 bg-white rounded-lg border border-gray-200 overflow-y-auto">
                    <AreaCellTree
                        areas={areas}
                        cellsByArea={cellsByArea}
                        selectedCellId={selectedCellId}
                        onSelectCell={setSelectedCellId}
                    />
                </div>

                {/* Main Panel */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto">
                    {selectedCellId ? (
                        <CellDetailPanel cellId={selectedCellId} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            Select a cell to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
