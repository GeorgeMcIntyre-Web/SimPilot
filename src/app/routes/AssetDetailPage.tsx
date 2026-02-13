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
  Package,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  return getMetadataValue<T>(asset, key)
}

// Use consistent styling matching the app theme

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
    <div className="space-y-6" data-testid="asset-detail-root">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <Link
            to={breadcrumbRootHref}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {breadcrumbRootLabel}
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-gray-900 dark:text-gray-300">{asset.name || 'Asset'}</span>
        </nav>

        <div className="flex items-center gap-2">
          {isActive === false && (
            <span className="inline-flex items-center gap-1 rounded bg-rose-50 dark:bg-rose-950/30 px-2 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 uppercase">
              <Shield className="h-3 w-3" />
              Inactive
            </span>
          )}
          <AssetKindBadge kind={asset.kind} detailedKind={detailedKind} />
          <SourcingBadge sourcing={asset.sourcing} />
          {reuseStatus && <ReuseStatusBadge status={reuseStatus} size="sm" />}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {asset.name || 'Unnamed Asset'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  {detailedKind || asset.kind} • {model || 'Generic Model'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                      Assembly Line
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                      {assemblyLine || '—'}
                    </p>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-100 dark:bg-gray-700 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                      Station
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                      {station || '—'}
                    </p>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-100 dark:bg-gray-700 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                      Assignment
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                      {projectCode || 'No Project'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 text-right">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Serial Number
              </div>
              <div className="text-lg font-mono font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-3 py-1 rounded border border-gray-100 dark:border-gray-700">
                {serialNumber || 'UNKNOWN'}
              </div>
            </div>
          </div>
        </div>

        {/* Essential Info Banner */}
        <div className="bg-gray-50/50 dark:bg-gray-900/20 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <InfoPill label="Original Supplier" value={supplier || 'Not Specified'} />
            <InfoPill label="Asset Group" value={detailedKind || 'Standard'} />
            <InfoPill
              label="Sourcing Path"
              value={asset.sourcing}
              tone={asset.sourcing === 'REUSE' ? 'ok' : undefined}
            />
            <InfoPill label="Primary Function" value={robotFunction || 'General'} />
          </div>
        </div>
      </div>

      {/* Data Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Primary Details & Specs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Specifications Card */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/30 dark:bg-transparent flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <Package className="h-4 w-4 text-blue-500" />
                Technical Specifications
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
              <DetailItem label="Asset Kind" value={asset.kind} />
              <DetailItem label="Detailed Kind" value={detailedKind} />
              <DetailItem label="Manufacturer" value={supplier} />
              <DetailItem label="OEM Model" value={model} />
              <DetailItem
                label="Payload Capability"
                value={payloadKg !== undefined ? `${payloadKg} kg` : undefined}
              />
              <DetailItem
                label="Max Reach"
                value={reachMm !== undefined ? `${reachMm} mm` : undefined}
              />
              <DetailItem label="Robot Type" value={robotType} />
              <DetailItem label="Order Code" value={robotOrderCode} />
              <DetailItem
                label="Max Force"
                value={maxForce !== undefined ? `${maxForce} kN` : undefined}
              />
              <DetailItem
                label="Track Used"
                value={trackUsed !== undefined ? (trackUsed ? 'Yes' : 'No') : undefined}
              />
              <DetailItem label="Payload Class" value={payloadClass} />
              <DetailItem label="Stand Reference" value={standNumber} />
            </div>

            {/* Extended Attributes Footer */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailItem label="Reference #" value={referenceNumber} />
              <DetailItem label="Sourcing" value={asset.sourcing} />
              <DetailItem
                label="Site Location"
                value={
                  siteLocation && siteLocation !== 'Unknown' ? siteLocation : 'Default Factory'
                }
              />
              <DetailItem
                label="Updated"
                value={lastUpdated ? new Date(lastUpdated).toLocaleDateString() : '—'}
              />
            </div>
          </section>

          {/* Description & Intelligence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Info className="h-3.5 w-3.5" />
                Product Description
              </div>
              <div className="p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed min-h-[100px]">
                {description ||
                  'No detailed description provided for this specific asset configuration.'}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900/40 rounded-lg shadow-sm">
              <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-900/10 flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Deployment Concerns
              </div>
              <div className="p-5 text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed min-h-[100px]">
                {applicationConcern ||
                  'No standing deployment or safety concerns reported for this asset.'}
              </div>
            </section>
          </div>

          {/* Comments Section */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-3.5 w-3.5" />
              Engineering Notes
            </div>
            <div className="p-5 text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed">
              {comment ||
                'No supplementary comments or notes have been logged for this asset record.'}
            </div>
          </section>
        </div>

        {/* Right Column: Context & History */}
        <div className="space-y-6">
          {/* Operational Context */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <MapPin className="h-4 w-4 text-blue-500" />
                Placement Context
              </h2>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Area" value={asset.areaName} />
                <DetailItem label="Line" value={assemblyLine} />
                <DetailItem label="Station" value={station} />
                <DetailItem label="Robot #" value={robotNumber} />
                <DetailItem label="Function" value={robotFunction} />
                <DetailItem label="Technology" value={technologyCode} />
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Gun ID" value={gunId} />
                  <DetailItem label="Gun #" value={gunNumber} />
                  <DetailItem label="App Code" value={applicationCode} />
                  <DetailItem label="Install" value={installStatus} />
                </div>
              </div>
            </div>
          </section>

          {/* Reuse Allocation */}
          <section className="bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-900/40 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-900/10 flex items-center justify-between">
              <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 uppercase tracking-tight">
                <Recycle className="h-4 w-4" />
                Reuse Lifecycle
              </h2>
              {reuseStatus && <ReuseStatusBadge status={reuseStatus} size="sm" />}
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Origin Point
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-100 dark:border-gray-800">
                  <DetailItem label="Project" value={oldProject} />
                  <DetailItem label="Area" value={oldArea} />
                  <DetailItem label="Line" value={oldLine} />
                  <DetailItem label="Station" value={oldStation} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
                  Target Objective
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-emerald-50/30 dark:bg-emerald-900/10 p-3 rounded-md border border-emerald-100/50 dark:border-emerald-900/50">
                  <DetailItem label="Project" value={targetProject} />
                  <DetailItem label="Sector" value={targetSector} />
                  <DetailItem label="Line" value={targetLine} />
                  <DetailItem label="Station" value={targetStation} />
                </div>
              </div>
            </div>
          </section>

          {/* Provenance and traceability */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-white">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              Traceability
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Primary Data Source
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate">
                    {primaryWorkbookId || asset.sourceFile || 'MANUAL_ENTRY'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Location in Source
                  </span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {asset.sheetName ? `${asset.sheetName} / Row ${asset.rowIndex ?? '—'}` : 'N/A'}
                  </span>
                </div>
              </div>
              {sourceWorkbookIds.length > 0 && (
                <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">
                    Secondary References
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {sourceWorkbookIds.map((id, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AssetDetailPage
