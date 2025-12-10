import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { useProjectById, useAreas, useCells } from '../../ui/hooks/useDomainData';
import { Cell, Area } from '../../domain/core';

export function ProjectDetailPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const project = useProjectById(projectId || '');
    const areas = useAreas(projectId);
    const cells = useCells(projectId);
    const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
    const [areaSearch, setAreaSearch] = useState('');

    if (!project) {
        return (
            <div>
                <PageHeader title="Project Not Found" />
                <p className="text-gray-500">The project you are looking for does not exist.</p>
            </div>
        );
    }

    // Filter cells by area
    const normalizedSearch = areaSearch.trim().toLowerCase();
    const visibleAreas = normalizedSearch
        ? areas.filter((a: Area) => a.name.toLowerCase().includes(normalizedSearch))
        : areas;

    const filteredCells = selectedAreaId === 'ALL'
        ? cells
        : cells.filter((c: Cell) => c.areaId === selectedAreaId);

    const columns: Column<Cell>[] = [
        {
            header: 'Area',
            accessor: (c) => areas.find((a: Area) => a.id === c.areaId)?.name || '-',
            sortValue: (c) => areas.find((a: Area) => a.id === c.areaId)?.name || ''
        },
        {
            header: 'Line',
            accessor: (c) => c.lineCode || '-',
            sortValue: (c) => c.lineCode || ''
        },
        {
            header: 'Station',
            accessor: (c) => c.code,
            sortValue: (c) => c.code || ''
        },
        {
            header: 'Station Name',
            accessor: (c) => <Link to={`/cells/${encodeURIComponent(c.id)}`} className="text-blue-600 hover:underline font-medium">{c.name}</Link>,
            sortValue: (c) => c.name
        },
        {
            header: 'Engineer',
            accessor: (c) => c.assignedEngineer || '-',
            sortValue: (c) => c.assignedEngineer || ''
        },
        {
            header: '% Complete',
            accessor: (c) => c.simulation ? `${c.simulation.percentComplete}%` : '-',
            sortValue: (c) => c.simulation?.percentComplete ?? -1
        },
        {
            header: 'Status',
            accessor: (c) => <StatusPill status={c.status} />,
            sortValue: (c) => c.status
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <Link to="/projects" className="hover:text-blue-600">Projects</Link>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white font-medium">{project.name}</span>
                </div>
                <PageHeader
                    title={project.name}
                    subtitle={`${project.customer} - ${project.status}`}
                    actions={
                        <div className="flex items-center space-x-3">
                            <Link
                                to={`/timeline/${project.id}`}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                View Timeline
                            </Link>
                            <StatusPill status={project.status} />
                        </div>
                    }
                />
            </div>

            <div className="flex flex-col md:flex-row gap-6" style={{ height: 'calc(100vh - 20rem)' }}>
                {/* Left Sidebar: Areas */}
                <div className="w-full md:w-64 flex-shrink-0 flex flex-col">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col h-full">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Areas</h3>
                        </div>
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <input
                                type="text"
                                value={areaSearch}
                                onChange={(e) => setAreaSearch(e.target.value)}
                                placeholder="Search areas..."
                                className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedAreaId('ALL')}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedAreaId === 'ALL'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    All Areas
                                </button>
                                {visibleAreas.map((area: Area) => (
                                    <button
                                        key={area.id}
                                        onClick={() => setSelectedAreaId(area.id)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedAreaId === area.id
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {area.name}
                                    </button>
                                ))}
                                {visibleAreas.length === 0 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 px-1 py-2">
                                        No areas match your search.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content: Stations Table */}
                <div className="flex-1 flex flex-col">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg flex flex-col h-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Stations ({filteredCells.length})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <DataTable
                                data={filteredCells}
                                columns={columns}
                                enableSorting
                                defaultSortIndex={2}
                                emptyMessage="No cells found for this area."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
