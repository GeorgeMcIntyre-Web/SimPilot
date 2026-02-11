import { useMemo } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useCoreStore } from '../../domain/coreStore'
import { InfoPill } from '../../ui/components/InfoPill'
import { SourcingBadge, ReuseStatusBadge, AssetKindBadge } from '../../features/assets/AssetBadges'
import type { AssetWithMetadata } from '../../features/assets'
import type { ReuseAllocationStatus, DetailedAssetKind } from '../../ingestion/excelIngestionTypes'
import { getMetadataValue } from '../../utils/metadata'
import {
  MapPin,
  FileSpreadsheet,
  Recycle,
  ArrowRight,
  Shield,
  Info,
  LayoutGrid,
  Package,
  Building2,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  return getMetadataValue<T>(asset, key)
}

// Use consistent blue gradient matching CellDetailPage
const HEADER_GRADIENT = {
  light: 'from-blue-50 to-blue-100',
  dark: 'dark:from-blue-950/30 dark:to-blue-900/30',
  border: 'border-blue-200 dark:border-blue-800',
}

// ============================================================================
// DETAIL ITEM COMPONENT
// ============================================================================

type DetailItemProps = {
  label: string
  value: React.ReactNode
  className?: string
}

function DetailItem({ label, value, className }: DetailItemProps) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{value || '—'}</dd>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>()
  const location = useLocation()
  const { assets } = useCoreStore()

  const { from: fromPath, fromLabel } = (location.state || {}) as {
    from?: string
    fromLabel?: string
  }
  const breadcrumbRootHref = fromPath || '/assets'
  const breadcrumbRootLabel = fromLabel || 'Assets'

  const asset = useMemo(
    () => assets.find((a) => a.id === assetId) as AssetWithMetadata | undefined,
    [assets, assetId],
  )

  if (!asset) {
    return (
      <div className="space-y-4" data-testid="asset-detail-root">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Asset Not Found</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            The requested asset could not be located.
          </p>
          <Link
            to={breadcrumbRootHref}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to {breadcrumbRootLabel}
          </Link>
        </div>
      </div>
    )
  }

  // Extract metadata fields
  const detailedKind = extractMetadata<DetailedAssetKind>(asset, 'detailedKind')
  const reuseStatus = extractMetadata<ReuseAllocationStatus>(asset, 'reuseAllocationStatus')
  const projectCode = extractMetadata<string>(asset, 'projectCode')
  const assemblyLine =
    extractMetadata<string>(asset, 'assemblyLine') ?? extractMetadata<string>(asset, 'lineCode')
  const station = asset.stationNumber ?? extractMetadata<string>(asset, 'station')
  const robotNumber = extractMetadata<string>(asset, 'robotNumber')
  const gunId = extractMetadata<string>(asset, 'gunId')
  const model = asset.oemModel ?? extractMetadata<string>(asset, 'model')
  const description = asset.description ?? extractMetadata<string>(asset, 'description')
  const supplier = asset.supplier ?? extractMetadata<string>(asset, 'supplier')
  const referenceNumber = asset.referenceNumber ?? extractMetadata<string>(asset, 'referenceNumber')
  const payloadClass = asset.payloadClass ?? extractMetadata<string>(asset, 'payloadClass')
  const standNumber = asset.standNumber ?? extractMetadata<string>(asset, 'standNumber')
  const isActive = asset.isActive ?? true
  const comment =
    extractMetadata<string>(asset, 'comment') ||
    extractMetadata<string>(asset, 'Comment') ||
    extractMetadata<string>(asset, 'esowComment') ||
    extractMetadata<string>(asset, 'ESOW Comment')
  const applicationConcern =
    extractMetadata<string>(asset, 'applicationConcern') ||
    extractMetadata<string>(asset, 'Application Concern') ||
    extractMetadata<string>(asset, 'Robot application concern') ||
    (asset as any).applicationConcern

  // Reuse location info
  const oldProject = extractMetadata<string>(asset, 'oldProject')
  const oldLine = extractMetadata<string>(asset, 'oldLine')
  const oldStation = extractMetadata<string>(asset, 'oldStation')
  const oldArea = extractMetadata<string>(asset, 'oldArea')
  const targetProject = extractMetadata<string>(asset, 'targetProject')
  const targetLine = extractMetadata<string>(asset, 'targetLine')
  const targetStation = extractMetadata<string>(asset, 'targetStation')
  const targetSector = extractMetadata<string>(asset, 'targetSector')

  // Provenance info
  const primaryWorkbookId = extractMetadata<string>(asset, 'primaryWorkbookId')
  const sourceWorkbookIdsJson = extractMetadata<string>(asset, 'sourceWorkbookIds')
  const sourceWorkbookIds: string[] =
    sourceWorkbookIdsJson !== undefined ? JSON.parse(sourceWorkbookIdsJson) : []

  // Additional metadata fields
  const simulationSourceKind = extractMetadata<string>(asset, 'simulationSourceKind')
  const siteLocation = extractMetadata<string>(asset, 'siteLocation')
  const robotType =
    extractMetadata<string>(asset, 'robotType') ?? extractMetadata<string>(asset, 'Robot Type')
  const robotOrderCode = extractMetadata<string>(asset, 'robotOrderCode')
  const applicationCode = extractMetadata<string>(asset, 'applicationCode')
  const technologyCode = extractMetadata<string>(asset, 'technologyCode')
  const payloadKg = extractMetadata<number>(asset, 'payloadKg')
  const reachMm = extractMetadata<number>(asset, 'reachMm')
  const trackUsed = extractMetadata<boolean>(asset, 'trackUsed')
  const maxForce = asset.maxForce ?? extractMetadata<number>(asset, 'maxForce')
  const gunNumber = asset.gunNumber ?? extractMetadata<string>(asset, 'gunNumber')
  const lastUpdated = asset.lastUpdated

  // Robot-specific fields: Install Status, Serial Number, Function
  const installStatus =
    extractMetadata<string>(asset, 'installStatus') ||
    extractMetadata<string>(asset, 'Install Status') ||
    extractMetadata<string>(asset, 'Install status') ||
    extractMetadata<string>(asset, 'install status')

  const serialNumber =
    extractMetadata<string>(asset, 'serialNumber') ||
    extractMetadata<string>(asset, 'Serial #') ||
    extractMetadata<string>(asset, 'Serial') ||
    extractMetadata<string>(asset, 'serial') ||
    extractMetadata<string>(asset, 'eNumber')

  const robotFunction =
    extractMetadata<string>(asset, 'function') ||
    extractMetadata<string>(asset, 'Function') ||
    extractMetadata<string>(asset, 'application') ||
    extractMetadata<string>(asset, 'robotApplication') ||
    extractMetadata<string>(asset, 'Robot Application')

  return (
    <div className="space-y-4" data-testid="asset-detail-root">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
        <Link to={breadcrumbRootHref} className="hover:text-blue-600 dark:hover:text-blue-400">
          {breadcrumbRootLabel}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">{asset.name || 'Asset'}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div
          className={`bg-gradient-to-r ${HEADER_GRADIENT.light} ${HEADER_GRADIENT.dark} border-b ${HEADER_GRADIENT.border} px-4 py-3`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  {asset.kind} Asset
                </p>
                {isActive === false && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-200">
                    <Shield className="h-3 w-3" />
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {asset.name || 'Unnamed Asset'}
                </h1>
                <AssetKindBadge kind={asset.kind} detailedKind={detailedKind} />
                <SourcingBadge sourcing={asset.sourcing} />
                {reuseStatus && <ReuseStatusBadge status={reuseStatus} size="sm" />}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 flex-wrap mt-2">
                {assemblyLine && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">
                    <MapPin className="h-3 w-3" />
                    Line {assemblyLine}
                  </span>
                )}
                {station && (
                  <span className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">
                    Station {station}
                  </span>
                )}
                {projectCode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">
                    <LayoutGrid className="h-3 w-3" />
                    {projectCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <InfoPill
              label="Model"
              value={model || 'Unknown'}
              icon={<Package className="h-3 w-3" />}
            />
            <InfoPill
              label="Supplier"
              value={supplier || 'Unknown'}
              icon={<Building2 className="h-3 w-3" />}
            />
            <InfoPill
              label="Sourcing"
              value={asset.sourcing}
              tone={asset.sourcing === 'REUSE' ? 'ok' : undefined}
              icon={<Recycle className="h-3 w-3" />}
            />
            <InfoPill
              label="Status"
              value={isActive ? 'Active' : 'Inactive'}
              tone={isActive ? 'ok' : 'warn'}
              icon={<Shield className="h-3 w-3" />}
            />
          </div>
        </div>
      </div>

      {/* Overview and Context Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Asset Overview */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Asset Overview
              </h3>
            </div>
          </div>
          <div className="p-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <DetailItem label="Kind" value={asset.kind} />
              <DetailItem label="Detailed Kind" value={detailedKind} />
              <DetailItem label="Sourcing" value={asset.sourcing} />
              <DetailItem label="Model" value={model} />
              <DetailItem label="Supplier" value={supplier} />
              <DetailItem label="Reference #" value={referenceNumber} />
              <DetailItem label="Payload Class" value={payloadClass} />
              <DetailItem label="Stand #" value={standNumber} />
              <DetailItem
                label="Source Type"
                value={
                  simulationSourceKind
                    ? simulationSourceKind === 'InternalSimulation'
                      ? 'Internal'
                      : 'Outsource'
                    : undefined
                }
              />
              <DetailItem
                label="Site Location"
                value={siteLocation && siteLocation !== 'Unknown' ? siteLocation : undefined}
              />
              <DetailItem
                label="Last Updated"
                value={
                  lastUpdated
                    ? new Date(lastUpdated).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : undefined
                }
              />
            </dl>
          </div>
        </div>

        {/* Simulation Context */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Simulation Context
              </h3>
            </div>
          </div>
          <div className="p-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <DetailItem label="Program/Project" value={projectCode} />
              <DetailItem label="Area" value={asset.areaName} />
              <DetailItem label="Line" value={assemblyLine} />
              <DetailItem label="Station" value={station} />
              <DetailItem label="Robot #" value={robotNumber} />
              <DetailItem label="Gun ID" value={gunId} />
              <DetailItem label="Gun Number" value={gunNumber} />
              <DetailItem label="Function" value={robotFunction} />
              <DetailItem label="Application Code" value={applicationCode} />
              <DetailItem label="Technology" value={technologyCode} />
              <DetailItem label="Install Status" value={installStatus} />
              <DetailItem label="Serial #" value={serialNumber} />
            </dl>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Technical Specifications
            </h3>
          </div>
        </div>
        <div className="p-3">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
            <DetailItem label="Type" value={robotType} />
            <DetailItem label="Order Code" value={robotOrderCode} />
            <DetailItem
              label="Payload"
              value={payloadKg !== undefined ? `${payloadKg} kg` : undefined}
            />
            <DetailItem label="Reach" value={reachMm !== undefined ? `${reachMm} mm` : undefined} />
            <DetailItem
              label="Track Used"
              value={trackUsed !== undefined ? (trackUsed ? 'Yes' : 'No') : undefined}
            />
            <DetailItem
              label="Max Force"
              value={maxForce !== undefined ? `${maxForce} kN` : undefined}
            />
          </dl>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
            Description
          </h3>
        </div>
        <div className="p-3">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {description || '—'}
          </p>
        </div>
      </div>

      {/* Comment and Application Concern Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Comment */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Comment
              </h3>
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {comment || '—'}
            </p>
          </div>
        </div>

        {/* Application Concern */}
        <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800/60 rounded-lg overflow-hidden">
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/60 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                Robot Application Concern
              </h3>
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
              {applicationConcern || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Reuse Information */}
      <div className="bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/60 rounded-lg overflow-hidden">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800/60 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Recycle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-200 uppercase tracking-wide">
                Reuse Allocation
              </h3>
            </div>
            {reuseStatus && <ReuseStatusBadge status={reuseStatus} size="md" />}
          </div>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3">
              <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                Original Location
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <DetailItem label="Project" value={oldProject} />
                <DetailItem label="Area" value={oldArea} />
                <DetailItem label="Line" value={oldLine} />
                <DetailItem label="Station" value={oldStation} />
              </dl>
            </div>

            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3">
              <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wide mb-2">
                Target Location
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <DetailItem label="Project" value={targetProject} />
                <DetailItem label="Sector" value={targetSector} />
                <DetailItem label="Line" value={targetLine} />
                <DetailItem label="Station" value={targetStation} />
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Provenance */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Provenance
            </h3>
          </div>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Primary Workbook:</span>
            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
              {primaryWorkbookId || '—'}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Sources</div>
              {sourceWorkbookIds.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5">
                  {sourceWorkbookIds.map((id) => (
                    <li key={id} className="font-mono text-xs text-gray-600 dark:text-gray-400">
                      {id}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <DetailItem label="Source File" value={asset.sourceFile} />
            <DetailItem
              label="Sheet / Row"
              value={`${asset.sheetName ?? '—'}${asset.rowIndex !== undefined ? ` / ${asset.rowIndex}` : ''}`}
            />
            <DetailItem label="Station ID" value={asset.stationId} />
            <DetailItem label="Robot ID" value={asset.robotId} />
            <DetailItem label="Tool ID" value={asset.toolId} />
            <DetailItem label="Notes" value={asset.notes} className="col-span-2 md:col-span-3" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssetDetailPage
