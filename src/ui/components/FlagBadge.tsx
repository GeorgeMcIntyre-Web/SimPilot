// FlagBadge Component
// Displays cross-reference flags with severity indicators

import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import { CrossRefFlag, CrossRefFlagType } from '../../domain/crossRef/CrossRefTypes'
import { DataTable, Column } from './DataTable'

// ============================================================================
// FLAG TYPE LABELS
// ============================================================================

const FLAG_TYPE_LABELS: Record<CrossRefFlagType, string> = {
  MISSING_GUN_FORCE_FOR_WELD_GUN: 'Missing Gun Force',
  ROBOT_MISSING_DRESS_PACK_INFO: 'Missing Dress Pack Info',
  STATION_WITHOUT_SIMULATION_STATUS: 'No Simulation Status',
  TOOL_WITHOUT_OWNER: 'Unassigned Tool',
  RISER_NOT_ALLOCATED_TO_NEW_STATION: 'Riser Not Allocated',
  AMBIGUOUS_GUN_MATCH: 'Ambiguous Gun Match',
  AMBIGUOUS_ROBOT_MATCH: 'Ambiguous Robot Match',
  DUPLICATE_STATION_DEFINITION: 'Duplicate Station'
}

// ============================================================================
// SEVERITY STYLES
// ============================================================================

const severityStyles = {
  ERROR: {
    container: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800',
    icon: 'text-rose-500',
    text: 'text-rose-800 dark:text-rose-200',
    subtext: 'text-rose-600 dark:text-rose-300'
  },
  WARNING: {
    container: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    icon: 'text-amber-500',
    text: 'text-amber-800 dark:text-amber-200',
    subtext: 'text-amber-600 dark:text-amber-300'
  },
  INFO: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: 'text-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
    subtext: 'text-blue-600 dark:text-blue-300'
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface FlagBadgeProps {
  flag: CrossRefFlag
  compact?: boolean
  className?: string
}

interface FlagBadgeCompactProps {
  severity: 'ERROR' | 'WARNING'
  count: number
  className?: string
}

// ============================================================================
// COMPONENTS
// ============================================================================

const SeverityIcon = ({ severity }: { severity: 'ERROR' | 'WARNING' }) => {
  if (severity === 'ERROR') {
    return <AlertCircle className="h-4 w-4" />
  }
  return <AlertTriangle className="h-4 w-4" />
}

/**
 * FlagBadge - Full flag display with message
 */
export function FlagBadge({ flag, compact = false, className }: FlagBadgeProps) {
  const style = severityStyles[flag.severity]
  const label = FLAG_TYPE_LABELS[flag.type] ?? flag.type

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
          style.container,
          style.text,
          className
        )}
      >
        <SeverityIcon severity={flag.severity} />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        style.container,
        className
      )}
    >
      <div className={cn('flex-shrink-0 mt-0.5', style.icon)}>
        <SeverityIcon severity={flag.severity} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', style.text)}>
          {label}
        </p>
        <p className={cn('text-xs mt-0.5', style.subtext)}>
          {flag.message}
        </p>
        {flag.stationKey && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Station: {flag.stationKey}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * FlagBadgeCompact - Shows count of flags with severity
 */
export function FlagBadgeCompact({ severity, count, className }: FlagBadgeCompactProps) {
  const style = severityStyles[severity]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        style.container,
        style.text,
        className
      )}
    >
      <SeverityIcon severity={severity} />
      <span>{count}</span>
    </span>
  )
}

/**
 * FlagsList - Grouped list of flags by severity
 */
interface FlagsListProps {
  flags: CrossRefFlag[]
  compact?: boolean
  className?: string
}

export function FlagsList({ flags, compact = false, className }: FlagsListProps) {
  if (flags.length === 0) {
    return (
      <div className={cn('text-center py-4 text-gray-500 dark:text-gray-400 text-sm', className)}>
        <Info className="h-5 w-5 mx-auto mb-1 opacity-50" />
        No flags for this station
      </div>
    )
  }

  // Group flags by severity
  const errorFlags = flags.filter(f => f.severity === 'ERROR')
  const warningFlags = flags.filter(f => f.severity === 'WARNING')

  return (
    <div className={cn(className)}>
      <FlagsTable flags={[...errorFlags, ...warningFlags]} />
    </div>
  )
}

interface FlagsTableRow {
  type: string
  severity: string
  message: string
  stationKey?: string
  status: 'Yes' | 'No' | 'Pending'
}

interface FlagsTableProps {
  flags: CrossRefFlag[]
}

const severityChip = (severity: 'ERROR' | 'WARNING') => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold'
  if (severity === 'ERROR') return <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200`}>Error</span>
  return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200`}>Warning</span>
}

function FlagsTable({ flags }: FlagsTableProps) {
  const initialRows: FlagsTableRow[] = flags.map(flag => ({
    type: FLAG_TYPE_LABELS[flag.type] ?? flag.type,
    severity: flag.severity,
    message: flag.message,
    stationKey: flag.stationKey,
    status: (flag as any).resolved === true
      ? 'Yes'
      : (flag as any).resolved === 'Pending'
        ? 'Pending'
        : 'No'
  }))

  const [rows, setRows] = useState<FlagsTableRow[]>(initialRows)

  const columns: Column<FlagsTableRow>[] = [
    { header: 'Severity', accessor: (r) => severityChip(r.severity as 'ERROR' | 'WARNING') },
    { header: 'Issue', accessor: (r) => r.type },
    { header: 'Message', accessor: (r) => <span className="text-gray-600 dark:text-gray-300">{r.message}</span> },
    { header: 'Station', accessor: (r) => r.stationKey || '-' },
    {
      header: 'Resolved',
      accessor: (r, idx) => (
        <select
          value={r.status}
          onChange={(e) => {
            const next = e.target.value as FlagsTableRow['status']
            setRows(prev => prev.map((row, i) => i === idx ? { ...row, status: next } : row))
          }}
          className="text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="Pending">Pending</option>
        </select>
      )
    }
  ]

  return (
    <DataTable
      data={rows}
      columns={columns}
      emptyMessage="No flags for this station."
      density="compact"
      maxHeight="16rem"
    />
  )
}
