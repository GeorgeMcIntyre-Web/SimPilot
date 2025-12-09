/**
 * DATA HEALTH PAGE
 *
 * Displays data ingestion health metrics including:
 * - Total assets in store
 * - Ingestion errors count and list
 * - Assets with UNKNOWN sourcing
 * - Reuse summary by type and status
 *
 * Part of Phase 4: Data Health Analytics
 */

import { useState, useMemo } from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { StatCard } from '../../ui/components/StatCard'
import { EmptyState } from '../../ui/components/EmptyState'
import { useCoreStore } from '../../domain/coreStore'
import { useDataHealthStore, useReuseSummary, computeDataHealthMetrics } from '../../domain/dataHealthStore'
import {
  exportDataHealthJson,
  exportErrorsCsv,
  parseErrorContext
} from '../../utils/dataHealthExport'
import {
  Activity,
  AlertTriangle,
  HelpCircle,
  Package,
  Download,
  FileText,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface GroupedError {
  source: string
  errors: Array<{
    message: string
    sheet: string | null
  }>
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface BarChartRowProps {
  label: string
  value: number
  maxValue: number
  color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500'
}

function BarChartRow({ label, value, maxValue, color }: BarChartRowProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-28 text-sm text-gray-600 dark:text-gray-400 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color]} transition-all duration-300`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
        {value}
      </span>
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function CollapsibleSection({ title, count, isExpanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
            {count}
          </span>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DataHealthPage() {
  const coreState = useCoreStore()
  const dataHealthState = useDataHealthStore()
  const reuseSummary = useReuseSummary()

  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  // Combine warnings from coreStore with errors from dataHealthStore
  const allErrors = useMemo(() => {
    const coreWarnings = coreState.warnings || []
    const healthErrors = dataHealthState.errors || []
    return [...coreWarnings, ...healthErrors]
  }, [coreState.warnings, dataHealthState.errors])

  // Compute data health metrics
  const metrics = useMemo(() => {
    return computeDataHealthMetrics(
      coreState.assets,
      dataHealthState.reuseSummary,
      dataHealthState.linkingStats,
      allErrors
    )
  }, [coreState.assets, dataHealthState.reuseSummary, dataHealthState.linkingStats, allErrors])

  // Group errors by source (workbook/file)
  const groupedErrors = useMemo((): GroupedError[] => {
    const groups: Record<string, Array<{ message: string; sheet: string | null }>> = {}

    allErrors.forEach(error => {
      const { workbookId, sheet, cleanMessage } = parseErrorContext(error)
      const source = workbookId ?? 'Unknown Source'

      if (groups[source] === undefined) {
        groups[source] = []
      }

      groups[source].push({
        message: cleanMessage,
        sheet
      })
    })

    return Object.entries(groups).map(([source, errors]) => ({
      source,
      errors
    }))
  }, [allErrors])

  // Handlers
  const toggleSource = (source: string) => {
    const next = new Set(expandedSources)

    if (next.has(source)) {
      next.delete(source)
      setExpandedSources(next)
      return
    }

    next.add(source)
    setExpandedSources(next)
  }

  const handleExportJson = () => {
    exportDataHealthJson({
      totalAssets: metrics.totalAssets,
      totalErrors: metrics.totalErrors,
      unknownSourcingCount: metrics.unknownSourcingCount,
      reuseSummary: metrics.reuseSummary,
      linkingStats: metrics.linkingStats,
      errors: allErrors
    })
  }

  const handleExportErrorsCsv = () => {
    exportErrorsCsv(allErrors)
  }

  // Status color helpers
  const getStatusColor = (status: string): 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' => {
    const statusColors: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'> = {
      AVAILABLE: 'green',
      ALLOCATED: 'blue',
      IN_USE: 'purple',
      RESERVED: 'yellow',
      UNKNOWN: 'gray'
    }
    return statusColors[status] ?? 'gray'
  }

  const getTypeColor = (type: string): 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' => {
    const typeColors: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'> = {
      Riser: 'blue',
      TipDresser: 'purple',
      TMSGun: 'yellow'
    }
    return typeColors[type] ?? 'gray'
  }

  // Compute max values for bar charts
  const maxStatusValue = Math.max(...Object.values(reuseSummary.byStatus), 1)
  const maxTypeValue = Math.max(...Object.values(reuseSummary.byType), 1)

  // Check if we have any data
  const hasData = coreState.assets.length > 0 || allErrors.length > 0 || reuseSummary.total > 0

  // Empty state
  if (hasData === false) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Data Health"
          subtitle="Monitor ingestion quality and asset statistics"
        />
        <EmptyState
          title="No Data Loaded"
          message="Load some data from the Data Loader to see health metrics."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => window.location.href = '/data-loader'}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Actions */}
      <PageHeader
        title="Data Health"
        subtitle="Monitor ingestion quality and asset statistics"
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </button>
            {allErrors.length > 0 && (
              <button
                onClick={handleExportErrorsCsv}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Errors CSV
              </button>
            )}
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assets"
          value={metrics.totalAssets}
          icon={<Package className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          title="Ingestion Errors"
          value={metrics.totalErrors}
          icon={metrics.totalErrors > 0 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
          variant={metrics.totalErrors > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="UNKNOWN Sourcing"
          value={metrics.unknownSourcingCount}
          subtitle={metrics.totalAssets > 0 ? `${((metrics.unknownSourcingCount / metrics.totalAssets) * 100).toFixed(1)}% of assets` : undefined}
          icon={<HelpCircle className="h-6 w-6" />}
          variant={metrics.unknownSourcingCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Reuse Pool"
          value={reuseSummary.total}
          subtitle={reuseSummary.unmatchedReuseCount > 0 ? `${reuseSummary.unmatchedReuseCount} unmatched` : 'All matched'}
          icon={<RefreshCw className="h-6 w-6" />}
          variant="default"
        />
      </div>

      {/* Reuse Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Reuse by Status
          </h3>
          {reuseSummary.total === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No reuse records loaded.</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(reuseSummary.byStatus).map(([status, count]) => (
                <BarChartRow
                  key={status}
                  label={status}
                  value={count}
                  maxValue={maxStatusValue}
                  color={getStatusColor(status)}
                />
              ))}
            </div>
          )}
        </div>

        {/* By Type */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-500" />
            Reuse by Type
          </h3>
          {Object.keys(reuseSummary.byType).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No reuse records loaded.</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(reuseSummary.byType).map(([type, count]) => (
                <BarChartRow
                  key={type}
                  label={type}
                  value={count}
                  maxValue={maxTypeValue}
                  color={getTypeColor(type)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linking Stats (if available) */}
      {metrics.linkingStats !== null && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-500" />
            Linking Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.linkingStats.totalAssets}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Assets</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.linkingStats.assetsWithReuseInfo}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">With Reuse Info</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.linkingStats.matchedReuseRecords}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Matched Records</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {metrics.linkingStats.unmatchedReuseRecords}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unmatched Records</p>
            </div>
          </div>
        </div>
      )}

      {/* Errors Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            {allErrors.length > 0 ? (
              <XCircle className="h-5 w-5 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            Ingestion Errors & Warnings
            <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
              {allErrors.length}
            </span>
          </h3>
        </div>

        <div className="p-6">
          {allErrors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No errors found. Data ingestion is healthy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedErrors.map(group => (
                <CollapsibleSection
                  key={group.source}
                  title={group.source}
                  count={group.errors.length}
                  isExpanded={expandedSources.has(group.source)}
                  onToggle={() => toggleSource(group.source)}
                >
                  <ul className="space-y-2">
                    {group.errors.map((error, idx) => (
                      <li
                        key={idx}
                        className="flex items-start text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="mr-2 text-rose-500 flex-shrink-0">•</span>
                        <div>
                          {error.sheet !== null && (
                            <span className="text-xs text-gray-400 mr-2">[{error.sheet}]</span>
                          )}
                          <span className="font-mono text-xs">{error.message}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
