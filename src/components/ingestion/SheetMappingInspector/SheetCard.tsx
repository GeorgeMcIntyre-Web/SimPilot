import { AlertTriangle, ChevronDown, ChevronRight, Edit2, Settings, Table } from 'lucide-react'
import { SheetMappingData } from './types'
import { useMappingOverrides } from '../../../hooks/useMappingOverrides'
import { cn } from '../../../ui/lib/utils'
import { QualityBadge, QualityDetails } from './Quality'
import { ColumnMappingRow } from './ColumnMappingRow'

type SheetCardProps = {
  sheet: SheetMappingData
  isExpanded: boolean
  onToggle: () => void
  overridesState: ReturnType<typeof useMappingOverrides>
  onRerunProjection?: (workbookId: string, sheetName: string) => void
}

export function SheetCard({
  sheet,
  isExpanded,
  onToggle,
  overridesState,
  onRerunProjection,
}: SheetCardProps) {
  const { qualityScore, matches, sheetName, workbookId } = sheet

  const sheetOverrideCount = overridesState.overrides.filter(
    (o) => o.workbookId === workbookId && o.sheetName === sheetName,
  ).length

  const lowConfidenceCount = matches.filter((m) => m.confidence < 0.5).length

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
        )}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <Table className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{sheetName}</span>
        </div>

        <div className="flex items-center space-x-3">
          {qualityScore && <QualityBadge tier={qualityScore.tier} quality={qualityScore.quality} />}

          {sheetOverrideCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              <Edit2 className="w-3 h-3 mr-1" />
              {sheetOverrideCount}
            </span>
          )}

          {lowConfidenceCount > 0 && (
            <span className="inline-flex items-center text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {lowConfidenceCount} low
            </span>
          )}

          <span className="text-sm text-gray-500 dark:text-gray-400">{matches.length} columns</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Click on any mapping to change it
            </div>
            <div className="flex items-center space-x-2">
              {sheetOverrideCount > 0 && (
                <button
                  onClick={() => overridesState.clearSheetOverrides(workbookId, sheetName)}
                  className="inline-flex items-center px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <Edit2 className="w-3 h-3 mr-1 rotate-90" />
                  Reset overrides
                </button>
              )}
              {onRerunProjection && (
                <button
                  onClick={() => onRerunProjection(workbookId, sheetName)}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Re-run projection
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2 text-left font-medium">Column Header</th>
                  <th className="px-4 py-2 text-left font-medium">Mapped Field</th>
                  <th className="px-4 py-2 text-left font-medium">Confidence</th>
                  <th className="px-4 py-2 text-left font-medium">Sample Values</th>
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {matches.map((match, idx) => {
                  const hasOverride = overridesState.hasOverride(
                    workbookId,
                    sheetName,
                    match.columnIndex,
                  )
                  return (
                    <ColumnMappingRow
                      key={`${sheetName}-col-${match.columnIndex}-${idx}`}
                      match={match}
                      workbookId={workbookId}
                      sheetName={sheetName}
                      hasOverride={hasOverride}
                      sampleValues={sheet.sampleValues?.[match.columnIndex]}
                      overridesState={overridesState}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>

          {qualityScore && <QualityDetails score={qualityScore} />}
        </div>
      )}
    </div>
  )
}
