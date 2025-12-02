/**
 * WORKFLOW BOTTLENECK LINKER
 *
 * Generic bottleneck analysis engine that works across all workflow item kinds.
 * Analyzes DESIGN → SIMULATION → MANUFACTURE pipeline and identifies blockers.
 *
 * This is the core bottleneck detection logic that replaces tooling-specific analysis.
 */

import type {
  WorkflowItem,
  WorkflowBottleneckStatus,
  WorkflowBottleneckReason,
  WorkflowStage,
  BottleneckSeverity,
  StageStatusSnapshot
} from './workflowTypes'
import { resolveSeverityFromReason } from './workflowTypes'

/**
 * Analyze a collection of workflow items and produce bottleneck statuses
 */
export function analyzeWorkflowBottlenecks(
  workflowItems: WorkflowItem[]
): WorkflowBottleneckStatus[] {
  return workflowItems.map(item => analyzeWorkflowItem(item))
}

/**
 * Analyze a single workflow item and determine its bottleneck status
 */
export function analyzeWorkflowItem(item: WorkflowItem): WorkflowBottleneckStatus {
  const { dominantStage, bottleneckReason } = computeBottleneck(item)
  const severity = resolveSeverityFromReason(bottleneckReason)
  const severityScore = computeSeverityScore(item, dominantStage, severity)

  return {
    workflowItemId: item.id,
    kind: item.kind,
    simulationContextKey: item.simulationContextKey,
    itemNumber: item.itemNumber,
    dominantStage,
    bottleneckReason,
    severity,
    severityScore,
    blockingItemIds: [], // Will be populated when dependency tracking is implemented
    designStage: item.designStageStatus,
    simulationStage: item.simulationStageStatus,
    manufactureStage: item.manufactureStageStatus,
    workflowItem: item
  }
}

/**
 * Compute dominant stage and bottleneck reason for a workflow item
 */
function computeBottleneck(item: WorkflowItem): {
  dominantStage: WorkflowStage
  bottleneckReason: WorkflowBottleneckReason
} {
  const designStatus = item.designStageStatus.status
  const simStatus = item.simulationStageStatus.status
  const mfgStatus = item.manufactureStageStatus.status

  // Rule 1: Design blocked
  if (designStatus === 'BLOCKED') {
    return {
      dominantStage: 'DESIGN',
      bottleneckReason: 'DESIGN_BLOCKED'
    }
  }

  // Rule 2: Design not started or incomplete
  if (isStageIncomplete(item.designStageStatus)) {
    if (simStatus === 'NOT_STARTED' || simStatus === 'UNKNOWN') {
      return {
        dominantStage: 'DESIGN',
        bottleneckReason: 'DESIGN_NOT_DETAILED'
      }
    }
  }

  // Rule 3: Simulation blocked
  if (simStatus === 'BLOCKED') {
    return {
      dominantStage: 'SIMULATION',
      bottleneckReason: 'SIM_BLOCKED'
    }
  }

  // Rule 4: Simulation changes requested / rejected
  if (simStatus === 'CHANGES_REQUESTED') {
    return {
      dominantStage: 'SIMULATION',
      bottleneckReason: 'SIM_CHANGES_REQUESTED'
    }
  }

  // Rule 5: Design complete but simulation not started
  if (isStageComplete(item.designStageStatus) || isStageApproved(item.designStageStatus)) {
    if (simStatus === 'NOT_STARTED' || simStatus === 'UNKNOWN') {
      return {
        dominantStage: 'SIMULATION',
        bottleneckReason: 'SIM_NOT_STARTED'
      }
    }
  }

  // Rule 6: Design complete but simulation lagging
  if (isStageComplete(item.designStageStatus) || isStageApproved(item.designStageStatus)) {
    if (simStatus === 'IN_PROGRESS') {
      const simProgress = item.simulationStageStatus.percentComplete ?? 0
      if (simProgress < 25) {
        return {
          dominantStage: 'SIMULATION',
          bottleneckReason: 'SIM_BEHIND_DESIGN'
        }
      }
    }
  }

  // Rule 7: Manufacturing started but simulation not approved
  if (mfgStatus === 'IN_PROGRESS' || mfgStatus === 'COMPLETE') {
    if (simStatus !== 'APPROVED' && simStatus !== 'COMPLETE') {
      return {
        dominantStage: 'DESIGN',
        bottleneckReason: 'BUILD_AHEAD_OF_SIM'
      }
    }
  }

  // Rule 8: Simulation approved but missing physical assets
  if (isStageApproved(item.simulationStageStatus) || isStageComplete(item.simulationStageStatus)) {
    if (item.hasAssets === false) {
      return {
        dominantStage: 'MANUFACTURE',
        bottleneckReason: 'MISSING_ASSETS'
      }
    }
  }

  // Rule 9: Has assets but missing reuse plan
  if (isStageApproved(item.simulationStageStatus) || isStageComplete(item.simulationStageStatus)) {
    if (item.hasAssets === true && item.isReuse !== true) {
      // Only flag if this should be a reuse item but isn't planned
      const hasReuseMetadata = item.metadata?.reusePlanned === true
      if (hasReuseMetadata === false) {
        return {
          dominantStage: 'MANUFACTURE',
          bottleneckReason: 'MISSING_REUSE'
        }
      }
    }
  }

  // Rule 10: External supplier delay
  if (item.externalSupplierName !== undefined && item.externalSupplierName !== null) {
    if (mfgStatus === 'IN_PROGRESS' || mfgStatus === 'BLOCKED') {
      const mfgProgress = item.manufactureStageStatus.percentComplete ?? 0
      if (mfgProgress < 50) {
        return {
          dominantStage: 'EXTERNAL_SUPPLIER',
          bottleneckReason: 'SUPPLIER_DELAY'
        }
      }
    }
  }

  // Rule 11: Manufacturing constraint
  if (mfgStatus === 'BLOCKED') {
    return {
      dominantStage: 'MANUFACTURE',
      bottleneckReason: 'MANUFACTURE_CONSTRAINT'
    }
  }

  // Rule 12: Everything looks good
  if (isStageComplete(item.designStageStatus) &&
      (isStageComplete(item.simulationStageStatus) || isStageApproved(item.simulationStageStatus)) &&
      isStageComplete(item.manufactureStageStatus)) {
    return {
      dominantStage: 'MANUFACTURE',
      bottleneckReason: 'OK'
    }
  }

  // Default: unknown
  return {
    dominantStage: 'UNKNOWN',
    bottleneckReason: 'UNKNOWN'
  }
}

/**
 * Check if a stage is incomplete
 */
function isStageIncomplete(stage: StageStatusSnapshot): boolean {
  if (stage.status === 'NOT_STARTED') return true
  if (stage.status === 'UNKNOWN') return true

  if (stage.status === 'IN_PROGRESS') {
    const progress = stage.percentComplete ?? 0
    if (progress < 75) return true
  }

  return false
}

/**
 * Check if a stage is complete
 */
function isStageComplete(stage: StageStatusSnapshot): boolean {
  if (stage.status === 'COMPLETE') return true

  if (stage.status === 'IN_PROGRESS') {
    const progress = stage.percentComplete ?? 0
    if (progress >= 100) return true
  }

  return false
}

/**
 * Check if a stage is approved
 */
function isStageApproved(stage: StageStatusSnapshot): boolean {
  if (stage.status === 'APPROVED') return true
  return isStageComplete(stage)
}

/**
 * Compute severity score (0-120, higher = worse)
 */
function computeSeverityScore(
  item: WorkflowItem,
  dominantStage: WorkflowStage,
  severity: BottleneckSeverity
): number {
  const stageSnapshot = getStageSnapshot(item, dominantStage)
  const completion = stageSnapshot?.percentComplete ?? 0
  const sanitized = typeof completion === 'number' ? completion : 0
  const inverted = 100 - Math.min(Math.max(sanitized, 0), 100)

  const severityBoost =
    severity === 'CRITICAL' ? 30 :
    severity === 'HIGH' ? 20 :
    severity === 'MEDIUM' ? 10 :
    0

  return Math.min(130, inverted + severityBoost)
}

/**
 * Get the stage snapshot for a given stage
 */
function getStageSnapshot(
  item: WorkflowItem,
  stage: WorkflowStage
): StageStatusSnapshot | undefined {
  if (stage === 'DESIGN') return item.designStageStatus
  if (stage === 'SIMULATION') return item.simulationStageStatus
  if (stage === 'MANUFACTURE') return item.manufactureStageStatus
  return undefined
}

/**
 * Get worst bottlenecks sorted by severity
 */
export function getWorstBottlenecks(
  bottlenecks: WorkflowBottleneckStatus[],
  limit?: number
): WorkflowBottleneckStatus[] {
  const sorted = [...bottlenecks].sort((a, b) => {
    return b.severityScore - a.severityScore
  })

  if (limit === undefined) return sorted
  return sorted.slice(0, limit)
}

/**
 * Filter bottlenecks by simulation context key
 */
export function getBottlenecksByContextKey(
  bottlenecks: WorkflowBottleneckStatus[],
  contextKey: string
): WorkflowBottleneckStatus[] {
  return bottlenecks.filter(b => b.simulationContextKey === contextKey)
}

/**
 * Get bottleneck statistics
 */
export function getBottleneckStats(bottlenecks: WorkflowBottleneckStatus[]): {
  total: number
  bySeverity: Record<BottleneckSeverity, number>
  byStage: Record<WorkflowStage, number>
  byReason: Record<WorkflowBottleneckReason, number>
} {
  const bySeverity: Record<string, number> = {}
  const byStage: Record<string, number> = {}
  const byReason: Record<string, number> = {}

  for (const bottleneck of bottlenecks) {
    bySeverity[bottleneck.severity] = (bySeverity[bottleneck.severity] ?? 0) + 1
    byStage[bottleneck.dominantStage] = (byStage[bottleneck.dominantStage] ?? 0) + 1
    byReason[bottleneck.bottleneckReason] = (byReason[bottleneck.bottleneckReason] ?? 0) + 1
  }

  return {
    total: bottlenecks.length,
    bySeverity: bySeverity as Record<BottleneckSeverity, number>,
    byStage: byStage as Record<WorkflowStage, number>,
    byReason: byReason as Record<WorkflowBottleneckReason, number>
  }
}
