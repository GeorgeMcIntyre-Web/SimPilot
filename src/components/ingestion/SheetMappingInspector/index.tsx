import { useState } from 'react'
import { Sparkles, Zap, Edit2, Table } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import { useMappingOverrides } from '../../../hooks/useMappingOverrides'
import { getFeatureFlags } from '../../../config/featureFlags'
import { SheetCard } from './SheetCard'
import { SheetMappingData, SheetMappingInspectorProps } from './types'

export function SheetMappingInspector({
  sheets,
  onRerunProjection,
  className,
}: SheetMappingInspectorProps) {
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(
    new Set(sheets.length > 0 ? [sheets[0].sheetName] : []),
  )

  const overridesState = useMappingOverrides()
  const flags = getFeatureFlags()

  const toggleSheet = (sheetName: string) => {
    setExpandedSheets((prev) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Column Mappings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Inspect and override how columns map to fields
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {flags.useSemanticEmbeddings && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Sparkles className="w-3 h-3 mr-1" />
              Embeddings
            </span>
          )}
          {flags.useLLMMappingHelper && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Zap className="w-3 h-3 mr-1" />
              LLM Assist
            </span>
          )}
          {overridesState.overrideCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              <Edit2 className="w-3 h-3 mr-1" />
              {overridesState.overrideCount} override{overridesState.overrideCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sheets.map((sheet) => {
          const effectiveMatches = overridesState.applyOverrides(
            sheet.workbookId,
            sheet.sheetName,
            sheet.matches,
          )
          const sheetData: SheetMappingData = { ...sheet, matches: effectiveMatches }
          return (
            <SheetCard
              key={`${sheet.workbookId}:${sheet.sheetName}`}
              sheet={sheetData}
              isExpanded={expandedSheets.has(sheet.sheetName)}
              onToggle={() => toggleSheet(sheet.sheetName)}
              overridesState={overridesState}
              onRerunProjection={onRerunProjection}
            />
          )
        })}
      </div>

      {sheets.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Table className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No sheets to display</p>
          <p className="text-sm">Load a workbook to see mapping analysis</p>
        </div>
      )}
    </div>
  )
}

export type { SheetMappingData, SheetMappingInspectorProps }
