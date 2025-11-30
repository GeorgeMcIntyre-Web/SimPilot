import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    AlertTriangle,
    Users,
    Copy,
    Check,
    ArrowLeft,
    LayoutDashboard,
    Factory
} from 'lucide-react'
import { useAllEngineerMetrics, useCells, useGlobalSimulationMetrics } from '../../ui/hooks/useDomainData'
import { useChangeLog } from '../../domain/coreStore'
import { KpiTile } from '../../ui/components/KpiTile'
import { DataTable, Column } from '../../ui/components/DataTable'
import { Cell } from '../../domain/core'

export function DaleConsole() {
    const metrics = useGlobalSimulationMetrics()
    const engineerMetrics = useAllEngineerMetrics()
    const cells = useCells()
    const changes = useChangeLog()
    const [copied, setCopied] = useState(false)

    // 2. Top At-Risk Cells
    const atRiskCells = cells.filter((c: Cell) => {
        if (!c.simulation) return false
        return c.simulation.hasIssues || (c.simulation.percentComplete > 0 && c.simulation.percentComplete < 100 && c.status === 'Blocked')
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

        return `Projects: ${metrics.totalProjects}. Cells: ${metrics.totalCells}. At risk: ${metrics.atRiskCellsCount} (${Math.round((metrics.atRiskCellsCount / metrics.totalCells) * 100) || 0}%). Engineers with at-risk cells: ${topRiskEngineers || 'None'}. ${worstCellText}`
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

    return (
        <div data-testid="dale-console" className="space-y-8 pb-12">
            <div className="flex items-center space-x-4 mb-6">
                <Link to="/dashboard" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dale Console</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Focused daily overview</p>
                </div>
            </div>

            {/* 1. Today's Snapshot */}
            <section>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Today's Snapshot</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiTile
                        label="Global Completion"
                        value={`${metrics.avgCompletion}%`}
                        icon={<LayoutDashboard className="h-6 w-6 text-purple-600" />}
                    />
                    <KpiTile
                        label="Total Cells"
                        value={metrics.totalCells}
                        icon={<Factory className="h-6 w-6 text-green-600" />}
                    />
                    <KpiTile
                        label="At Risk Cells"
                        value={metrics.atRiskCellsCount}
                        icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
                    />
                    <KpiTile
                        label="Engineers w/ Risk"
                        value={engineerMetrics.filter(e => e.atRiskCellsCount > 0).length}
                        icon={<Users className="h-6 w-6 text-blue-600" />}
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
                        <Users className="h-5 w-5 text-blue-500 mr-2" />
                        Engineers Summary
                    </h3>
                    <DataTable
                        data={engineerMetrics}
                        columns={engineerColumns}
                        emptyMessage="No engineer data available."
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
                    <button
                        onClick={handleCopy}
                        disabled={metrics.totalCells === 0}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                        {copied ? 'Copied' : 'Copy Summary'}
                    </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {metrics.totalCells > 0 ? getSummaryText() : 'No data loaded.'}
                </div>
            </section>
        </div>
    )
}
