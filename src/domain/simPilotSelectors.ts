import type { UnifiedAsset } from './UnifiedModel'
import type {
  ToolingBottleneckState,
  ToolingWorkflowStatus,
  WorkflowStage,
  BottleneckReason,
  BottleneckSeverity
} from './toolingBottleneckStore'

export interface SimPilotSelectorState {
  toolingBottlenecks: ToolingBottleneckState
  assets: UnifiedAsset[]
}

export interface AssetBottleneckSummary {
  stage: WorkflowStage
  reason: BottleneckReason
  severity: BottleneckSeverity
  toolingNumber: string
}

const SEVERITY_ORDER: Record<BottleneckSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1
}

const TOOLING_METADATA_KEYS = [
  'toolingNumber',
  'tooling_id',
  'toolNumber',
  'toolId',
  'tooling',
  'fixtureNumber'
] as const

const STATION_METADATA_KEYS = [
  'station',
  'stationNumber',
  'station_code'
] as const

export function selectBottlenecksByStationKey(
  state: ToolingBottleneckState,
  stationKey: string | null
): ToolingWorkflowStatus[] {
  if (!stationKey) return []
  const matches = state.byStationKey[stationKey]
  if (!matches) return []
  return matches
}

export function selectBottlenecksForToolingNumber(
  state: ToolingBottleneckState,
  toolingNumber: string | null
): ToolingWorkflowStatus | null {
  if (!toolingNumber) return null
  const match = state.byToolingNumber[toolingNumber]
  if (!match) return null
  return match
}

export function selectBottleneckStageForAsset(
  state: SimPilotSelectorState,
  assetId: string | null
): AssetBottleneckSummary | null {
  if (!assetId) return null

  const asset = state.assets.find(item => item.id === assetId)
  if (!asset) return null

  const toolingMatches = gatherToolingCandidates(asset)
  for (const candidate of toolingMatches) {
    const status = selectBottlenecksForToolingNumber(state.toolingBottlenecks, candidate)
    if (!status) continue
    return summarize(status)
  }

  const stationNumber = extractStationNumber(asset)
  if (!stationNumber) return null

  const stationMatches = state.toolingBottlenecks.byStationNumber[stationNumber]
  if (!stationMatches || stationMatches.length === 0) return null

  const prioritized = pickHighestSeverity(stationMatches)
  return summarize(prioritized)
}

function gatherToolingCandidates(asset: UnifiedAsset): string[] {
  const candidates = new Set<string>()

  const directToolingNumber = asset.metadata?.toolingNumber
  if (typeof directToolingNumber === 'string' && directToolingNumber.length > 0) {
    candidates.add(directToolingNumber)
  }

  for (const key of TOOLING_METADATA_KEYS) {
    const value = asset.metadata?.[key]
    if (typeof value !== 'string') continue
    if (value.length === 0) continue
    candidates.add(value)
  }

  return Array.from(candidates)
}

function extractStationNumber(asset: UnifiedAsset): string | null {
  if (asset.stationNumber && asset.stationNumber.length > 0) {
    return asset.stationNumber
  }

  for (const key of STATION_METADATA_KEYS) {
    const value = asset.metadata?.[key]
    if (typeof value !== 'string') continue
    if (value.length === 0) continue
    return value
  }

  return null
}

function pickHighestSeverity(statuses: ToolingWorkflowStatus[]): ToolingWorkflowStatus {
  let best = statuses[0]

  for (const status of statuses) {
    const isBetter = SEVERITY_ORDER[status.severity] > SEVERITY_ORDER[best.severity]
    if (!isBetter) continue
    best = status
  }

  return best
}

function summarize(status: ToolingWorkflowStatus): AssetBottleneckSummary {
  return {
    stage: status.dominantStage,
    reason: status.bottleneckReason,
    severity: status.severity,
    toolingNumber: status.toolingNumber
  }
}
