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
  createEmptyBottleneckSnapshot,
  createEmptyToolingSnapshot
} from './toolingTypes';

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

  /** Tooling catalog snapshot */
  toolingSnapshot: ToolingSnapshot;

  /** Tooling bottleneck snapshot */
  bottleneckSnapshot: BottleneckSnapshot;
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
    toolingSnapshot: createEmptyToolingSnapshot(),
    bottleneckSnapshot: createEmptyBottleneckSnapshot()
  };
}

/**
 * Re-export stable types for convenience
 */
export type {
  SimplifiedAsset,
  ReuseAllocationStatus,
  ToolingSnapshot,
  BottleneckSnapshot
};
