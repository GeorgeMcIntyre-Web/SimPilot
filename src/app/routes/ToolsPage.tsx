import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { Tag } from '../../ui/components/Tag';
import { useToolsFiltered, ToolType, SpotWeldSubType, Tool } from '../../ui/hooks/useDomainData';
import { Search, Filter } from 'lucide-react';
import { EmptyState } from '../../ui/components/EmptyState';
import { PageHint } from '../../ui/components/PageHint';
import { ReuseStatusBadge } from '../../features/assets';
import type { ToolMountType } from '../../domain/core';
import type { ReuseAllocationStatus } from '../../ingestion/excelIngestionTypes';

const TOOL_TYPE_LABELS: Record<ToolType, string> = {
    SPOT_WELD: 'Spot Weld',
    SEALER: 'Sealer',
    STUD_WELD: 'Stud Weld',
    GRIPPER: 'Gripper',
    OTHER: 'Other'
};

const SPOT_WELD_SUBTYPE_LABELS: Record<SpotWeldSubType, string> = {
    PNEUMATIC: 'Pneumatic',
    SERVO: 'Servo',
    UNKNOWN: 'Unknown'
};

const MOUNT_TYPE_LABELS: Record<ToolMountType, string> = {
    ROBOT_MOUNTED: 'Robot Mounted',
    STAND_MOUNTED: 'Stand Mounted',
    HAND_TOOL: 'Hand Tool',
    UNKNOWN: 'Unknown'
};

function humanizeToolType(type: ToolType) {
    return TOOL_TYPE_LABELS[type] ?? type;
}

function humanizeSubType(subType?: SpotWeldSubType | null) {
    if (!subType) return null;
    return SPOT_WELD_SUBTYPE_LABELS[subType] ?? subType;
}

function humanizeMountType(mountType?: ToolMountType | null) {
    if (!mountType) return null;
    return MOUNT_TYPE_LABELS[mountType] ?? mountType;
}

function asReuseStatus(status?: string | null): ReuseAllocationStatus | null {
    if (!status) return null;
    const upper = status.toUpperCase() as ReuseAllocationStatus;
    const allowed: ReuseAllocationStatus[] = ['AVAILABLE', 'ALLOCATED', 'IN_USE', 'RESERVED', 'UNKNOWN'];
    return allowed.includes(upper) ? upper : null;
}

export function ToolsPage() {
    const [typeFilter, setTypeFilter] = useState<ToolType | 'ALL'>('ALL');
    const [subTypeFilter, setSubTypeFilter] = useState<SpotWeldSubType | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [mountFilter, setMountFilter] = useState<ToolMountType | 'ALL'>('ALL');
    const [reuseFilter, setReuseFilter] = useState<ReuseAllocationStatus | 'ALL'>('ALL');
    const [lineFilter, setLineFilter] = useState<string>('ALL');
    const [areaFilter, setAreaFilter] = useState<string>('ALL');
    const [stationFilter, setStationFilter] = useState<string>('ALL');
    const [sourceFilter, setSourceFilter] = useState<string>('ALL');
    const navigate = useNavigate();

    const tools = useToolsFiltered({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        subType: subTypeFilter === 'ALL' ? undefined : subTypeFilter
    });

    const availableLines = useMemo(
        () => Array.from(new Set(tools.map(t => t.lineCode).filter(Boolean))).sort(),
        [tools]
    );

    const availableAreas = useMemo(
        () => Array.from(new Set(tools.map(t => t.areaName).filter(Boolean))).sort(),
        [tools]
    );

    const availableStations = useMemo(
        () => Array.from(new Set(tools.map(t => t.stationCode).filter(Boolean))).sort(),
        [tools]
    );

    const availableSources = useMemo(
        () => Array.from(new Set(tools.map(t => t.sourceFile?.split('/').pop()).filter(Boolean))).sort(),
        [tools]
    );

    const availableMounts = useMemo(
        () => Array.from(new Set(tools.map(t => t.mountType).filter(Boolean))) as ToolMountType[],
        [tools]
    );

    const availableReuseStatuses = useMemo(() => {
        const statuses = tools
            .map(t => asReuseStatus(t.reuseStatus))
            .filter((s): s is ReuseAllocationStatus => Boolean(s));
        return Array.from(new Set(statuses)).sort();
    }, [tools]);

    const filteredTools = useMemo(() => {
        let result = tools;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(term) ||
                (t.stationCode && t.stationCode.toLowerCase().includes(term)) ||
                (t.oemModel && t.oemModel.toLowerCase().includes(term))
            );
        }
        if (mountFilter !== 'ALL') {
            result = result.filter(t => t.mountType === mountFilter);
        }
        if (reuseFilter !== 'ALL') {
            result = result.filter(t => asReuseStatus(t.reuseStatus) === reuseFilter);
        }
        if (lineFilter !== 'ALL') {
            result = result.filter(t => t.lineCode === lineFilter);
        }
        if (areaFilter !== 'ALL') {
            result = result.filter(t => t.areaName === areaFilter);
        }
        if (stationFilter !== 'ALL') {
            result = result.filter(t => t.stationCode === stationFilter);
        }
        if (sourceFilter !== 'ALL') {
            result = result.filter(t => t.sourceFile?.split('/').pop() === sourceFilter);
        }
        return result;
    }, [tools, searchTerm, mountFilter, reuseFilter, lineFilter, areaFilter, stationFilter, sourceFilter]);

    // Keep subtype filter in sync with tool type to avoid invalid filtering
    useEffect(() => {
        if (typeFilter !== 'SPOT_WELD' && subTypeFilter !== 'ALL') {
            setSubTypeFilter('ALL');
        }
    }, [typeFilter, subTypeFilter]);

    const columns: Column<Tool>[] = [
        {
            header: 'Tool',
            accessor: (t) => (
                <div className="flex flex-col leading-tight">
                    <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {t.toolId || t.toolNo || '—'}
                    </span>
                </div>
            ),
            sortValue: (t) => t.name
        },
        {
            header: 'Type',
            accessor: (t) => <Tag label={humanizeToolType(t.toolType)} color="blue" />,
            sortValue: (t) => humanizeToolType(t.toolType)
        },
        {
            header: 'Subtype',
            accessor: (t) => t.subType ? <Tag label={humanizeSubType(t.subType) ?? t.subType} color="gray" /> : '-',
            sortValue: (t) => t.subType || ''
        },
        {
            header: 'Mount',
            accessor: (t) => {
                const label = humanizeMountType(t.mountType);
                return label ? <Tag label={label} color="purple" /> : '—';
            },
            sortValue: (t) => humanizeMountType(t.mountType) || ''
        },
        { header: 'Line', accessor: (t) => t.lineCode || '—', sortValue: (t) => t.lineCode || '' },
        {
            header: 'Station',
            accessor: (t) => t.stationCode || '—',
            sortValue: (t) => t.stationCode || ''
        },
        { header: 'Model', accessor: (t) => t.oemModel || '—', sortValue: (t) => t.oemModel || '' },
        {
            header: 'Robot',
            accessor: (t) => t.robotId || '—',
            sortValue: (t) => t.robotId || ''
        },
        {
            header: 'Reuse',
            accessor: (t) => {
                const reuse = asReuseStatus(t.reuseStatus);
                if (reuse) return <ReuseStatusBadge status={reuse} size="sm" showIcon={false} />;
                return t.reuseStatus || '—';
            },
            sortValue: (t) => t.reuseStatus || ''
        },
        {
            header: 'Source',
            accessor: (t) => t.sourceFile ? <span className="text-xs text-gray-500" title={t.sourceFile}>{t.sourceFile.split('/').pop()}</span> : '—',
            sortValue: (t) => t.sourceFile || ''
        },
    ];

    const showInitialEmpty =
        tools.length === 0 &&
        typeFilter === 'ALL' &&
        subTypeFilter === 'ALL' &&
        !searchTerm &&
        mountFilter === 'ALL' &&
        reuseFilter === 'ALL' &&
        lineFilter === 'ALL' &&
        areaFilter === 'ALL' &&
        stationFilter === 'ALL' &&
        sourceFilter === 'ALL';

    if (showInitialEmpty) {
        return (
            <div className="space-y-4">
                <PageHeader
                    title="Tools & Equipment"
                    subtitle={
                        <PageHint
                            standardText="Manage all tools across projects"
                            flowerText="Where every gripper, gun, and gadget finds its purpose."
                        />
                    }
                />
                <EmptyState
                    title="No Tools Found"
                    message="Please go to the Data Loader to import your equipment lists."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            </div>
        );
    }

    const hasActiveFilters =
        typeFilter !== 'ALL' ||
        subTypeFilter !== 'ALL' ||
        searchTerm.trim() !== '' ||
        mountFilter !== 'ALL' ||
        reuseFilter !== 'ALL' ||
        lineFilter !== 'ALL' ||
        areaFilter !== 'ALL' ||
        stationFilter !== 'ALL' ||
        sourceFilter !== 'ALL';

    const appliedFilterChips = [
        typeFilter !== 'ALL' ? { label: `Type: ${humanizeToolType(typeFilter as ToolType)}`, onClear: () => setTypeFilter('ALL') } : null,
        subTypeFilter !== 'ALL' ? { label: `Subtype: ${humanizeSubType(subTypeFilter as SpotWeldSubType)}`, onClear: () => setSubTypeFilter('ALL') } : null,
        mountFilter !== 'ALL' ? { label: `Mount: ${humanizeMountType(mountFilter)}`, onClear: () => setMountFilter('ALL') } : null,
        reuseFilter !== 'ALL' ? { label: `Reuse: ${reuseFilter}`, onClear: () => setReuseFilter('ALL') } : null,
        lineFilter !== 'ALL' ? { label: `Line: ${lineFilter}`, onClear: () => setLineFilter('ALL') } : null,
        areaFilter !== 'ALL' ? { label: `Area: ${areaFilter}`, onClear: () => setAreaFilter('ALL') } : null,
        stationFilter !== 'ALL' ? { label: `Station: ${stationFilter}`, onClear: () => setStationFilter('ALL') } : null,
        sourceFilter !== 'ALL' ? { label: `Source: ${sourceFilter}`, onClear: () => setSourceFilter('ALL') } : null,
        searchTerm.trim() !== '' ? { label: `Search: “${searchTerm}”`, onClear: () => setSearchTerm('') } : null,
    ].filter(Boolean) as { label: string; onClear: () => void }[];

    const clearAllFilters = () => {
        setSearchTerm('');
        setTypeFilter('ALL');
        setSubTypeFilter('ALL');
        setMountFilter('ALL');
        setReuseFilter('ALL');
        setLineFilter('ALL');
        setAreaFilter('ALL');
        setStationFilter('ALL');
        setSourceFilter('ALL');
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <PageHeader
                title="Tools & Equipment"
                subtitle={
                    <PageHint
                        standardText="Manage all tools across projects"
                        flowerText="Where every gripper, gun, and gadget finds its purpose."
                    />
                }
            />

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    className="block w-full pl-8 pr-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Search by name, station, or model..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Tool Type */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as ToolType | 'ALL')}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Types</option>
                            <option value="SPOT_WELD">Spot Weld</option>
                            <option value="SEALER">Sealer</option>
                            <option value="STUD_WELD">Stud Weld</option>
                            <option value="GRIPPER">Gripper</option>
                            <option value="OTHER">Other</option>
                        </select>

                        {/* Subtype (only for SPOT_WELD) */}
                        {typeFilter === 'SPOT_WELD' && (
                            <select
                                value={subTypeFilter}
                                onChange={(e) => setSubTypeFilter(e.target.value as SpotWeldSubType | 'ALL')}
                                className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ALL">All Subtypes</option>
                                <option value="PNEUMATIC">Pneumatic</option>
                                <option value="SERVO">Servo</option>
                                <option value="UNKNOWN">Unknown</option>
                            </select>
                        )}

                        {/* Mount Type */}
                        <select
                            value={mountFilter}
                            onChange={(e) => setMountFilter(e.target.value as ToolMountType | 'ALL')}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Mounts</option>
                            {availableMounts.map(mt => (
                                <option key={mt} value={mt}>{humanizeMountType(mt)}</option>
                            ))}
                        </select>

                        {/* Reuse */}
                        <select
                            value={reuseFilter}
                            onChange={(e) => setReuseFilter(e.target.value as ReuseAllocationStatus | 'ALL')}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Reuse</option>
                            {availableReuseStatuses.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>

                        {/* Area */}
                        <select
                            value={areaFilter}
                            onChange={(e) => setAreaFilter(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Areas</option>
                            {availableAreas.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>

                        {/* Line */}
                        <select
                            value={lineFilter}
                            onChange={(e) => setLineFilter(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Lines</option>
                            {availableLines.map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>

                        {/* Station */}
                        <select
                            value={stationFilter}
                            onChange={(e) => setStationFilter(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Stations</option>
                            {availableStations.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        {/* Source */}
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Sources</option>
                            {availableSources.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        <div className="flex-1 min-w-[60px]" />

                        {/* Count & Clear */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {filteredTools.length} of {tools.length} tools
                            </span>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearAllFilters}
                                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline whitespace-nowrap"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {appliedFilterChips.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {appliedFilterChips.map((chip, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800 px-3 py-1 text-[11px] font-medium"
                                >
                                    {chip.label}
                                    <button
                                        onClick={chip.onClear}
                                        className="text-blue-500 dark:text-blue-300 hover:text-blue-700"
                                        aria-label={`Clear ${chip.label}`}
                                    >
                                        x
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tools Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow rounded-lg overflow-hidden flex flex-col flex-1 min-h-0">
                {filteredTools.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <EmptyState
                            title="No tools match these filters"
                            message="Try clearing filters or import additional tools via the Data Loader."
                            ctaLabel={hasActiveFilters ? "Clear filters" : undefined}
                            onCtaClick={hasActiveFilters ? clearAllFilters : undefined}
                        />
                    </div>
                ) : (
                    <DataTable
                        data={filteredTools}
                        columns={columns}
                        enableSorting
                        defaultSortIndex={0}
                        emptyMessage="No tools found."
                        keyExtractor={(t) => t.id ?? t.canonicalKey ?? `${t.toolType}-${t.name}-${t.stationCode ?? ''}-${t.oemModel ?? ''}`}
                        onRowDoubleClick={(t) => {
                            if (t.id) {
                                navigate(`/assets/${encodeURIComponent(t.id)}`);
                                return;
                            }
                            if (t.stationId) {
                                navigate(`/cells/${encodeURIComponent(t.stationId)}`);
                                return;
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default ToolsPage
