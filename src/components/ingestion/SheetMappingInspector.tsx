// Sheet Mapping Inspector
// UI for inspecting and overriding column→field mappings
// Enables Dale to see and correct ingestion decisions

import { useState, useMemo } from 'react'
import {
  Table,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Edit2,
  RotateCcw,
  Sparkles,
  Zap,
  Settings
} from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import {
  FieldMatchResult,
  FieldDescriptor,
  DEFAULT_FIELD_REGISTRY,
  FieldId
} from '../../ingestion/fieldMatcher'
import {
  SheetQualityScore,
  getTierColorClass,
  QualityTier
} from '../../ingestion/dataQualityScoring'
import { useMappingOverrides } from '../../hooks/useMappingOverrides'
import { getFeatureFlags } from '../../config/featureFlags'

// ============================================================================
// TYPES
// ============================================================================

interface SheetMappingData {
  workbookId: string
  sheetName: string
  matches: FieldMatchResult[]
  qualityScore?: SheetQualityScore
  sampleValues?: Record<number, string[]>  // columnIndex → sample values
}

interface SheetMappingInspectorProps {
  sheets: SheetMappingData[]
  onRerunProjection?: (workbookId: string, sheetName: string) => void
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SheetMappingInspector({
  sheets,
  onRerunProjection,
  className
}: SheetMappingInspectorProps) {
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(
    new Set(sheets.length > 0 ? [sheets[0].sheetName] : [])
  )
  
  const overridesState = useMappingOverrides()
  const flags = getFeatureFlags()
  
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
      {/* Header */}
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
      
      {/* Sheet List */}
      <div className="space-y-3">
        {sheets.map(sheet => {
          // Apply overrides to get effective matches
          const effectiveMatches = overridesState.applyOverrides(
            sheet.workbookId,
            sheet.sheetName,
            sheet.matches
          )
          
          return (
            <SheetCard
              key={`${sheet.workbookId}:${sheet.sheetName}`}
              sheet={{ ...sheet, matches: effectiveMatches }}
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

// ============================================================================
// SHEET CARD
// ============================================================================

interface SheetCardProps {
  sheet: SheetMappingData
  isExpanded: boolean
  onToggle: () => void
  overridesState: ReturnType<typeof useMappingOverrides>
  onRerunProjection?: (workbookId: string, sheetName: string) => void
}

function SheetCard({
  sheet,
  isExpanded,
  onToggle,
  overridesState,
  onRerunProjection
}: SheetCardProps) {
  const { qualityScore, matches, sheetName, workbookId } = sheet
  
  // Count overrides for this sheet
  const sheetOverrideCount = overridesState.overrides.filter(
    o => o.workbookId === workbookId && o.sheetName === sheetName
  ).length
  
  // Count low confidence matches
  const lowConfidenceCount = matches.filter(m => m.confidence < 0.5).length
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
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
            {sheetName}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Quality Badge */}
          {qualityScore && (
            <QualityBadge tier={qualityScore.tier} quality={qualityScore.quality} />
          )}
          
          {/* Override indicator */}
          {sheetOverrideCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              <Edit2 className="w-3 h-3 mr-1" />
              {sheetOverrideCount}
            </span>
          )}
          
          {/* Low confidence warning */}
          {lowConfidenceCount > 0 && (
            <span className="inline-flex items-center text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {lowConfidenceCount} low
            </span>
          )}
          
          {/* Column count */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {matches.length} columns
          </span>
        </div>
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Actions bar */}
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
                  <RotateCcw className="w-3 h-3 mr-1" />
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
          
          {/* Column mappings table */}
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
                    match.columnIndex
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
          
          {/* Quality details */}
          {qualityScore && (
            <QualityDetails score={qualityScore} />
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COLUMN MAPPING ROW
// ============================================================================

interface ColumnMappingRowProps {
  match: FieldMatchResult
  workbookId: string
  sheetName: string
  hasOverride: boolean
  sampleValues?: string[]
  overridesState: ReturnType<typeof useMappingOverrides>
}

function ColumnMappingRow({
  match,
  workbookId,
  sheetName,
  hasOverride,
  sampleValues,
  overridesState
}: ColumnMappingRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  
  const confidenceClass = getConfidenceClass(match.confidence)
  const confidenceIcon = getConfidenceIcon(match.confidence)
  
  return (
    <tr className={cn(
      'hover:bg-gray-50 dark:hover:bg-gray-800/50',
      hasOverride && 'bg-orange-50/50 dark:bg-orange-900/10'
    )}>
      {/* Header */}
      <td className="px-4 py-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {match.header}
          </span>
          {hasOverride && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              edited
            </span>
          )}
        </div>
      </td>
      
      {/* Mapped Field */}
      <td className="px-4 py-2">
        {isEditing ? (
          <FieldSelector
            currentFieldId={match.matchedField?.id ?? null}
            onSelect={(fieldId) => {
              if (fieldId === null) {
                overridesState.removeOverride(workbookId, sheetName, match.columnIndex)
              } else {
                overridesState.setOverride({
                  workbookId,
                  sheetName,
                  columnIndex: match.columnIndex,
                  originalHeader: match.header,
                  fieldId
                })
              }
              setIsEditing(false)
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={cn(
              'inline-flex items-center px-2 py-1 rounded text-sm',
              'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
              match.matchedField
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-yellow-600 dark:text-yellow-400 italic'
            )}
          >
            {match.matchedField?.name ?? 'Unknown'}
            <Edit2 className="w-3 h-3 ml-2 opacity-50" />
          </button>
        )}
        
        {/* Show embedding/LLM indicator */}
        {match.usedEmbedding && (
          <span className="ml-2 inline-flex items-center text-xs text-purple-600 dark:text-purple-400" title="Embedding-assisted match">
            <Sparkles className="w-3 h-3" />
          </span>
        )}
      </td>
      
      {/* Confidence */}
      <td className="px-4 py-2">
        <div className="flex items-center space-x-2">
          {confidenceIcon}
          <div className="flex flex-col">
            <span className={cn('text-sm font-medium', confidenceClass)}>
              {(match.confidence * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {match.confidenceLevel}
            </span>
          </div>
          
          {/* Embedding score if available */}
          {match.embeddingScore !== undefined && (
            <span className="text-xs text-purple-600 dark:text-purple-400" title="Embedding similarity">
              ({(match.embeddingScore * 100).toFixed(0)}% sem)
            </span>
          )}
        </div>
      </td>
      
      {/* Sample Values */}
      <td className="px-4 py-2">
        {sampleValues && sampleValues.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {sampleValues.slice(0, 3).map((val, i) => (
              <span
                key={i}
                className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 max-w-[100px] truncate"
                title={val}
              >
                {val}
              </span>
            ))}
            {sampleValues.length > 3 && (
              <span className="text-xs text-gray-400">+{sampleValues.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">No samples</span>
        )}
      </td>
      
      {/* Actions */}
      <td className="px-4 py-2">
        <div className="flex items-center space-x-1">
          {hasOverride && (
            <button
              onClick={() => overridesState.removeOverride(workbookId, sheetName, match.columnIndex)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Reset to original"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="Change mapping"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ============================================================================
// FIELD SELECTOR
// ============================================================================

interface FieldSelectorProps {
  currentFieldId: FieldId | null
  onSelect: (fieldId: FieldId | null) => void
  onCancel: () => void
}

function FieldSelector({ currentFieldId, onSelect, onCancel }: FieldSelectorProps) {
  const [search, setSearch] = useState('')
  
  // Group fields by category
  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldDescriptor[]> = {}
    
    for (const field of DEFAULT_FIELD_REGISTRY) {
      const category = getFieldCategory(field.role)
      if (groups[category] === undefined) {
        groups[category] = []
      }
      groups[category].push(field)
    }
    
    return groups
  }, [])
  
  // Filter by search
  const filteredGroups = useMemo(() => {
    if (search.trim() === '') {
      return groupedFields
    }
    
    const searchLower = search.toLowerCase()
    const filtered: Record<string, FieldDescriptor[]> = {}
    
    for (const [category, fields] of Object.entries(groupedFields)) {
      const matchingFields = fields.filter(f =>
        f.name.toLowerCase().includes(searchLower) ||
        f.semanticDescription.toLowerCase().includes(searchLower)
      )
      if (matchingFields.length > 0) {
        filtered[category] = matchingFields
      }
    }
    
    return filtered
  }, [groupedFields, search])
  
  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search fields..."
        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
        autoFocus
      />
      
      <div className="absolute z-10 mt-1 w-64 max-h-64 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {/* Unknown option */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
            currentFieldId === null && 'bg-gray-100 dark:bg-gray-700'
          )}
        >
          <span className="text-yellow-600 dark:text-yellow-400 italic">Unknown</span>
        </button>
        
        <div className="border-t border-gray-200 dark:border-gray-700" />
        
        {/* Grouped fields */}
        {Object.entries(filteredGroups).map(([category, fields]) => (
          <div key={category}>
            <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
              {category}
            </div>
            {fields.map(field => (
              <button
                key={field.id}
                onClick={() => onSelect(field.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                  currentFieldId === field.id && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {field.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {field.semanticDescription}
                </div>
              </button>
            ))}
          </div>
        ))}
        
        {Object.keys(filteredGroups).length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            No matching fields
          </div>
        )}
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
          <button
            onClick={onCancel}
            className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// QUALITY COMPONENTS
// ============================================================================

interface QualityBadgeProps {
  tier: QualityTier
  quality: number
}

function QualityBadge({ tier, quality }: QualityBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      getTierColorClass(tier)
    )}>
      {tier} ({(quality * 100).toFixed(0)}%)
    </span>
  )
}

interface QualityDetailsProps {
  score: SheetQualityScore
}

function QualityDetails({ score }: QualityDetailsProps) {
  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-700">
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Quality Metrics
      </h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricItem
          label="Avg Confidence"
          value={`${(score.metrics.averageConfidence * 100).toFixed(0)}%`}
          isGood={score.metrics.averageConfidence >= 0.7}
        />
        <MetricItem
          label="High Confidence"
          value={`${(score.metrics.highConfidenceRatio * 100).toFixed(0)}%`}
          isGood={score.metrics.highConfidenceRatio >= 0.7}
        />
        <MetricItem
          label="Unknown Columns"
          value={`${(score.metrics.unknownColumnRatio * 100).toFixed(0)}%`}
          isGood={score.metrics.unknownColumnRatio <= 0.2}
        />
        <MetricItem
          label="Empty Cells"
          value={`${(score.metrics.emptyRatio * 100).toFixed(0)}%`}
          isGood={score.metrics.emptyRatio <= 0.1}
        />
      </div>
      
      {score.reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {score.reasons.map((reason, i) => (
            <div key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start">
              <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
              {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface MetricItemProps {
  label: string
  value: string
  isGood: boolean
}

function MetricItem({ label, value, isGood }: MetricItemProps) {
  return (
    <div className="text-center">
      <div className={cn(
        'text-lg font-semibold',
        isGood
          ? 'text-green-600 dark:text-green-400'
          : 'text-yellow-600 dark:text-yellow-400'
      )}>
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.7) {
    return 'text-green-600 dark:text-green-400'
  }
  if (confidence >= 0.4) {
    return 'text-yellow-600 dark:text-yellow-400'
  }
  return 'text-red-600 dark:text-red-400'
}

function getConfidenceIcon(confidence: number) {
  if (confidence >= 0.7) {
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }
  if (confidence >= 0.4) {
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />
  }
  return <XCircle className="w-4 h-4 text-red-500" />
}

function getFieldCategory(role: string): string {
  if (['TOOL_ID', 'ROBOT_ID', 'GUN_NUMBER', 'DEVICE_NAME', 'SERIAL_NUMBER'].includes(role)) {
    return 'Identity'
  }
  if (['AREA', 'STATION', 'LINE_CODE', 'ZONE', 'CELL'].includes(role)) {
    return 'Location'
  }
  if (['REUSE_STATUS', 'SOURCING', 'PROJECT'].includes(role)) {
    return 'Status'
  }
  if (['GUN_FORCE', 'OEM_MODEL', 'ROBOT_TYPE', 'PAYLOAD', 'REACH', 'HEIGHT', 'BRAND'].includes(role)) {
    return 'Technical'
  }
  if (['ENGINEER', 'SIM_LEADER', 'TEAM_LEADER'].includes(role)) {
    return 'Personnel'
  }
  if (['DUE_DATE', 'START_DATE', 'END_DATE'].includes(role)) {
    return 'Dates'
  }
  return 'Other'
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { SheetMappingData }
