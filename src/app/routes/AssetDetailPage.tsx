import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { AssetDetailPanel } from '../../features/assets/AssetDetailPanel'
import { useCoreStore } from '../../domain/coreStore'
import type { AssetWithMetadata } from '../../features/assets'

export function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>()
  const navigate = useNavigate()
  const { assets } = useCoreStore()

  const asset = useMemo(
    () => assets.find(a => a.id === assetId) as AssetWithMetadata | undefined,
    [assets, assetId]
  )

  const handleOpenInSimulation = (a: AssetWithMetadata) => {
    const params = new URLSearchParams()
    const stationId = a.stationId ?? a.metadata?.stationId
    const areaName = a.areaName ?? a.metadata?.areaName
    const lineCode = a.metadata?.lineCode ?? a.metadata?.assemblyLine
    const station = a.stationNumber ?? a.metadata?.station

    if (stationId) params.set('stationId', stationId)
    if (areaName) params.set('area', areaName)
    if (lineCode) params.set('line', lineCode)
    if (station) params.set('station', station)

    const query = params.toString()
    navigate(query ? `/simulation?${query}` : '/simulation')
  }

  if (!asset) {
    return (
      <div className="space-y-4" data-testid="asset-detail-root">
        <PageHeader title="Asset Not Found" subtitle="The requested asset could not be located." />
        <button
          onClick={() => navigate('/assets')}
          className="text-blue-600 hover:underline text-sm"
        >
          Back to Assets
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="asset-detail-root">
      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
        <Link to="/assets" className="hover:text-blue-600 dark:hover:text-blue-400">Assets</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">{asset.name || 'Asset'}</span>
      </div>

      <AssetDetailPanel
        asset={asset}
        isOpen={true}
        onClose={() => navigate('/assets')}
        onOpenInSimulation={handleOpenInSimulation}
        fullPage
      />
    </div>
  )
}

export default AssetDetailPage
