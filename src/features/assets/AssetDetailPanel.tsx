/**
 * Asset Detail Modal
 *
 * Centered dialog showing:
 * - SimulationContext (Program/Plant/Unit/Area/Line/Station)
 * - Provenance (source workbook/sheet/row)
 * - Reuse information (old location -> target location)
 * - Action: "Open in Simulation Status"
 *
 * Follows coding style:
 * - Guard clauses
 * - No else/elseif
 * - Max nesting depth 2
 */

import {
  X,
  ExternalLink,
  MapPin,
  FileSpreadsheet,
  Recycle,
  ArrowRight,
  Shield,
  Info,
  LayoutGrid
} from 'lucide-react';
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
  fullPage?: boolean;
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
    <div className={cn('py-1', className)}>
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

export function AssetDetailPanel({ asset, isOpen, onClose, onOpenInSimulation, fullPage = false }: AssetDetailPanelProps) {
  if (!isOpen || asset === null) {
    return null;
  }

  // Extract metadata fields
  const detailedKind = extractMetadata<DetailedAssetKind>(asset, 'detailedKind');
  const reuseStatus = extractMetadata<ReuseAllocationStatus>(asset, 'reuseAllocationStatus');
  const projectCode = extractMetadata<string>(asset, 'projectCode');
  const assemblyLine = extractMetadata<string>(asset, 'assemblyLine') ?? extractMetadata<string>(asset, 'lineCode');
  const station = asset.stationNumber ?? extractMetadata<string>(asset, 'station');
  const stationId = asset.stationId;
  const robotNumber = extractMetadata<string>(asset, 'robotNumber');
  const gunId = extractMetadata<string>(asset, 'gunId');
  const model = asset.oemModel ?? extractMetadata<string>(asset, 'model');
  const description = asset.description ?? extractMetadata<string>(asset, 'description');
  const supplier = asset.supplier ?? extractMetadata<string>(asset, 'supplier');
  const referenceNumber = asset.referenceNumber ?? extractMetadata<string>(asset, 'referenceNumber');
  const payloadClass = asset.payloadClass ?? extractMetadata<string>(asset, 'payloadClass');
  const standNumber = asset.standNumber ?? extractMetadata<string>(asset, 'standNumber');
  const isActive = asset.isActive ?? true;
  const comment =
    extractMetadata<string>(asset, 'comment') ||
    extractMetadata<string>(asset, 'Comment') ||
    extractMetadata<string>(asset, 'esowComment') ||
    extractMetadata<string>(asset, 'ESOW Comment');
  const applicationConcern =
    extractMetadata<string>(asset, 'applicationConcern') ||
    extractMetadata<string>(asset, 'Application Concern') ||
    extractMetadata<string>(asset, 'Robot application concern');

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

  const containerClass = fullPage
    ? 'flex items-start justify-center px-4 py-6'
    : 'fixed inset-0 z-50 flex items-start justify-center px-4 py-6 sm:py-12';

  return (
    <div className={containerClass}>
      {!fullPage && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
          onClick={onClose}
        />
      )}

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="relative px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {asset.name || 'Unnamed Asset'}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <AssetKindBadge kind={asset.kind} detailedKind={detailedKind} />
                <SourcingBadge sourcing={asset.sourcing} />
                {reuseStatus && <ReuseStatusBadge status={reuseStatus} size="sm" />}
                {isActive === false && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                    <Shield className="h-3 w-3" />
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                  <MapPin className="h-3.5 w-3.5" />
                  {formatLocation(assemblyLine, station)}
                </span>
                {projectCode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {projectCode}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <button
                onClick={() => onOpenInSimulation(asset)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Simulation
              </button>
              {!fullPage && (
                <button
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-white dark:bg-gray-900 custom-scrollbar">
          {/* Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <section className="rounded-lg border border-gray-100 dark:border-gray-800 p-2 bg-gray-50/60 dark:bg-gray-800/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="h-3.5 w-3.5 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Asset Overview
                </h3>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <DetailItem label="Kind" value={asset.kind} />
                <DetailItem label="Sourcing" value={asset.sourcing} />
                <DetailItem label="Model" value={model} />
                <DetailItem label="Supplier" value={supplier} />
                <DetailItem label="Reference #" value={referenceNumber} />
                <DetailItem label="Payload Class" value={payloadClass} />
                <DetailItem label="Stand #" value={standNumber} />
                <DetailItem label="Active" value={isActive ? 'Yes' : 'No'} />
              </dl>
            </section>

            <section className="rounded-lg border border-gray-100 dark:border-gray-800 p-2 bg-gray-50/60 dark:bg-gray-800/40">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Simulation Context
                </h3>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
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
          </div>

        {/* Description */}
        {description && (
          <section className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-800/60">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-1.5">
              Description
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{description}</p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <section className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-800/60">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-1.5">
              Comment
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {comment || '—'}
            </p>
          </section>
          <section className="rounded-lg border border-amber-100 dark:border-amber-800/60 p-3 bg-amber-50/60 dark:bg-amber-900/20">
            <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-1.5">
              Robot Application Concern
            </h3>
            <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
              {applicationConcern || '—'}
            </p>
          </section>
        </div>

        {/* Reuse Information */}
        {hasReuseInfo && (
            <section className="rounded-lg border border-emerald-100 dark:border-emerald-800/60 p-3 bg-emerald-50/50 dark:bg-emerald-900/20">
              <div className="flex items-center gap-1.5 mb-3">
                <Recycle className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-200 uppercase tracking-wide">
                  Reuse Allocation
                </h3>
              </div>

              {reuseStatus !== undefined && (
                <div className="mb-3">
                  <ReuseStatusBadge status={reuseStatus} size="md" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hasOldLocation && (
                  <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3">
                    <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                      Original Location
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      {oldProject !== undefined && (
                        <DetailItem label="Project" value={oldProject} />
                      )}
                      {oldArea !== undefined && (
                        <DetailItem label="Area" value={oldArea} />
                      )}
                      <DetailItem label="Line / Station" value={formatLocation(oldLine, oldStation)} className="col-span-2" />
                    </dl>
                  </div>
                )}

                {hasTargetLocation && (
                  <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3">
                    <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wide mb-1.5">
                      Target Location
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      {targetProject !== undefined && (
                        <DetailItem label="Project" value={targetProject} />
                      )}
                      {targetSector !== undefined && (
                        <DetailItem label="Sector" value={targetSector} />
                      )}
                      <DetailItem label="Line / Station" value={formatLocation(targetLine, targetStation)} className="col-span-2" />
                    </dl>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Provenance */}
          {(primaryWorkbookId !== undefined || sourceWorkbookIds.length > 0 || asset.sourceFile || asset.sheetName) && (
            <section className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-gray-50/60 dark:bg-gray-800/40">
              <div className="flex items-center gap-1.5 mb-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Provenance
                </h3>
              </div>
              <div className="space-y-2 text-xs text-gray-800 dark:text-gray-200">
                {primaryWorkbookId !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">Primary Workbook:</span>
                    <span className="font-mono text-[11px]">{primaryWorkbookId}</span>
                  </div>
                )}
                {sourceWorkbookIds.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 mt-[2px]" />
                    <div>
                      <div className="font-medium">Sources</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {sourceWorkbookIds.map((id) => (
                          <li key={id} className="font-mono text-[11px]">{id}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                  <DetailItem label="Source File" value={asset.sourceFile} />
                  <DetailItem label="Sheet / Row" value={`${asset.sheetName ?? '—'}${asset.rowIndex !== undefined ? ` / ${asset.rowIndex}` : ''}`} />
                  <DetailItem label="Station ID" value={asset.stationId} />
                  <DetailItem label="Robot ID" value={asset.robotId} />
                  <DetailItem label="Tool ID" value={asset.toolId} />
                  <DetailItem label="Notes" value={asset.notes} className="col-span-2" />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
