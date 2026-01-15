import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { Tag } from '../../ui/components/Tag';
import { useCellById, useRobotsByCell, useToolsByCell, useAllEngineerMetrics } from '../../ui/hooks/useDomainData';
import { coreStore } from '../../domain/coreStore';
import { Tool } from '../../domain/core';
import { createCellEngineerAssignmentChange } from '../../domain/changeLog';
import { FileSpreadsheet, AlertTriangle, User, Check, X, MonitorPlay } from 'lucide-react';
import { CellChaosHint } from '../../ui/components/CellChaosHint';
import { simBridgeClient } from '../../integrations/simbridge/SimBridgeClient';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';
import { log } from '../../lib/log';
import { useCrossRefData } from '../../hooks/useCrossRefData';
import { normalizeStationId } from '../../domain/crossRef/CrossRefUtils';
import { RobotSnapshot } from '../../domain/crossRef/CrossRefTypes';

export function CellDetailPage() {
    const { cellId } = useParams<{ cellId: string }>();
    const location = useLocation();
    const decodedCellId = cellId ? decodeURIComponent(cellId) : undefined;
    const cell = useCellById(decodedCellId);
    const legacyRobots = useRobotsByCell(decodedCellId || '');
    const tools = useToolsByCell(decodedCellId || '');
    const allEngineers = useAllEngineerMetrics();
    const { pushBusy, popBusy } = useGlobalBusy();

    // Get robots from CrossRef data (includes robots from simulation status)
    const { cells: crossRefCells } = useCrossRefData();

    // Find matching CrossRef cell to get robots from simulation status
    const crossRefRobots = useMemo(() => {
        if (!cell?.code) return [];

        const normalizedCode = normalizeStationId(cell.code);
        const matchingCell = crossRefCells.find(c => c.stationKey === normalizedCode);

        return matchingCell?.robots || [];
    }, [cell?.code, crossRefCells]);

    // Merge legacy robots with CrossRef robots (prefer CrossRef as it includes simulation status robots)
    const robots = useMemo(() => {
        // If we have CrossRef robots, use those (they include simulation status robots)
        if (crossRefRobots.length > 0) {
            // Convert RobotSnapshot to a display-friendly format
            return crossRefRobots.map((r: RobotSnapshot) => ({
                id: r.robotKey,
                name: r.caption || r.robotKey,
                oemModel: r.oemModel,
                stationCode: r.stationKey,
                sourceFile: (r.raw as any)?.source === 'simulationStatus' ? 'Simulation Status' : (r.raw as any)?.sourceFile,
                sheetName: (r.raw as any)?.sheetName,
                rowIndex: (r.raw as any)?.sourceRowIndex,
                // Additional fields for display
                hasDressPackInfo: r.hasDressPackInfo,
                eNumber: r.eNumber
            }));
        }

        // Fall back to legacy robots
        return legacyRobots;
    }, [crossRefRobots, legacyRobots]);

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
            log.error('Failed to open simulation', e);
            alert("An error occurred while trying to open the simulation.");
        } finally {
            popBusy();
        }
    };

    // Use a flexible type for robot columns since we merge CrossRef and legacy robots
    type RobotDisplay = { name: string; oemModel?: string; stationCode?: string; sourceFile?: string; sheetName?: string; rowIndex?: number };
    const robotColumns: Column<RobotDisplay>[] = [
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Model', accessor: (r) => r.oemModel || '-' },
        { header: 'Station', accessor: (r) => r.stationCode || '-' },
        { header: 'Source', accessor: (r) => r.sourceFile ? <span className="text-xs text-gray-500" title={`${r.sourceFile}${r.sheetName ? ` (Sheet: ${r.sheetName}` : ''}${r.rowIndex ? `, Row: ${r.rowIndex})` : ')'}`}>{r.sourceFile}</span> : '-' },
    ];

    const toolColumns: Column<Tool>[] = [
        { header: 'Name', accessor: (t) => t.name },
        { header: 'Type', accessor: (t) => <Tag label={t.toolType} color="blue" /> },
        { header: 'Model', accessor: (t) => t.oemModel || '-' },
        { header: 'Mount', accessor: (t) => t.mountType },
        { header: 'Source', accessor: (t) => t.sourceFile ? <span className="text-xs text-gray-500" title={`${t.sourceFile} (Sheet: ${t.sheetName}, Row: ${t.rowIndex})`}>{t.sourceFile}</span> : '-' },
    ];

    return (
        <div className="space-y-4" data-testid="cell-detail-root">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <Link to={breadcrumbRootHref} className="hover:text-blue-600 dark:hover:text-blue-400">{breadcrumbRootLabel}</Link>
                <span>/</span>
                {cell.projectId && <Link to={`/projects/${cell.projectId}`} className="hover:text-blue-600 dark:hover:text-blue-400">Project</Link>}
                <span>/</span>
                <span className="text-gray-900 dark:text-white font-medium">{cell.name}</span>
            </div>

            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">Station {cell.code || '-'}</p>
                                {isAtRisk && (
                                    <span className="inline-flex items-center gap-1 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-200">
                                        <AlertTriangle className="h-3 w-3" />
                                        At Risk
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{cell.name}</h1>
                                <StatusPill status={cell.status} />
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400 flex-wrap">
                                {cell.lineCode && <span className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">Line {cell.lineCode}</span>}
                                {cell.oemRef && <span className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">OEM: {cell.oemRef}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <StatPill label="Engineer" value={cell.assignedEngineer || 'Unassigned'} />
                        <StatPill label="Complete" value={cell.simulation ? `${cell.simulation.percentComplete}%` : 'No data'} />
                        <StatPill label="Issues" value={cell.simulation ? (cell.simulation.hasIssues ? 'Flagged' : 'Clear') : 'Not linked'} tone={cell.simulation?.hasIssues ? 'warn' : cell.simulation ? 'ok' : 'muted'} />
                        <StatPill label="Updated" value={cell.lastUpdated ? new Date(cell.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown'} />
                    </div>
                    <CellChaosHint cell={cell} />
                </div>
            </div>

            {/* Engineer & Simulation Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Engineer Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-blue-500" />
                                <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Engineer</h3>
                            </div>
                            {!isEditingEngineer && (
                                <button
                                    onClick={handleEditEngineer}
                                    className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                                    title="Edit Engineer"
                                    data-testid="edit-engineer-button"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-3">
                        {isEditingEngineer ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    list="engineers-list"
                                    value={selectedEngineer}
                                    onChange={(e) => setSelectedEngineer(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter engineer name..."
                                />
                                <datalist id="engineers-list">
                                    {allEngineers.map(e => (
                                        <option key={e.name} value={e.name} />
                                    ))}
                                </datalist>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveEngineer}
                                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                                        title="Save"
                                        data-testid="save-engineer-button"
                                    >
                                        <Check className="h-3 w-3" />
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsEditingEngineer(false)}
                                        className="px-2 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[11px] hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                                        title="Cancel"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-900 dark:text-white font-semibold">
                                {cell.assignedEngineer || <span className="text-gray-400">Unassigned</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Simulation Card */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
                                <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Simulation</h3>
                            </div>
                            {cell.simulation?.studyPath && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${simStatus === 'online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' :
                                    simStatus === 'offline' ? 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' :
                                        'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                    }`}>
                                    {simStatus === 'online' ? '● Online' :
                                        simStatus === 'offline' ? '○ Offline' :
                                            '◐ Linked'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-3 space-y-3">
                        {cell.simulation ? (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-2">
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Progress</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{cell.simulation.percentComplete}%</div>
                                    </div>
                                    <div className={`rounded p-2 ${cell.simulation.hasIssues ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Status</div>
                                        <div className={`text-sm font-bold ${cell.simulation.hasIssues ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                            {cell.simulation.hasIssues ? 'Flagged' : 'Clear'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400">Source</div>
                                        <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{cell.simulation.sourceFile}</div>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                            {cell.simulation.sheetName} • Row {cell.simulation.rowIndex}
                                        </div>
                                    </div>
                                    {cell.simulation.studyPath && (
                                        <button
                                            onClick={handleOpenSimulation}
                                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded text-white bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            <MonitorPlay className="h-3.5 w-3.5" />
                                            Open
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">No simulation data available.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Robots & Tools Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Robots */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Robots ({robots.length})</h3>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Station assets</div>
                        </div>
                    </div>
                    <div className="p-3">
                        <DataTable
                            data={robots}
                            columns={robotColumns}
                            emptyMessage="No robots assigned to this cell."
                        />
                    </div>
                </div>

                {/* Tools */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Tools ({tools.length})</h3>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Guns, grippers, others</div>
                        </div>
                    </div>
                    <div className="p-3">
                        <DataTable
                            data={tools}
                            columns={toolColumns}
                            emptyMessage="No tools assigned to this cell."
                        />
                    </div>
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
        ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
        : tone === 'ok'
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200';

    return (
        <div className={`rounded border px-2 py-1.5 ${toneClasses}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
            <div className="text-xs font-bold truncate">{value}</div>
        </div>
    );
}

export default CellDetailPage
