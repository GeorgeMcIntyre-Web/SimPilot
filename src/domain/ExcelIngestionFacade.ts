/**
 * EXCEL INGESTION FACADE
 *
 * Stable public API for Excel data ingestion.
 * Provides a single entry point for consuming the orchestrator with a clean contract.
 *
 * This facade is the interface that downstream agents will depend on.
 */

import {
  ingestAllExcelData,
  type FullIngestionResult,
  type IngestionOptions
} from '../ingestion/excelIngestionOrchestrator';
import type { ReuseAllocationStatus } from '../ingestion/excelIngestionTypes';
import type { SimplifiedAsset } from '../ingestion/parsers/reuseLinker';
import {
  type BottleneckSnapshot,
  type ToolingSnapshot,
  createEmptyBottleneckSnapshot
} from './toolingTypes';
import {
  type WorkflowSnapshot,
  type WorkflowBottleneckSnapshot,
  type WorkflowItem,
  type WorkflowBottleneckStatus
} from './workflowTypes';
import { toolingItemToWorkflowItem } from './workflowMappers';
import { analyzeWorkflowBottlenecks } from './workflowBottleneckLinker';
import { buildToolingSnapshot } from './toolingSnapshotBuilder';

/**
 * Stable snapshot of all SimPilot data loaded from Excel workbooks
 */
export type SimPilotDataSnapshot = {
  /** All assets (robots, guns, tools, etc.) with linked reuse info */
  assets: SimplifiedAsset[];

  /** Summary of reuse records and allocation status */
  reuseSummary: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<ReuseAllocationStatus, number>;
    unmatchedReuseCount: number;
  };

  /** Statistics about the linking process */
  linkingStats: {
    totalAssets: number;
    assetsWithReuseInfo: number;
    matchedReuseRecords: number;
    unmatchedReuseRecords: number;
  };

  /** Errors encountered during ingestion (non-fatal) */
  errors: string[];

  /** Tooling catalog snapshot (legacy) */
  toolingSnapshot: ToolingSnapshot;

  /** Tooling bottleneck snapshot (legacy) */
  bottleneckSnapshot: BottleneckSnapshot;

  /** Generic workflow items (all asset kinds) */
  workflowSnapshot: WorkflowSnapshot;

  /** Generic workflow bottleneck analysis */
  workflowBottleneckSnapshot: WorkflowBottleneckSnapshot;
};

/**
 * Configuration options for data ingestion
 */
export type DataIngestionConfig = {
  /** Root directory containing Excel workbooks */
  dataRoot: string;

  /** Load primary assets (default: true) */
  loadPrimaryAssets?: boolean;

  /** Load reuse lists (default: true) */
  loadReuseLists?: boolean;

  /** Attach reuse info to assets (default: true) */
  attachReuseInfo?: boolean;
};

/**
 * Load complete SimPilot data snapshot from Excel workbooks
 *
 * This is the primary entry point for Excel data ingestion.
 * Use this function to load all project data with reuse allocation tracking.
 *
 * @param config - Data ingestion configuration
 * @returns Complete data snapshot with assets, reuse info, and statistics
 * @throws Error if dataRoot is empty or invalid
 *
 * @example
 * ```ts
 * const snapshot = await loadSimPilotDataSnapshot({
 *   dataRoot: 'C:/SimPilot_Data'
 * });
 *
 * console.log(`Loaded ${snapshot.assets.length} assets`);
 * console.log(`Reuse pool: ${snapshot.reuseSummary.total} items`);
 * ```
 */
export async function loadSimPilotDataSnapshot(
  config: DataIngestionConfig
): Promise<SimPilotDataSnapshot> {
  // Guard: validate dataRoot
  if (config.dataRoot.trim().length === 0) {
    throw new Error('dataRoot cannot be empty');
  }

  // Map to orchestrator options
  const options: IngestionOptions = {
    dataRoot: config.dataRoot,
    loadPrimaryAssets: config.loadPrimaryAssets,
    loadReuseLists: config.loadReuseLists,
    attachReuseInfo: config.attachReuseInfo
  };

  // Execute ingestion pipeline
  const result: FullIngestionResult = await ingestAllExcelData(options);

  // PHASE 3: Build tooling snapshots from real tooling data
  const toolingSnapshot = buildToolingSnapshot(result.toolingItems);

  // Legacy bottleneck snapshot (empty for now, as we're using generic workflow engine)
  const bottleneckSnapshot = createEmptyBottleneckSnapshot();

  // PHASE 3: Build workflow snapshots from real tooling data
  const workflowSnapshot = buildWorkflowSnapshotFromTooling(toolingSnapshot);
  const workflowBottleneckSnapshot = buildWorkflowBottleneckSnapshotFromWorkflow(workflowSnapshot);

  // Map to stable facade types
  return {
    assets: result.assets,
    reuseSummary: {
      total: result.reuseSummary.total,
      byType: result.reuseSummary.byType,
      byStatus: result.reuseSummary.byStatus,
      unmatchedReuseCount: result.reuseSummary.unmatchedReuseCount
    },
    linkingStats: {
      totalAssets: result.linkingStats.totalAssets,
      assetsWithReuseInfo: result.linkingStats.assetsWithReuseInfo,
      matchedReuseRecords: result.linkingStats.matchedReuseRecords,
      unmatchedReuseRecords: result.linkingStats.unmatchedReuseRecords
    },
    errors: result.errors,
    toolingSnapshot,
    bottleneckSnapshot,
    workflowSnapshot,
    workflowBottleneckSnapshot
  };
}

/**
 * PHASE 3: Build workflow snapshot from tooling snapshot
 *
 * Converts tooling-specific items to generic WorkflowItem[]
 */
function buildWorkflowSnapshotFromTooling(toolingSnapshot: ToolingSnapshot): WorkflowSnapshot {
  const workflowItems: WorkflowItem[] = toolingSnapshot.items.map(toolingItemToWorkflowItem)

  return {
    generatedAt: toolingSnapshot.updatedAt,
    items: workflowItems
  }
}

/**
 * PHASE 3: Build workflow bottleneck snapshot from workflow snapshot
 *
 * Analyzes workflow items using the generic bottleneck engine
 */
function buildWorkflowBottleneckSnapshotFromWorkflow(
  workflowSnapshot: WorkflowSnapshot
): WorkflowBottleneckSnapshot {
  const bottlenecks: WorkflowBottleneckStatus[] = analyzeWorkflowBottlenecks(workflowSnapshot.items)

  return {
    generatedAt: workflowSnapshot.generatedAt,
    bottlenecks
  }
}

/**
 * Re-export stable types for convenience
 */
export type {
  SimplifiedAsset,
  ReuseAllocationStatus,
  ToolingSnapshot,
  BottleneckSnapshot,
  WorkflowSnapshot,
  WorkflowBottleneckSnapshot
};
