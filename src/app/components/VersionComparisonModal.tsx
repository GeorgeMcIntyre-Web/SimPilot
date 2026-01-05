// Version Comparison Modal
// Displays changes between current and incoming data before import

import { useMemo } from 'react'
import { VersionComparisonResult, EntityChange, FieldConflict } from '../../ingestion/versionComparison'
import { Project, Area, Cell, UnifiedAsset } from '../../domain/core'

interface VersionComparisonModalProps {
  comparison: VersionComparisonResult
  onConfirm: () => void
  onCancel: () => void
}

export function VersionComparisonModal({
  comparison,
  onConfirm,
  onCancel
}: VersionComparisonModalProps) {
  const { summary } = comparison

  // Group changes by severity
  const hasHighSeverityConflicts = useMemo(() => {
    const allChanges = [
      ...comparison.projects,
      ...comparison.areas,
      ...comparison.cells,
      ...comparison.robots,
      ...comparison.tools
    ]
    return allChanges.some(change =>
      change.conflicts?.some(c => c.severity === 'HIGH')
    )
  }, [comparison])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Version Comparison</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review changes before importing new data
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                label="Added"
                value={summary.added}
                color="green"
                icon="✅"
              />
              <SummaryCard
                label="Modified"
                value={summary.modified}
                color="blue"
                icon="📝"
              />
              <SummaryCard
                label="Removed"
                value={summary.removed}
                color="red"
                icon="❌"
              />
              <SummaryCard
                label="Conflicts"
                value={summary.conflicts}
                color={hasHighSeverityConflicts ? 'red' : 'yellow'}
                icon="⚠️"
              />
            </div>
          </div>

          {/* High Severity Conflicts Warning */}
          {hasHighSeverityConflicts && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-2xl mr-3">⚠️</span>
                <div>
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    High-Severity Conflicts Detected
                  </h4>
                  <p className="text-sm text-red-700">
                    Important fields have changed. Please review carefully before importing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Changes */}
          <div className="space-y-6">
            {summary.totalChanges === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✓</div>
                <p>No changes detected. Data is identical to current version.</p>
              </div>
            ) : (
              <>
                {comparison.projects.filter(c => c.type !== 'UNCHANGED').length > 0 && (
                  <ChangeSection
                    title="Projects"
                    changes={comparison.projects.filter(c => c.type !== 'UNCHANGED')}
                    getEntityName={(e) => (e as Project).name}
                  />
                )}

                {comparison.areas.filter(c => c.type !== 'UNCHANGED').length > 0 && (
                  <ChangeSection
                    title="Areas"
                    changes={comparison.areas.filter(c => c.type !== 'UNCHANGED')}
                    getEntityName={(e) => (e as Area).name}
                  />
                )}

                {comparison.cells.filter(c => c.type !== 'UNCHANGED').length > 0 && (
                  <ChangeSection
                    title="Cells"
                    changes={comparison.cells.filter(c => c.type !== 'UNCHANGED')}
                    getEntityName={(e) => (e as Cell).name}
                  />
                )}

                {comparison.robots.filter(c => c.type !== 'UNCHANGED').length > 0 && (
                  <ChangeSection
                    title="Robots"
                    changes={comparison.robots.filter(c => c.type !== 'UNCHANGED')}
                    getEntityName={(e) => (e as UnifiedAsset).name}
                  />
                )}

                {comparison.tools.filter(c => c.type !== 'UNCHANGED').length > 0 && (
                  <ChangeSection
                    title="Tools"
                    changes={comparison.tools.filter(c => c.type !== 'UNCHANGED')}
                    getEntityName={(e) => (e as UnifiedAsset).name}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Import Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SummaryCardProps {
  label: string
  value: number
  color: 'green' | 'blue' | 'red' | 'yellow'
  icon: string
}

function SummaryCard({ label, value, color, icon }: SummaryCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900'
  }

  return (
    <div className={`p-4 border rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  )
}

interface ChangeSectionProps<T> {
  title: string
  changes: EntityChange<T>[]
  getEntityName: (entity: T) => string
}

function ChangeSection<T>({ title, changes, getEntityName }: ChangeSectionProps<T>) {
  const added = changes.filter(c => c.type === 'ADDED')
  const modified = changes.filter(c => c.type === 'MODIFIED')
  const removed = changes.filter(c => c.type === 'REMOVED')

  return (
    <div>
      <h3 className="text-md font-medium text-gray-900 mb-3">
        {title} ({changes.length} changes)
      </h3>

      <div className="space-y-2">
        {/* Added */}
        {added.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-sm font-medium text-green-900 mb-2">
              ✅ Added ({added.length})
            </div>
            <div className="text-xs text-green-800 space-y-1">
              {added.slice(0, 5).map((change, idx) => (
                <div key={idx}>• {getEntityName(change.entity)}</div>
              ))}
              {added.length > 5 && (
                <div className="italic">... and {added.length - 5} more</div>
              )}
            </div>
          </div>
        )}

        {/* Modified */}
        {modified.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-sm font-medium text-blue-900 mb-2">
              📝 Modified ({modified.length})
            </div>
            <div className="text-xs text-blue-800 space-y-2">
              {modified.slice(0, 5).map((change, idx) => (
                <div key={idx}>
                  <div className="font-medium">• {getEntityName(change.entity)}</div>
                  {change.conflicts && change.conflicts.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {change.conflicts.map((conflict, cidx) => (
                        <ConflictRow key={cidx} conflict={conflict} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {modified.length > 5 && (
                <div className="italic">... and {modified.length - 5} more</div>
              )}
            </div>
          </div>
        )}

        {/* Removed */}
        {removed.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-sm font-medium text-red-900 mb-2">
              ❌ Removed ({removed.length})
            </div>
            <div className="text-xs text-red-800 space-y-1">
              {removed.slice(0, 5).map((change, idx) => (
                <div key={idx}>• {getEntityName(change.entity)}</div>
              ))}
              {removed.length > 5 && (
                <div className="italic">... and {removed.length - 5} more</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ConflictRowProps {
  conflict: FieldConflict
}

function ConflictRow({ conflict }: ConflictRowProps) {
  const severityIcon = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢'
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  return (
    <div className="text-xs">
      <span className="mr-1">{severityIcon[conflict.severity]}</span>
      <span className="font-medium">{conflict.field}:</span>{' '}
      <span className="line-through text-red-600">{formatValue(conflict.oldValue)}</span>
      {' → '}
      <span className="text-green-600">{formatValue(conflict.newValue)}</span>
    </div>
  )
}
