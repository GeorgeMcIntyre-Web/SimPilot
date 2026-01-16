import { CheckCircle, AlertTriangle, RotateCcw, Link2 } from 'lucide-react';
import { IngestFilesResult } from '../../../../ingestion/ingestionCoordinator';
import { IngestionWarning } from '../../../../domain/core';
import { coreStore } from '../../../../domain/coreStore';
import { createActivateAuditEntry } from '../../../../domain/auditLog';

interface IngestionResultsProps {
  result: IngestFilesResult;
}

export function IngestionResults({ result }: IngestionResultsProps) {
  const handleReactivateEntity = (warning: IngestionWarning) => {
    if (warning.kind !== 'INACTIVE_ENTITY_REFERENCE' || !warning.details) return

    const { inactiveUid, key, entityType } = warning.details as {
      inactiveUid: string
      key: string
      entityType: 'station' | 'tool' | 'robot'
    }

    const reason = prompt(`Reactivating ${entityType} "${key}". Reason (optional):`)
    if (reason === null) return // User cancelled

    // Reactivate based on entity type
    if (entityType === 'station') {
      coreStore.reactivateStation(inactiveUid)
    } else if (entityType === 'tool') {
      coreStore.reactivateTool(inactiveUid)
    } else if (entityType === 'robot') {
      coreStore.reactivateRobot(inactiveUid)
    }

    // Create audit entry
    const auditEntry = createActivateAuditEntry(
      inactiveUid,
      entityType,
      key,
      reason || `Reactivated during import (was referenced in ${warning.fileName})`,
      undefined
    )
    coreStore.addAuditEntry(auditEntry)
  }

  const inactiveWarnings = result.warnings.filter(w => w.kind === 'INACTIVE_ENTITY_REFERENCE')
  const otherWarnings = result.warnings.filter(w => w.kind !== 'INACTIVE_ENTITY_REFERENCE')

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center" data-testid="data-loaded-indicator">
          <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ingestion Complete</h3>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          data-testid="go-to-dashboard-button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Go to Dashboard →
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-projects-count">
            {result.projectsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projects</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-areas-count">
            {result.areasCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Areas</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-cells-count">
            {result.cellsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stations</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-robots-count">
            {result.robotsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Robots</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-tools-count">
            {result.toolsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tools</div>
        </div>
      </div>

      {/* Linking Statistics */}
      {result.linkStats && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Asset Linking Summary</h4>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {result.linkStats.linkedCells}/{result.linkStats.totalCells}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Cells Linked ({result.linkStats.totalCells > 0
                  ? Math.round((result.linkStats.linkedCells / result.linkStats.totalCells) * 100)
                  : 0}%)
              </div>
            </div>
            <div>
              <div className={`text-lg font-bold ${result.linkStats.orphanedAssets === 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'}`}>
                {result.linkStats.orphanedAssets}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Orphaned Assets</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {result.robotsCount + result.toolsCount - result.linkStats.orphanedAssets}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Assets Linked</div>
            </div>
          </div>
          {result.linkStats.orphanedAssets > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Orphaned assets could not be matched to any station. Check warnings below for details.
            </p>
          )}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Warnings ({result.warnings.length})
          </h4>

          {/* Inactive Entity Warnings with Actions */}
          {inactiveWarnings.length > 0 && (
            <div className="mb-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-md p-4 border border-yellow-200 dark:border-yellow-800">
                <h5 className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 uppercase mb-2">
                  Inactive Entity References ({inactiveWarnings.length})
                </h5>
                <ul className="space-y-2">
                  {inactiveWarnings.map((w, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                      <div className="flex-1">
                        <span className="font-semibold">{w.fileName}:</span> {w.message}
                      </div>
                      <button
                        onClick={() => handleReactivateEntity(w)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 whitespace-nowrap"
                        title="Reactivate this entity"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reactivate
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Other Warnings */}
          {otherWarnings.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-md p-4 max-h-60 overflow-y-auto">
              <ul className="space-y-2">
                {otherWarnings.map((w: any, i: number) => (
                  <li key={i} className="text-sm text-orange-800 dark:text-orange-200">
                    <span className="font-semibold">{w.fileName}:</span> {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
