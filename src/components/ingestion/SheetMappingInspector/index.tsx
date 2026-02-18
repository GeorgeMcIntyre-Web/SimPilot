import { useState } from 'react'
import { cn } from '../../../ui/lib/utils'
import { useMappingOverrides } from '../../../hooks/useMappingOverrides'
import { getFeatureFlags } from '../../../config/featureFlags'
import { SheetCard } from './SheetCard'
import { HeaderSection } from './HeaderSection'
import { EmptyState } from './EmptyState'
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

  const hasSheets = sheets.length > 0

  return (
    <div className={cn('space-y-4', className)}>
      <HeaderSection
        embeddingsEnabled={flags.useSemanticEmbeddings}
        llmAssistEnabled={flags.useLLMMappingHelper}
        overrideCount={overridesState.overrideCount}
      />

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

      {!hasSheets && <EmptyState />}
    </div>
  )
}

export type { SheetMappingData, SheetMappingInspectorProps }
