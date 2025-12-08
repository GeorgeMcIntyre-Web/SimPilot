/**
 * Asset Detail Panel
 *
 * Slide-out panel showing detailed asset information including:
 * - SimulationContext (Program/Plant/Unit/Area/Line/Station)
 * - Provenance (source workbook/sheet/row)
 * - Reuse information (old location → target location)
 * - Action: "Open in Simulation Status"
 *
 * Follows coding style:
 * - Guard clauses
 * - No else/elseif
 * - Max nesting depth 2
 */

import { X, ExternalLink, MapPin, FileSpreadsheet, Recycle, ArrowRight } from 'lucide-react';
import { cn } from '../../ui/lib/utils';
import type { AssetWithMetadata } from './useAssetsFilters';
import { SourcingBadge, ReuseStatusBadge, AssetKindBadge } from './AssetBadges';
import type { ReuseAllocationStatus, DetailedAssetKind } from '../../ingestion/excelIngestionTypes';

// ============================================================================
// TYPES
// ============================================================================

type AssetDetailPanelProps = {
  asset: AssetWithMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInSimulation: (asset: AssetWithMetadata) => void;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  const value = asset.metadata?.[key];
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as T;
}

function formatLocation(line: string | null | undefined, station: string | null | undefined): string {
  const parts: string[] = [];
  if (line !== null && line !== undefined && line.length > 0) {
    parts.push(line);
  }
  if (station !== null && station !== undefined && station.length > 0) {
    parts.push(station);
  }
  if (parts.length === 0) {
    return '—';
  }
  return parts.join(' / ');
}

// ============================================================================
// DETAIL ITEM COMPONENT
// ============================================================================

type DetailItemProps = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

function DetailItem({ label, value, className }: DetailItemProps) {
  return (
    <div className={cn('py-1.5', className)}>
      <dt className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-gray-900 dark:text-gray-100">
        {value || '—'}
      </dd>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssetDetailPanel({ asset, isOpen, onClose, onOpenInSimulation }: AssetDetailPanelProps) {
  // Guard: don't render if not open
  if (!isOpen) {
    return null;
  }

  // Guard: don't render if no asset
  if (asset === null) {
    return null;
  }

  // Extract metadata fields
  const detailedKind = extractMetadata<DetailedAssetKind>(asset, 'detailedKind');
  const reuseStatus = extractMetadata<ReuseAllocationStatus>(asset, 'reuseAllocationStatus');
  const projectCode = extractMetadata<string>(asset, 'projectCode');
  const assemblyLine = extractMetadata<string>(asset, 'assemblyLine') ?? extractMetadata<string>(asset, 'lineCode');
  const station = asset.stationNumber ?? extractMetadata<string>(asset, 'station');
  const robotNumber = extractMetadata<string>(asset, 'robotNumber');
  const gunId = extractMetadata<string>(asset, 'gunId');

  // Reuse location info
  const oldProject = extractMetadata<string>(asset, 'oldProject');
  const oldLine = extractMetadata<string>(asset, 'oldLine');
  const oldStation = extractMetadata<string>(asset, 'oldStation');
  const oldArea = extractMetadata<string>(asset, 'oldArea');
  const targetProject = extractMetadata<string>(asset, 'targetProject');
  const targetLine = extractMetadata<string>(asset, 'targetLine');
  const targetStation = extractMetadata<string>(asset, 'targetStation');
  const targetSector = extractMetadata<string>(asset, 'targetSector');

  // Provenance info
  const primaryWorkbookId = extractMetadata<string>(asset, 'primaryWorkbookId');
  const sourceWorkbookIdsJson = extractMetadata<string>(asset, 'sourceWorkbookIds');
  const sourceWorkbookIds: string[] = sourceWorkbookIdsJson !== undefined ? JSON.parse(sourceWorkbookIdsJson) : [];

  const hasReuseInfo = asset.sourcing === 'REUSE' && (oldProject !== undefined || targetProject !== undefined);
  const hasOldLocation = oldProject !== undefined || oldLine !== undefined || oldStation !== undefined;
  const hasTargetLocation = targetProject !== undefined || targetLine !== undefined || targetStation !== undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform transition-transform">
          <div className="flex h-full flex-col overflow-y-auto bg-white dark:bg-gray-900 shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {asset.name || 'Unnamed Asset'}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <AssetKindBadge kind={asset.kind} detailedKind={detailedKind} />
                    <SourcingBadge sourcing={asset.sourcing} />
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-3 py-3 space-y-3">
              {/* Action Button */}
              <button
                onClick={() => onOpenInSimulation(asset)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Simulation Status
              </button>

              {/* Simulation Context */}
              <section>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white mb-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Simulation Context
                </h3>
                <dl className="grid grid-cols-2 gap-x-3 border-t border-gray-200 dark:border-gray-700">
                  <DetailItem label="Program/Project" value={projectCode} />
                  <DetailItem label="Area" value={asset.areaName} />
                  <DetailItem label="Line" value={assemblyLine} />
                  <DetailItem label="Station" value={station} />
                  {robotNumber !== undefined && (
                    <DetailItem label="Robot #" value={robotNumber} />
                  )}
                  {gunId !== undefined && (
                    <DetailItem label="Gun ID" value={gunId} />
                  )}
                </dl>
              </section>

              {/* Reuse Information */}
              {hasReuseInfo && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white mb-2">
                    <Recycle className="w-3.5 h-3.5 text-emerald-500" />
                    Reuse Allocation
                  </h3>

                  {reuseStatus !== undefined && (
                    <div className="mb-3">
                      <ReuseStatusBadge status={reuseStatus} size="md" />
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Old Location */}
                    {hasOldLocation && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          Original Location
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          {oldProject !== undefined && (
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400 text-[10px]">Project</dt>
                              <dd className="font-medium text-gray-900 dark:text-white">{oldProject}</dd>
                            </div>
                          )}
                          {oldArea !== undefined && (
                            <div>
                              <dt className="text-gray-500 dark:text-gray-400 text-[10px]">Area</dt>
                              <dd className="font-medium text-gray-900 dark:text-white">{oldArea}</dd>
                            </div>
                          )}
                          <div className="col-span-2">
                            <dt className="text-gray-500 dark:text-gray-400 text-[10px]">Line / Station</dt>
                            <dd className="font-medium text-gray-900 dark:text-white">
                              {formatLocation(oldLine, oldStation)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    {/* Arrow between locations */}
                    {hasOldLocation && hasTargetLocation && (
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    )}

                    {/* Target Location */}
                    {hasTargetLocation && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                        <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1.5">
                          Target Location
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          {targetProject !== undefined && (
                            <div>
                              <dt className="text-emerald-600 dark:text-emerald-400 text-[10px]">Project</dt>
                              <dd className="font-medium text-emerald-800 dark:text-emerald-200">{targetProject}</dd>
                            </div>
                          )}
                          {targetSector !== undefined && (
                            <div>
                              <dt className="text-emerald-600 dark:text-emerald-400 text-[10px]">Sector</dt>
                              <dd className="font-medium text-emerald-800 dark:text-emerald-200">{targetSector}</dd>
                            </div>
                          )}
                          <div className="col-span-2">
                            <dt className="text-emerald-600 dark:text-emerald-400 text-[10px]">Line / Station</dt>
                            <dd className="font-medium text-emerald-800 dark:text-emerald-200">
                              {formatLocation(targetLine, targetStation)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Provenance */}
              <section>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white mb-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-gray-400" />
                  Provenance
                </h3>
                <dl className="border-t border-gray-200 dark:border-gray-700">
                  <DetailItem
                    label="Source File"
                    value={
                      asset.sourceFile !== undefined ? (
                        <span className="font-mono text-[10px] break-all">
                          {asset.sourceFile.split(/[/\\]/).pop()}
                        </span>
                      ) : undefined
                    }
                  />
                  <DetailItem label="Sheet" value={asset.sheetName} />
                  <DetailItem label="Row" value={asset.rowIndex !== undefined ? `Row ${asset.rowIndex}` : undefined} />
                  {primaryWorkbookId !== undefined && (
                    <DetailItem
                      label="Workbook ID"
                      value={<span className="font-mono text-[10px]">{primaryWorkbookId}</span>}
                    />
                  )}
                  {sourceWorkbookIds.length > 1 && (
                    <DetailItem
                      label="Also Found In"
                      value={
                        <span className="text-[10px] text-gray-500">
                          +{sourceWorkbookIds.length - 1} other workbook(s)
                        </span>
                      }
                    />
                  )}
                </dl>
              </section>

              {/* Additional Metadata */}
              <section>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                  Additional Details
                </h3>
                <dl className="border-t border-gray-200 dark:border-gray-700">
                  {asset.oemModel !== undefined && (
                    <DetailItem label="Model" value={asset.oemModel} />
                  )}
                  {asset.description !== undefined && (
                    <DetailItem label="Description" value={asset.description} />
                  )}
                  {asset.lastUpdated !== undefined && (
                    <DetailItem
                      label="Last Updated"
                      value={new Date(asset.lastUpdated).toLocaleDateString()}
                    />
                  )}
                  {asset.notes !== undefined && (
                    <DetailItem label="Notes" value={asset.notes} />
                  )}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
