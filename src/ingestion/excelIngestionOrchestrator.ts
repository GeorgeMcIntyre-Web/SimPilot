/**
 * EXCEL INGESTION ORCHESTRATOR
 *
 * Top-level orchestration module that coordinates:
 * - Loading primary assets (Robotlists, Simulation_Status, etc.)
 * - Loading reuse lists (INTERNAL + DesignOS)
 * - Attaching reuse information to assets
 * - Producing final canonical asset collection
 *
 * Part of Phase 3: Integration Layer
 */

import * as path from 'path';
import type { ReuseAllocationStatus } from './excelIngestionTypes';
import {
  loadAllReuseLists,
  summarizeReuseRecords,
  type ReuseRecord
} from './parsers/reuseListCoordinator';
import {
  attachReuseToAssets,
  calculateLinkingStats,
  type ReuseLinkResult,
  type SimplifiedAsset
} from './parsers/reuseLinker';
import { parseToolListWorkbook } from './parsers/toolingListParser';
import type { ToolingItem } from '../domain/toolingTypes';

export type FullIngestionResult = {
  assets: SimplifiedAsset[];
  toolingItems: ToolingItem[];
  reuseSummary: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<ReuseAllocationStatus, number>;
    unmatchedReuseCount: number;
  };
  linkingStats: {
    totalAssets: number;
    assetsWithReuseInfo: number;
    matchedReuseRecords: number;
    unmatchedReuseRecords: number;
  };
  errors: string[];
};

export type IngestionOptions = {
  dataRoot: string;
  loadPrimaryAssets?: boolean; // Default true
  loadToolingData?: boolean; // Default true
  loadReuseLists?: boolean; // Default true
  attachReuseInfo?: boolean; // Default true
};

/**
 * Ingest all Excel data including primary assets, tooling, and reuse lists
 *
 * Orchestrates the complete ingestion pipeline:
 * 1. Load primary assets (if enabled)
 * 2. Load tooling data (if enabled)
 * 3. Load reuse lists (if enabled)
 * 4. Attach reuse info to assets (if enabled)
 * 5. Return consolidated result with summary stats
 */
export async function ingestAllExcelData(
  options: IngestionOptions
): Promise<FullIngestionResult> {
  const errors: string[] = [];

  // Set defaults
  const loadPrimaryAssets = options.loadPrimaryAssets ?? true;
  const loadToolingData = options.loadToolingData ?? true;
  const loadReuseLists = options.loadReuseLists ?? true;
  const attachReuseInfo = options.attachReuseInfo ?? true;

  // Step 1: Load primary assets
  const primaryAssets = loadPrimaryAssets
    ? await loadPrimaryAssetsFromWorkbooks(options.dataRoot, errors)
    : [];

  // Step 2: Load tooling data
  const toolingItems = loadToolingData
    ? await loadToolingDataFromWorkbooks(options.dataRoot, errors)
    : [];

  // Step 3: Load reuse lists
  let reuseRecords: ReuseRecord[] = [];

  if (loadReuseLists) {
    const reuseResult = await loadAllReuseLists({ dataRoot: options.dataRoot });
    reuseRecords = reuseResult.records;

    if (reuseResult.errors.length > 0) {
      errors.push(...reuseResult.errors);
    }
  }

  // Step 4: Attach reuse info to assets
  let finalAssets = primaryAssets;
  let linkingResult: ReuseLinkResult = {
    updatedAssets: primaryAssets,
    unmatchedReuseRecords: reuseRecords
  };

  if (attachReuseInfo && reuseRecords.length > 0) {
    linkingResult = attachReuseToAssets(primaryAssets, reuseRecords);
    finalAssets = linkingResult.updatedAssets;
  }

  // Step 5: Compute summaries
  const reuseSummary = summarizeReuseRecords(reuseRecords);
  const linkingStats = calculateLinkingStats(linkingResult);

  return {
    assets: finalAssets,
    toolingItems,
    reuseSummary: {
      ...reuseSummary,
      unmatchedReuseCount: linkingResult.unmatchedReuseRecords.length
    },
    linkingStats,
    errors
  };
}

/**
 * Load primary assets from known workbooks
 *
 * NOTE: This is a placeholder that demonstrates the structure.
 * In a real implementation, this would call existing parsers for:
 * - ROBOTLIST workbooks
 * - SIMULATION_STATUS workbooks
 * - etc.
 */
async function loadPrimaryAssetsFromWorkbooks(
  _dataRoot: string,
  _errors: string[]
): Promise<SimplifiedAsset[]> {
  const assets: SimplifiedAsset[] = [];

  // TODO: Wire in existing primary asset parsers
  // For now, return empty array to allow reuse list testing

  // Example of what this would look like:
  // const robotListResult = await parseRobotList(path.join(dataRoot, '03_Simulation/01_Equipment_List/ROBOTLIST.xlsx'));
  // assets.push(...robotListResult.assets);
  // errors.push(...robotListResult.warnings);

  return assets;
}

/**
 * Load tooling data from Tool List workbooks
 *
 * Searches for Tool List workbooks in the dataRoot and parses them.
 * Common patterns:
 * - STLA_S_ZAR Tool List.xlsx
 * - TOOL_LIST.xlsx
 * - Tooling.xlsx
 */
async function loadToolingDataFromWorkbooks(
  dataRoot: string,
  errors: string[]
): Promise<ToolingItem[]> {
  const toolingItems: ToolingItem[] = [];

  // Guard: validate dataRoot
  if (dataRoot.trim().length === 0) {
    errors.push('Cannot load tooling data: dataRoot is empty');
    return toolingItems;
  }

  // Common tooling file patterns
  const toolingFilePatterns = [
    'STLA_S_ZAR Tool List.xlsx',
    'TOOL_LIST.xlsx',
    'Tool List.xlsx',
    'Tooling.xlsx'
  ];

  // Try each pattern
  for (const pattern of toolingFilePatterns) {
    const filePath = path.join(dataRoot, pattern);

    try {
      const fs = await import('fs');
      const fileExists = fs.existsSync(filePath);

      if (fileExists === false) {
        continue;
      }

      // Parse the workbook
      const parseResult = await parseToolListWorkbook(filePath);
      toolingItems.push(...parseResult.items);

      if (parseResult.warnings.length > 0) {
        errors.push(...parseResult.warnings.map(w => `[${parseResult.workbookName}] ${w}`));
      }

      // Successfully loaded this file, don't try other patterns
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to load tooling from ${pattern}: ${message}`);
    }
  }

  return toolingItems;
}

/**
 * Validate ingestion result for data quality
 */
export function validateIngestionResult(result: FullIngestionResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for high unmatched reuse count
  const unmatchedRatio = result.reuseSummary.unmatchedReuseCount / result.reuseSummary.total;

  if (unmatchedRatio > 0.5) {
    warnings.push(
      `High unmatched reuse count: ${result.reuseSummary.unmatchedReuseCount} / ${result.reuseSummary.total} (${(unmatchedRatio * 100).toFixed(1)}%)`
    );
  }

  // Check for assets without reuse info when reuse records exist
  if (result.reuseSummary.total > 0) {
    const assetsWithoutReuse = result.linkingStats.totalAssets - result.linkingStats.assetsWithReuseInfo;

    if (assetsWithoutReuse > 0) {
      const ratio = assetsWithoutReuse / result.linkingStats.totalAssets;

      if (ratio > 0.8) {
        warnings.push(
          `Most assets lack reuse info: ${assetsWithoutReuse} / ${result.linkingStats.totalAssets} (${(ratio * 100).toFixed(1)}%)`
        );
      }
    }
  }

  // Check for unknown allocation statuses
  const unknownCount = result.reuseSummary.byStatus.UNKNOWN || 0;

  if (unknownCount > 0) {
    const ratio = unknownCount / result.reuseSummary.total;

    if (ratio > 0.3) {
      warnings.push(
        `High UNKNOWN allocation status: ${unknownCount} / ${result.reuseSummary.total} (${(ratio * 100).toFixed(1)}%)`
      );
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Format ingestion result for display
 */
export function formatIngestionSummary(result: FullIngestionResult): string {
  const lines: string[] = [];

  lines.push('=== Excel Ingestion Summary ===');
  lines.push('');

  // Assets summary
  lines.push(`Total Assets: ${result.linkingStats.totalAssets}`);
  lines.push(`Assets with Reuse Info: ${result.linkingStats.assetsWithReuseInfo}`);
  lines.push('');

  // Reuse summary
  lines.push(`Total Reuse Records: ${result.reuseSummary.total}`);
  lines.push('');

  lines.push('By Type:');
  for (const [type, count] of Object.entries(result.reuseSummary.byType)) {
    lines.push(`  ${type}: ${count}`);
  }
  lines.push('');

  lines.push('By Status:');
  for (const [status, count] of Object.entries(result.reuseSummary.byStatus)) {
    if (count > 0) {
      lines.push(`  ${status}: ${count}`);
    }
  }
  lines.push('');

  // Linking stats
  lines.push('Linking Statistics:');
  lines.push(`  Matched: ${result.linkingStats.matchedReuseRecords}`);
  lines.push(`  Unmatched: ${result.linkingStats.unmatchedReuseRecords}`);
  lines.push('');

  // Errors
  if (result.errors.length > 0) {
    lines.push(`Errors/Warnings: ${result.errors.length}`);
    lines.push('');

    for (const error of result.errors.slice(0, 10)) {
      lines.push(`  - ${error}`);
    }

    if (result.errors.length > 10) {
      lines.push(`  ... and ${result.errors.length - 10} more`);
    }
  }

  return lines.join('\n');
}
