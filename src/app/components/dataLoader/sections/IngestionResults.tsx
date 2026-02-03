import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Link2,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Bot,
  Wrench,
  Building2,
  ExternalLink
} from 'lucide-react';
import { IngestFilesResult } from '../../../../ingestion/ingestionCoordinator';
import { IngestionWarning } from '../../../../domain/core';
import { coreStore } from '../../../../domain/coreStore';
import { createActivateAuditEntry } from '../../../../domain/auditLog';
import { cn } from '../../../../ui/lib/utils';

interface IngestionResultsProps {
  result: IngestFilesResult;
}

interface StatCardProps {
  value: number;
  label: string;
  icon: React.ReactNode;
  href?: string;
  testId?: string;
}

function StatCard({ value, label, icon, href, testId }: StatCardProps) {
  const content = (
    <div className={cn(
      "p-4 rounded-lg border transition-all",
      "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300",
      href && "hover:shadow-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
          {icon}
        </div>
        {href && <ExternalLink className="w-3 h-3 opacity-50" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid={testId}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

export function IngestionResults({ result }: IngestionResultsProps) {
  const [showWarnings, setShowWarnings] = useState(result.warnings.length <= 5);

  const handleReactivateEntity = (warning: IngestionWarning) => {
    if (warning.kind !== 'INACTIVE_ENTITY_REFERENCE' || !warning.details) return;

    const { inactiveUid, key, entityType } = warning.details as {
      inactiveUid: string;
      key: string;
      entityType: 'station' | 'tool' | 'robot';
    };

    const reason = prompt(`Reactivating ${entityType} "${key}". Reason (optional):`);
    if (reason === null) return; // User cancelled

    // Reactivate based on entity type
    if (entityType === 'station') {
      coreStore.reactivateStation(inactiveUid);
    } else if (entityType === 'tool') {
      coreStore.reactivateTool(inactiveUid);
    } else if (entityType === 'robot') {
      coreStore.reactivateRobot(inactiveUid);
    }

    // Create audit entry
    const auditEntry = createActivateAuditEntry(
      inactiveUid,
      entityType,
      key,
      reason || `Reactivated during import (was referenced in ${warning.fileName})`,
      undefined
    );
    coreStore.addAuditEntry(auditEntry);
  };

  const inactiveWarnings = result.warnings.filter(w => w.kind === 'INACTIVE_ENTITY_REFERENCE');
  const otherWarnings = result.warnings.filter(w => w.kind !== 'INACTIVE_ENTITY_REFERENCE');
  const totalEntities = result.projectsCount + result.areasCount + result.cellsCount + result.robotsCount + result.toolsCount;
  const hasWarnings = result.warnings.length > 0;

  // Calculate linking percentage
  const linkPercentage = result.linkStats && result.linkStats.totalCells > 0
    ? Math.round((result.linkStats.linkedCells / result.linkStats.totalCells) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-600 dark:to-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white" data-testid="data-loaded-indicator">
                Ingestion Complete
              </h3>
              <p className="text-gray-300 text-sm">
                {totalEntities} entities loaded successfully
                {hasWarnings && ` • ${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            data-testid="go-to-dashboard-button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-800 text-sm font-medium rounded-lg shadow hover:bg-gray-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            value={result.projectsCount}
            label="Projects"
            icon={<Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            testId="result-projects-count"
          />
          <StatCard
            value={result.areasCount}
            label="Areas"
            icon={<MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            testId="result-areas-count"
          />
          <StatCard
            value={result.cellsCount}
            label="Stations"
            icon={<Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            testId="result-cells-count"
          />
          <StatCard
            value={result.robotsCount}
            label="Robots"
            icon={<Bot className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            testId="result-robots-count"
          />
          <StatCard
            value={result.toolsCount}
            label="Tools"
            icon={<Wrench className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            testId="result-tools-count"
          />
        </div>

        {/* Linking Statistics */}
        {result.linkStats && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Asset Linking Summary</h4>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                {linkPercentage}% linked
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-gray-600 dark:bg-gray-400"
                  style={{ width: `${linkPercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  {result.linkStats.linkedCells}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    /{result.linkStats.totalCells}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Cells Linked</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  {result.linkStats.orphanedAssets}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Orphaned Assets</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  {result.robotsCount + result.toolsCount - result.linkStats.orphanedAssets}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Assets Linked</div>
              </div>
            </div>

            {result.linkStats.orphanedAssets > 0 && (
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded p-2">
                Orphaned assets could not be matched to any station. Check warnings below for details.
              </p>
            )}
          </div>
        )}

        {/* Warnings Section */}
        {hasWarnings && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Warnings Header */}
            <button
              onClick={() => setShowWarnings(!showWarnings)}
              className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {result.warnings.length} Warning{result.warnings.length !== 1 ? 's' : ''}
                </span>
              </div>
              {showWarnings ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {/* Warnings Content */}
            {showWarnings && (
              <div className="p-4 space-y-4">
                {/* Inactive Entity Warnings with Actions */}
                {inactiveWarnings.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Inactive Entity References ({inactiveWarnings.length})
                    </h5>
                    <ul className="space-y-2">
                      {inactiveWarnings.map((w, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 rounded p-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{w.fileName}:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-400">{w.message}</span>
                          </div>
                          <button
                            onClick={() => handleReactivateEntity(w)}
                            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors whitespace-nowrap"
                            title="Reactivate this entity"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reactivate
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Other Warnings */}
                {otherWarnings.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700">
                    <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">
                      Other Warnings ({otherWarnings.length})
                    </h5>
                    <ul className="space-y-2">
                      {otherWarnings.map((w, i) => (
                        <li key={i} className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 rounded p-2">
                          <span className="font-medium">{w.fileName}:</span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">{w.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Navigation */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Quick Navigation</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </a>
            {result.areasCount > 0 && (
              <a
                href="/areas"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                View Areas
              </a>
            )}
            {result.robotsCount > 0 && (
              <a
                href="/assets?type=robot"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Bot className="w-4 h-4" />
                View Robots
              </a>
            )}
            {result.toolsCount > 0 && (
              <a
                href="/assets?type=tool"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Wrench className="w-4 h-4" />
                View Tools
              </a>
            )}
            <a
              href="/data-loader?tab=health"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Data Health
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
