import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { Tag } from '../../ui/components/Tag';
import { useCellById, useRobotsByCell, useToolsByCell, useAllEngineerMetrics, coreStore } from '../../domain/coreStore';
import { Robot, Tool } from '../../domain/core';
import { createCellEngineerAssignmentChange } from '../../domain/changeLog';
import { FileSpreadsheet, AlertTriangle, User, Edit2, Check, X, MonitorPlay } from 'lucide-react';
import { CellChaosHint } from '../../ui/components/CellChaosHint';
import { simBridgeClient } from '../../integrations/simbridge/SimBridgeClient';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';

export function CellDetailPage() {
    const { cellId } = useParams<{ cellId: string }>();
    const location = useLocation();
    const cell = useCellById(cellId);
    const robots = useRobotsByCell(cellId || '');
    const tools = useToolsByCell(cellId || '');
    const allEngineers = useAllEngineerMetrics();
    const { pushBusy, popBusy } = useGlobalBusy();

    const [isEditingEngineer, setIsEditingEngineer] = useState(false);
    const [selectedEngineer, setSelectedEngineer] = useState<string>('');
    const [simStatus, setSimStatus] = useState<'unknown' | 'linked' | 'online' | 'offline'>('unknown');

    // Check sim status on mount
    useState(() => {
        if (cell?.simulation?.studyPath) {
            setSimStatus('linked');
            // Optimistically check if we can reach SimBridge
            simBridgeClient.getStatus().then(s => {
                if (s.isConnected) setSimStatus('online');
                else setSimStatus('offline');
            });
        }
    });

    const { from: fromPath, fromLabel } = (location.state || {}) as { from?: string; fromLabel?: string };
    const breadcrumbRootHref = fromPath || '/projects';
    const breadcrumbRootLabel = fromLabel || 'Projects';

    if (!cell) {
        return (
            <div>
                <PageHeader title="Station Not Found" />
                <p className="text-gray-500">The station you are looking for does not exist.</p>
            </div>
        );
    }

    const isAtRisk = cell.simulation?.hasIssues || (cell.simulation?.percentComplete && cell.simulation.percentComplete > 0 && cell.simulation.percentComplete < 100 && cell.status === 'Blocked');

    const handleEditEngineer = () => {
        setSelectedEngineer(cell.assignedEngineer || '');
        setIsEditingEngineer(true);
    };

    const handleSaveEngineer = () => {
        if (selectedEngineer !== cell.assignedEngineer) {
            const change = createCellEngineerAssignmentChange(
                cell.id,
                cell.assignedEngineer,
                selectedEngineer,
                cell.projectId,
                cell.areaId
            );
            coreStore.addChange(change);
            coreStore.updateCellEngineer(cell.id, selectedEngineer);
        }
        setIsEditingEngineer(false);
    };

    const handleOpenSimulation = async () => {
        if (!cell.simulation?.studyPath) return;

        pushBusy('Opening simulation in Tecnomatix...');
        try {
            const connected = await simBridgeClient.connect();
            if (!connected) {
                alert("We couldn't reach the simulation server right now. It's safe to continue your planning – the data in SimPilot is still valid.");
                setSimStatus('offline');
                return;
            }

            const success = await simBridgeClient.loadStudy(cell.simulation.studyPath);
            if (success) {
                setSimStatus('online');
            } else {
                alert("Failed to load the study. Please check if the file exists on the server.");
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred while trying to open the simulation.");
        } finally {
            popBusy();
        }
    };

    const robotColumns: Column<Robot>[] = [
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Model', accessor: (r) => r.oemModel || '-' },
        { header: 'Station', accessor: (r) => r.stationCode || '-' },
        { header: 'Source', accessor: (r) => r.sourceFile ? <span className="text-xs text-gray-500" title={`${r.sourceFile} (Sheet: ${r.sheetName}, Row: ${r.rowIndex})`}>{r.sourceFile}</span> : '-' },
    ];

    const toolColumns: Column<Tool>[] = [
        { header: 'Name', accessor: (t) => t.name },
        { header: 'Type', accessor: (t) => <Tag label={t.toolType} color="blue" /> },
        { header: 'Model', accessor: (t) => t.oemModel || '-' },
        { header: 'Mount', accessor: (t) => t.mountType },
        { header: 'Source', accessor: (t) => t.sourceFile ? <span className="text-xs text-gray-500" title={`${t.sourceFile} (Sheet: ${t.sheetName}, Row: ${t.rowIndex})`}>{t.sourceFile}</span> : '-' },
    ];

    return (
        <div className="space-y-8" data-testid="cell-detail-root">
            {/* Header */}
            <div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <Link to={breadcrumbRootHref} className="hover:text-blue-600">{breadcrumbRootLabel}</Link>
                    <span>/</span>
                    {cell.projectId && <Link to={`/projects/${cell.projectId}`} className="hover:text-blue-600">Project</Link>}
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white font-medium">{cell.name}</span>
                </div>
                <div className="flex items-start justify-between">
                    <div>
                        <PageHeader
                            title={cell.name}
                            subtitle={`Station: ${cell.code || '-'}`}
                            actions={<StatusPill status={cell.status} />}
                        />
                        <CellChaosHint cell={cell} />
                    </div>
                    {isAtRisk && (
                        <div className="flex items-center bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-2 rounded-md border border-red-200 dark:border-red-800">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            <span className="font-medium">At Risk</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Engineer Assignment */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-500" />
                    Assigned Engineer
                </h3>
                <div className="flex items-center space-x-4">
                    {isEditingEngineer ? (
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                list="engineers-list"
                                value={selectedEngineer}
                                onChange={(e) => setSelectedEngineer(e.target.value)}
                                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Enter engineer name..."
                            />
                            <datalist id="engineers-list">
                                {allEngineers.map(e => (
                                    <option key={e.engineerName} value={e.engineerName} />
                                ))}
                            </datalist>
                            <button
                                onClick={handleSaveEngineer}
                                className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                title="Save"
                                data-testid="save-engineer-button"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setIsEditingEngineer(false)}
                                className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                title="Cancel"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-900 dark:text-white font-medium">
                                {cell.assignedEngineer || 'Unassigned'}
                            </span>
                            <button
                                onClick={handleEditEngineer}
                                className="p-1 text-gray-400 hover:text-blue-500"
                                title="Edit Engineer"
                                data-testid="edit-engineer-button"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Simulation Status & Lineage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Simulation Status</h3>
                        {cell.simulation?.studyPath && (
                            <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${simStatus === 'online' ? 'bg-green-100 text-green-800' :
                                    simStatus === 'offline' ? 'bg-gray-100 text-gray-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                    {simStatus === 'online' ? 'Simulation: Online' :
                                        simStatus === 'offline' ? 'Simulation: Offline' :
                                            'Simulation: Linked'}
                                </span>
                                <button
                                    onClick={handleOpenSimulation}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <MonitorPlay className="h-4 w-4 mr-1.5" />
                                    Open in Simulation
                                </button>
                            </div>
                        )}
                    </div>
                    {cell.simulation ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <div className="text-sm text-gray-500">Percent Complete</div>
                                <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                                    {cell.simulation.percentComplete}%
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Issues</div>
                                <div className="mt-1">
                                    {cell.simulation.hasIssues ? (
                                        <span className="text-red-600 font-medium flex items-center">
                                            <AlertTriangle className="h-4 w-4 mr-1" /> Yes
                                        </span>
                                    ) : (
                                        <span className="text-green-600 font-medium">No</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">No simulation data available.</p>
                    )}
                </div>

                {/* Data Source Card */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <FileSpreadsheet className="h-5 w-5 mr-2 text-blue-500" />
                        Data Source
                    </h3>
                    {cell.simulation ? (
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider">File</div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white break-all" title={cell.simulation.sourceFile}>
                                    {cell.simulation.sourceFile}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Sheet</div>
                                    <div className="text-sm text-gray-900 dark:text-white">{cell.simulation.sheetName}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Row</div>
                                    <div className="text-sm text-gray-900 dark:text-white">{cell.simulation.rowIndex}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Source information unavailable.</p>
                    )}
                </div>
            </div>

            {/* Equipment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Robots ({robots.length})</h3>
                    <DataTable
                        data={robots}
                        columns={robotColumns}
                        emptyMessage="No robots assigned to this cell."
                    />
                </div>
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tools ({tools.length})</h3>
                    <DataTable
                        data={tools}
                        columns={toolColumns}
                        emptyMessage="No tools assigned to this cell."
                    />
                </div>
            </div>
        </div>
    );
}
