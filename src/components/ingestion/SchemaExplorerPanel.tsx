// Schema Explorer Panel
// Shows how each sheet was interpreted with column roles and sample data
// Helps Dale understand and debug ingestion decisions

import { useState } from 'react'
import {
  Table,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  Columns,
  Rows
} from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import {
  SheetExploration,
  WorkbookExploration,
  columnsToDisplay,
  rowToDisplay,
  ColumnDisplay,
  groupColumnsByCategory
} from '../../ingestion/schemaExplorer'
import { getCategoryLabel, getCategoryColorClass } from '../../ingestion/ingestionTelemetry'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SchemaExplorerPanelProps {
  exploration: WorkbookExploration
  className?: string
}

export function SchemaExplorerPanel({ exploration, className }: SchemaExplorerPanelProps) {
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(
    new Set(exploration.recommendedSheet ? [exploration.recommendedSheet.sheetName] : [])
  )

  const toggleSheet = (sheetName: string) => {
    setExpandedSheets(prev => {
      const next = new Set(prev)
      if (next.has(sheetName)) {
        next.delete(sheetName)
      } else {
        next.add(sheetName)
      }
      return next
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Header */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-500" />
              {exploration.fileName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {exploration.sheetCount} sheet{exploration.sheetCount !== 1 ? 's' : ''} • 
              {exploration.summary.coveragePercentage}% columns recognized
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {exploration.summary.detectedCategories.map(cat => (
              <span
                key={cat}
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getCategoryColorClass(cat)
                )}
              >
                {getCategoryLabel(cat)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sheet List */}
      <div className="space-y-2">
        {exploration.sheets.map(sheet => (
          <SheetCard
            key={sheet.sheetName}
            sheet={sheet}
            isExpanded={expandedSheets.has(sheet.sheetName)}
            onToggle={() => toggleSheet(sheet.sheetName)}
          />
        ))}

        {/* Skipped Sheets */}
        {exploration.summary.skippedSheets.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">Skipped sheets:</span>{' '}
              {exploration.summary.skippedSheets.join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SHEET CARD
// ============================================================================

interface SheetCardProps {
  sheet: SheetExploration
  isExpanded: boolean
  onToggle: () => void
}

function SheetCard({ sheet, isExpanded, onToggle }: SheetCardProps) {
  const columns = columnsToDisplay(sheet.schema)
  const hasUnknowns = sheet.schema.unknownColumns.length > 0

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
          sheet.isRecommended && 'bg-blue-50/50 dark:bg-blue-900/20'
        )}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <Table className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {sheet.sheetName}
          </span>
          {sheet.isRecommended && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Recommended
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Category Badge */}
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              getCategoryColorClass(sheet.category)
            )}
          >
            {getCategoryLabel(sheet.category)}
          </span>

          {/* Score */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Score: {sheet.score}
          </span>

          {/* Status Icon */}
          {hasUnknowns ? (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          ) : sheet.category === 'UNKNOWN' ? (
            <HelpCircle className="w-4 h-4 text-gray-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Matched Keywords */}
          {sheet.matchedKeywords.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Matched Keywords
              </h4>
              <div className="flex flex-wrap gap-1">
                {sheet.matchedKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Column Roles */}
          <ColumnRolesSection columns={columns} />

          {/* Sample Data */}
          <SampleDataSection sheet={sheet} columns={columns} />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COLUMN ROLES SECTION
// ============================================================================

interface ColumnRolesSectionProps {
  columns: ColumnDisplay[]
}

function ColumnRolesSection({ columns }: ColumnRolesSectionProps) {
  const grouped = groupColumnsByCategory(columns)

  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center">
        <Columns className="w-3 h-3 mr-1" />
        Column Roles ({columns.filter(c => c.header !== '').length} columns)
      </h4>

      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([category, cols]) => (
          <div key={category}>
            <h5 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              {category}
            </h5>
            <div className="flex flex-wrap gap-1">
              {cols.map((col, i) => (
                <ColumnRoleBadge key={i} column={col} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ColumnRoleBadgeProps {
  column: ColumnDisplay
}

function ColumnRoleBadge({ column }: ColumnRoleBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-xs',
        column.colorClass
      )}
      title={`${column.explanation} (${column.confidence} confidence)`}
    >
      <span className="font-medium">{column.header}</span>
      <span className="mx-1 opacity-50">→</span>
      <span>{column.roleDisplayName}</span>
      <span className={cn('ml-1', column.confidenceColorClass)}>
        {column.confidence === 'HIGH' ? '●' : column.confidence === 'MEDIUM' ? '◐' : '○'}
      </span>
    </div>
  )
}

// ============================================================================
// SAMPLE DATA SECTION
// ============================================================================

interface SampleDataSectionProps {
  sheet: SheetExploration
  columns: ColumnDisplay[]
}

function SampleDataSection({ sheet, columns }: SampleDataSectionProps) {
  if (sheet.sampleRows.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        No sample data available
      </div>
    )
  }

  const displayRows = sheet.sampleRows.map(row => rowToDisplay(row, sheet.schema))

  // Only show first 10 columns to avoid overflow
  const visibleColumns = columns.slice(0, 10)
  const hiddenCount = columns.length - visibleColumns.length

  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center">
        <Rows className="w-3 h-3 mr-1" />
        Sample Data ({sheet.rowCount} total rows)
      </h4>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-2 py-1 text-left font-medium text-gray-500 dark:text-gray-400">
                Row
              </th>
              {visibleColumns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-2 py-1 text-left font-medium',
                    col.isUnknown
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                  title={col.roleDisplayName}
                >
                  {col.header.substring(0, 15)}
                  {col.header.length > 15 ? '…' : ''}
                </th>
              ))}
              {hiddenCount > 0 && (
                <th className="px-2 py-1 text-left font-medium text-gray-400">
                  +{hiddenCount} more
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-2 py-1 text-gray-400">
                  {row.rowIndex + 1}
                </td>
                {visibleColumns.map((_, colIdx) => {
                  const cell = row.cells[colIdx]
                  return (
                    <td
                      key={colIdx}
                      className={cn(
                        'px-2 py-1 max-w-[120px] truncate',
                        cell?.isIdentity && 'font-medium text-blue-600 dark:text-blue-400',
                        cell?.isLocation && 'text-green-600 dark:text-green-400',
                        cell?.isStatus && 'text-orange-600 dark:text-orange-400'
                      )}
                      title={cell?.value ?? ''}
                    >
                      {cell?.value ?? ''}
                    </td>
                  )
                })}
                {hiddenCount > 0 && <td />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row Summaries */}
      <div className="mt-3 space-y-1">
        <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Row Interpretations:
        </h5>
        {displayRows.map((row, i) => (
          <div
            key={i}
            className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded"
          >
            <span className="text-gray-400">Row {row.rowIndex + 1}:</span>{' '}
            {row.summary}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// COMPACT SUMMARY COMPONENT
// ============================================================================

interface SchemaExplorerSummaryProps {
  exploration: WorkbookExploration
  onClick?: () => void
}

export function SchemaExplorerSummary({ exploration, onClick }: SchemaExplorerSummaryProps) {
  const recommended = exploration.recommendedSheet

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {exploration.fileName}
          </span>
        </div>

        {recommended && (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              getCategoryColorClass(recommended.category)
            )}
          >
            {getCategoryLabel(recommended.category)}
          </span>
        )}
      </div>

      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {exploration.sheetCount} sheets • 
        {exploration.summary.knownColumns}/{exploration.summary.totalColumns} columns recognized
        {recommended && ` • Using "${recommended.sheetName}"`}
      </div>
    </button>
  )
}
