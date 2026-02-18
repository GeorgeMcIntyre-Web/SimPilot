import { useMemo, useState } from 'react'
import { DEFAULT_FIELD_REGISTRY, FieldDescriptor, FieldId } from '../../../ingestion/fieldMatcher'
import { cn } from '../../../ui/lib/utils'
import { getFieldCategory } from './helpers'

interface FieldSelectorProps {
  currentFieldId: FieldId | null
  onSelect: (fieldId: FieldId | null) => void
  onCancel: () => void
}

export function FieldSelector({ currentFieldId, onSelect, onCancel }: FieldSelectorProps) {
  const [search, setSearch] = useState('')

  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldDescriptor[]> = {}
    for (const field of DEFAULT_FIELD_REGISTRY) {
      const category = getFieldCategory(field.role)
      if (!groups[category]) groups[category] = []
      groups[category].push(field)
    }
    return groups
  }, [])

  const filteredGroups = useMemo(() => {
    if (search.trim() === '') return groupedFields
    const term = search.toLowerCase()
    const filtered: Record<string, FieldDescriptor[]> = {}
    for (const [category, fields] of Object.entries(groupedFields)) {
      const matches = fields.filter(
        (f) =>
          f.name.toLowerCase().includes(term) || f.semanticDescription.toLowerCase().includes(term),
      )
      if (matches.length > 0) filtered[category] = matches
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
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
            currentFieldId === null && 'bg-gray-100 dark:bg-gray-700',
          )}
        >
          <span className="text-yellow-600 dark:text-yellow-400 italic">Unknown</span>
        </button>

        <div className="border-t border-gray-200 dark:border-gray-700" />

        {Object.entries(filteredGroups).map(([category, fields]) => (
          <div key={category}>
            <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
              {category}
            </div>
            {fields.map((field) => (
              <button
                key={field.id}
                onClick={() => onSelect(field.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                  currentFieldId === field.id && 'bg-blue-50 dark:bg-blue-900/20',
                )}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{field.name}</div>
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
