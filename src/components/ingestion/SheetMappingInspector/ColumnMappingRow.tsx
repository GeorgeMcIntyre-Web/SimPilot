import { useState } from 'react'
import { Edit2, RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import { FieldMatchResult } from '../../../ingestion/fieldMatcher'
import { useMappingOverrides } from '../../../hooks/useMappingOverrides'
import { FieldSelector } from './FieldSelector'
import { getConfidenceClass, getConfidenceIcon } from './helpers'

type ColumnMappingRowProps = {
  match: FieldMatchResult
  workbookId: string
  sheetName: string
  hasOverride: boolean
  sampleValues?: string[]
  overridesState: ReturnType<typeof useMappingOverrides>
}

export function ColumnMappingRow({
  match,
  workbookId,
  sheetName,
  hasOverride,
  sampleValues,
  overridesState,
}: ColumnMappingRowProps) {
  const [isEditing, setIsEditing] = useState(false)

  const confidenceClass = getConfidenceClass(match.confidence)
  const confidenceIcon = getConfidenceIcon(match.confidence)

  return (
    <tr
      className={cn(
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        hasOverride && 'bg-orange-50/50 dark:bg-orange-900/10',
      )}
    >
      <td className="px-4 py-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">{match.header}</span>
          {hasOverride && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              edited
            </span>
          )}
        </div>
      </td>

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
                  fieldId,
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
                : 'text-yellow-600 dark:text-yellow-400 italic',
            )}
          >
            {match.matchedField?.name ?? 'Unknown'}
            <Edit2 className="w-3 h-3 ml-2 opacity-50" />
          </button>
        )}

        {match.usedEmbedding && (
          <span
            className="ml-2 inline-flex items-center text-xs text-purple-600 dark:text-purple-400"
            title="Embedding-assisted match"
          >
            <Sparkles className="w-3 h-3" />
          </span>
        )}
      </td>

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
          {match.embeddingScore !== undefined && (
            <span
              className="text-xs text-purple-600 dark:text-purple-400"
              title="Embedding similarity"
            >
              ({(match.embeddingScore * 100).toFixed(0)}% sem)
            </span>
          )}
        </div>
      </td>

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

      <td className="px-4 py-2">
        <div className="flex items-center space-x-1">
          {hasOverride && (
            <button
              onClick={() =>
                overridesState.removeOverride(workbookId, sheetName, match.columnIndex)
              }
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
