import { useEffect, useState } from 'react';
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

    const { from: fromPath, fromLabel } = (location.state || {}) as { from?: string; fromLabel?: string };
    const breadcrumbRootHref = fromPath || '/projects';
    const breadcrumbRootLabel = fromLabel || 'Projects';

    useEffect(() => {
        if (cell?.simulation?.studyPath) {
            setSimStatus('linked');
            simBridgeClient.getStatus().then(s => {
                if (s.isConnected) setSimStatus('online');
                else setSimStatus('offline');
            });
        }
    }, [cell?.simulation?.studyPath]);

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
        <div className="space-y-5" data-testid="cell-detail-root">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link to={breadcrumbRootHref} className="hover:text-blue-600">{breadcrumbRootLabel}</Link>
                <span>/</span>
                {cell.projectId && <Link to={`/projects/${cell.projectId}`} className="hover:text-blue-600">Project</Link>}
                <span>/</span>
                <span className="text-gray-900 dark:text-white font-medium">{cell.name}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Station {cell.code || '-'}</p>
                            {isAtRisk && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-200">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    At Risk
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{cell.name}</h1>
                            <StatusPill status={cell.status} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                            {cell.lineCode && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">Line {cell.lineCode}</span>}
                            {cell.oemRef && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">OEM: {cell.oemRef}</span>}
                            <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">ID: {cell.id}</span>
                        </div>
                        <CellChaosHint cell={cell} />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatPill label="Engineer" value={cell.assignedEngineer || 'Unassigned'} />
                    <StatPill label="% Complete" value={cell.simulation ? `${cell.simulation.percentComplete}%` : 'No data'} />
                    <StatPill label="Issues" value={cell.simulation ? (cell.simulation.hasIssues ? 'Flagged' : 'Clear') : 'Not linked'} tone={cell.simulation?.hasIssues ? 'warn' : cell.simulation ? 'ok' : 'muted'} />
                    <StatPill label="Updated" value={cell.lastUpdated ? new Date(cell.lastUpdated).toLocaleDateString() : 'Unknown'} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Assigned Engineer</h3>
                        </div>
                        {!isEditingEngineer && (
                            <button
                                onClick={handleEditEngineer}
                                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                                title="Edit Engineer"
                                data-testid="edit-engineer-button"
                            >
                                Edit
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Keep ownership clear and current.</p>
                    {isEditingEngineer ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                list="engineers-list"
                                value={selectedEngineer}
                                onChange={(e) => setSelectedEngineer(e.target.value)}
                                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter engineer name..."
                            />
                            <datalist id="engineers-list">
                                {allEngineers.map(e => (
                                    <option key={e.engineerName} value={e.engineerName} />
                                ))}
                            </datalist>
                            <button
                                onClick={handleSaveEngineer}
                                className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100"
                                title="Save"
                                data-testid="save-engineer-button"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setIsEditingEngineer(false)}
                                className="p-2 bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-200"
                                title="Cancel"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white font-semibold">
                            {cell.assignedEngineer || 'Unassigned'}
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Simulation</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">Status & lineage</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Quick health check for this study.</p>
                        </div>
                        {cell.simulation?.studyPath && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${simStatus === 'online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800' :
                                simStatus === 'offline' ? 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700' :
                                    'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800'
                                }`}>
                                {simStatus === 'online' ? 'Simulation online' :
                                    simStatus === 'offline' ? 'Simulation offline' :
                                        'Simulation linked'}
                            </span>
                        )}
                    </div>
                    {cell.simulation ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatPill label="Percent Complete" value={`${cell.simulation.percentComplete}%`} />
                            <StatPill label="Issues" value={cell.simulation.hasIssues ? 'Flagged' : 'Clear'} tone={cell.simulation.hasIssues ? 'warn' : 'ok'} />
                            <StatPill label="Study Path" value={cell.simulation.studyPath ? 'Linked' : 'Not linked'} />
                            <StatPill label="Source" value={cell.simulation.sourceFile || 'Unknown'} />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No simulation data available.</p>
                    )}

                    {cell.simulation && (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                                <div>
                                    <div className="font-semibold truncate">{cell.simulation.sourceFile}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Sheet {cell.simulation.sheetName} • Row {cell.simulation.rowIndex}
                                    </div>
                                </div>
                            </div>
                            {cell.simulation.studyPath && (
                                <button
                                    onClick={handleOpenSimulation}
                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <MonitorPlay className="h-4 w-4" />
                                    Open in Simulation
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Robots ({robots.length})</h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Station assets</div>
                    </div>
                    <DataTable
                        data={robots}
                        columns={robotColumns}
                        emptyMessage="No robots assigned to this cell."
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tools ({tools.length})</h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Guns, grippers, others</div>
                    </div>
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

interface StatPillProps {
    label: string;
    value: string;
    tone?: 'warn' | 'ok' | 'muted';
}

function StatPill({ label, value, tone }: StatPillProps) {
    const toneClasses = tone === 'warn'
        ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200'
        : tone === 'ok'
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-800 dark:text-gray-200';

    return (
        <div className={`rounded-lg border px-3 py-2 ${toneClasses}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
            <div className="text-sm font-semibold truncate">{value}</div>
        </div>
    );
}
