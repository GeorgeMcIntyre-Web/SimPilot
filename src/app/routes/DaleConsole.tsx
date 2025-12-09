import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    AlertTriangle,
    Users,
    Copy,
    Check,
    ArrowLeft,
    LayoutDashboard,
    Factory,
    Calendar,
    Clock
} from 'lucide-react'
import { useAllEngineerMetrics, useCells, useGlobalSimulationMetrics } from '../../ui/hooks/useDomainData'
import { useChangeLog } from '../../domain/coreStore'
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics'
import { KpiTile } from '../../ui/components/KpiTile'
import { DataTable, Column } from '../../ui/components/DataTable'
import { Cell } from '../../domain/core'

import { EmptyState } from '../../ui/components/EmptyState'
import { FlowerAccent } from '../../ui/components/FlowerAccent'
import { useTheme } from '../../ui/ThemeContext'
import { PageHint } from '../../ui/components/PageHint'
import { useDaleDayMood } from '../../ui/hooks/useDaleDayMood'
import { DaleWelcomeStrip } from '../../ui/components/DaleWelcomeStrip'
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage'
import { useDaleSummary } from '../../ui/hooks/useDaleSummary'
import { ZenFocusHeader } from '../../ui/components/ZenFocusHeader'

export function DaleConsole() {
    const metrics = useGlobalSimulationMetrics()
    const engineerMetrics = useAllEngineerMetrics()
    const cells = useCells()
    const changes = useChangeLog()
    const scheduleRisks = getAllCellScheduleRisks()
    const [copied, setCopied] = useState(false)
    const [chaosCopied, setChaosCopied] = useState(false)
    const navigate = useNavigate()
    const { themeMode } = useTheme()
    const daleSummary = useDaleSummary()
    const [zenMode, setZenMode] = useState(false)

    if (metrics.totalCells === 0) {
        return (
            <div data-testid="dale-console" className="space-y-8 pb-12 bg-[radial-gradient(circle_at_top,_#ffe4e6_0,_#ffffff_45%)] -m-6 p-6 min-h-screen">
                <div className="flex items-center space-x-4 mb-6">
                    <Link to="/dashboard" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dale Console</h1>
                        <PageHint
                            standardText="Focused daily overview"
                            flowerText="Morning cockpit – risk, load, and where to focus."
                        />
                    </div >
                </div >
                <EmptyState
                    title="No data available"
                    message="Load simulation data to see your daily overview."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            </div >
        )
    }

    // Calculate schedule metrics
    const lateCellsCount = scheduleRisks.filter(r => r.status === 'late').length
    const scheduleAtRiskCount = scheduleRisks.filter(r => r.status === 'atRisk').length

    // 2. Top At-Risk Cells (filtered by Zen Mode)
    const atRiskCells = cells.filter((c: Cell) => {
        if (!c.simulation) return false
        const isAtRisk = c.simulation.hasIssues || (c.simulation.percentComplete > 0 && c.simulation.percentComplete < 100 && c.status === 'Blocked')

        // In Zen Mode, only show cells that actually have problems
        if (zenMode && !c.simulation.hasIssues && c.status !== 'Blocked') {
            return false
        }

        return isAtRisk
    }).sort((a, b) => (a.simulation?.percentComplete || 0) - (b.simulation?.percentComplete || 0))
        .slice(0, 10)

    // 4. Quick Copy Summary
    const getSummaryText = () => {
        const topRiskEngineers = engineerMetrics
            .filter(e => e.atRiskCellsCount > 0)
            .sort((a, b) => b.atRiskCellsCount - a.atRiskCellsCount)
            .slice(0, 3)
            .map(e => e.name)
            .join(', ')

        const worstCell = atRiskCells.length > 0 ? atRiskCells[0] : null
        const worstCellText = worstCell
            ? `Worst cell: ${worstCell.name} – ${worstCell.simulation?.percentComplete}% complete.`
            : 'No critical cells.'

        return `Projects: ${metrics.totalProjects}. Cells: ${metrics.totalCells}. At risk (Sim): ${metrics.atRiskCellsCount}. Late: ${lateCellsCount}. At risk (Schedule): ${scheduleAtRiskCount}. Engineers with at-risk cells: ${topRiskEngineers || 'None'}. ${worstCellText}`
    }

    const handleCopy = async () => {
        if (!navigator.clipboard) return
        try {
            await navigator.clipboard.writeText(getSummaryText())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }

    const handleCopyChaos = async () => {
        if (!navigator.clipboard) return
        try {
            await navigator.clipboard.writeText(daleSummary.summaryText)
            setChaosCopied(true)
            setTimeout(() => setChaosCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy chaos summary', err)
        }
    }

    const atRiskColumns: Column<Cell>[] = [
        { header: 'Project', accessor: (c) => c.projectId }, // Ideally map to name, but ID is available on cell
        { header: 'Cell', accessor: (c) => <Link to={`/projects/${c.projectId}/cells/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.name}</Link> },
        { header: '% Complete', accessor: (c) => c.simulation ? `${c.simulation.percentComplete}%` : '-' },
        { header: 'Engineer', accessor: (c) => c.assignedEngineer || '-' },
        { header: 'Issues', accessor: (c) => c.simulation?.hasIssues ? <span className="text-red-600 font-bold">Yes</span> : 'No' },
    ]

    const engineerColumns: Column<typeof engineerMetrics[0]>[] = [
        { header: 'Engineer', accessor: (e) => <div className="font-medium">{e.name}</div> },
        { header: 'Cells', accessor: (e) => e.cellCount },
        { header: 'At Risk', accessor: (e) => e.atRiskCellsCount > 0 ? <span className="text-red-600 font-bold">{e.atRiskCellsCount}</span> : '0' },
        { header: 'Avg %', accessor: (e) => `${e.avgCompletion}%` },
    ]

    // Greeting Strip Logic
    const showGreeting = themeMode === 'flower' && metrics.totalCells > 0;
    const mood = useDaleDayMood();
    const [hasSeenIntro, setHasSeenIntro] = useState(() => getUserPreference('simpilot.dale.hasSeenIntro', false));

    const handleDismissIntro = () => {
        setHasSeenIntro(true);
        setUserPreference('simpilot.dale.hasSeenIntro', true);
    };

    return (
        <div data-testid="dale-console-root" className="space-y-8 pb-12 bg-[radial-gradient(circle_at_top,_#ffe4e6_0,_#ffffff_45%)] -m-6 p-6 min-h-screen">

            {/* Dale Welcome Strip (First Time) */}
            {themeMode === 'flower' && !hasSeenIntro && (
                <DaleWelcomeStrip onDismiss={handleDismissIntro} />
            )}

            {/* Dale Greeting Strip */}
            {showGreeting && (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-rose-100 dark:border-rose-900/30 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between animate-fade-in shadow-sm">
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                        <FlowerAccent className="w-5 h-5 text-rose-400 motion-safe:animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-rose-900 dark:text-rose-100">
                                {mood === 'calm'
                                    ? "Garden check: Everything looks calm and healthy today 🌿"
                                    : "Hi Dale, here’s your cockpit for today 🌸"}
                            </span>
                            {(mood === 'spiky' || mood === 'stormy') && (
                                <span className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                                    {mood === 'spiky'
                                        ? "Today’s garden has a few thorns – we’ll highlight where they are."
                                        : "Okay, this is a spiky day. Let’s tackle the worst cells first – I’ve highlighted them for you."}
                                </span>
                            )}
                        </div>
                    </div>
                    {mood === 'calm' && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full self-start sm:self-center">
                            All Clear
                        </span>
                    )}
                </div>
            )}

            <div className="flex items-center space-x-4 mb-6">
                <Link to="/dashboard" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dale Console</h1>
                    <PageHint
                        standardText="Focused daily overview"
                        flowerText="Morning cockpit – risk, load, and where to focus."
                    />
                </div>
            </div>

            {/* Zen Focus Header: Clean, Pro Landing */}
            {themeMode === 'flower' && <ZenFocusHeader />}

            {/* 1. Today's Snapshot */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        <FlowerAccent className="w-5 h-5 text-rose-400 mr-2" />
                        Today's Snapshot
                    </h2>
                    {/* Zen Mode Toggle */}
                    <button
                        onClick={() => setZenMode(!zenMode)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${zenMode
                                ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800'
                                : 'bg-gray-100 text-gray-600 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                            } hover:opacity-80`}
                    >
                        {zenMode ? '🧘 Zen Mode: ON' : '🧘 Zen Mode: OFF'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Zen Mode: Hide healthy/green KPIs */}
                    {!zenMode && (
                        <>
                            <KpiTile
                                label="Global Completion"
                                value={`${metrics.avgCompletion}%`}
                                icon={<LayoutDashboard className="h-6 w-6 text-rose-500" />}
                            />
                            <KpiTile
                                label="Total Cells"
                                value={metrics.totalCells}
                                icon={<Factory className="h-6 w-6 text-emerald-600" />}
                            />
                        </>
                    )}
                    {/* Always show: At-Risk and Problems */}
                    <KpiTile
                        label="At Risk (Sim)"
                        value={metrics.atRiskCellsCount}
                        icon={<AlertTriangle className="h-6 w-6" />}
                        description="Blocked or stalled < 100%"
                        progress={metrics.atRiskCellsCount > 0 ? Math.min(100, (metrics.atRiskCellsCount / metrics.totalCells) * 100) : 0}
                        status={metrics.atRiskCellsCount === 0 ? 'success' : metrics.atRiskCellsCount > 5 ? 'danger' : 'warning'}
                        data-testid="dale-kpi-at-risk-sim"
                    />
                    {!zenMode && (
                        <KpiTile
                            label="Engineers w/ Risk"
                            value={engineerMetrics.filter(e => e.atRiskCellsCount > 0).length}
                            icon={<Users className="h-6 w-6 text-blue-600" />}
                            description="Engineers with critical cells"
                        />
                    )}
                    <KpiTile
                        label="Late Cells"
                        value={lateCellsCount}
                        icon={<Clock className="h-6 w-6" />}
                        description="Past due date"
                        progress={lateCellsCount > 0 ? Math.min(100, (lateCellsCount / metrics.totalCells) * 100) : 0}
                        status={lateCellsCount === 0 ? 'success' : lateCellsCount > 3 ? 'danger' : 'warning'}
                        data-testid="dale-kpi-late-cells"
                    />
                    <KpiTile
                        label="At Risk (Schedule)"
                        value={scheduleAtRiskCount}
                        icon={<Calendar className="h-6 w-6" />}
                        description="Approaching deadline"
                        progress={scheduleAtRiskCount > 0 ? Math.min(100, (scheduleAtRiskCount / metrics.totalCells) * 100) : 0}
                        status={scheduleAtRiskCount === 0 ? 'success' : scheduleAtRiskCount > 3 ? 'danger' : 'warning'}
                    />
                    {changes.length > 0 && (
                        <KpiTile
                            label="Pending Changes"
                            value={changes.length}
                            icon={<Copy className="h-6 w-6 text-orange-600" />}
                        />
                    )}
                </div>
            </section>

            {/* Link to Readiness Board */}
            {(lateCellsCount > 0 || scheduleAtRiskCount > 0) && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                {lateCellsCount + scheduleAtRiskCount} cells need schedule attention
                            </span>
                        </div>
                        <Link
                            to="/readiness"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            View Readiness Board →
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. Top At-Risk Cells */}
                <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        Top At-Risk Cells
                    </h3>
                    <DataTable
                        data={atRiskCells}
                        columns={atRiskColumns}
                        emptyMessage="No cells currently at risk."
                    />
                </section>

                {/* 3. Engineers Summary */}
                <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <Users className="h-5 w-5 text-indigo-500 mr-2" />
                        Engineers Summary {zenMode && <span className="ml-2 text-xs text-gray-500">(At Risk Only)</span>}
                    </h3>
                    <DataTable
                        data={zenMode ? engineerMetrics.filter(e => e.atRiskCellsCount > 0) : engineerMetrics}
                        columns={engineerColumns}
                        emptyMessage={zenMode ? "No engineers with at-risk cells." : "No engineer data available."}
                    />
                </section>
            </div>

            {/* 4. Quick Copy Summary */}
            <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        <Copy className="h-5 w-5 text-gray-500 mr-2" />
                        Quick Copy Summary
                    </h3>
                    <div className="flex space-x-2">
                        {themeMode === 'flower' && (
                            <button
                                onClick={handleCopyChaos}
                                disabled={metrics.totalCells === 0}
                                className="inline-flex items-center px-3 py-2 border border-rose-200 shadow-sm text-sm leading-4 font-medium rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800 dark:hover:bg-rose-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {chaosCopied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <FlowerAccent className="h-4 w-4 mr-2 text-rose-500" />}
                                {chaosCopied ? 'Copied' : 'Copy Chaos Summary'}
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            disabled={metrics.totalCells === 0}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                            {copied ? 'Copied' : 'Copy Stats'}
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {metrics.totalCells > 0 ? getSummaryText() : 'No data loaded.'}
                </div>
            </section>
        </div>
    )
}
