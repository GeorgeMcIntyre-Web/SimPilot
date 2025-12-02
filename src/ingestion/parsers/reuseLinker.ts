/**
 * REUSE LINKER
 *
 * Cross-workbook linking module that:
 * - Matches ReuseRecords to primary assets (robots, guns, risers, etc.)
 * - Attaches reuse allocation info to assets
 * - Tracks unmatched reuse records for debugging
 *
 * Part of Phase 3: Cross-Workbook Linking
 */

import type { ReuseRecord } from './reuseListCoordinator';
import { isReuseTargetMatch } from '../excelIngestionTypes';

// Simplified asset interface for linking
export interface SimplifiedAsset {
  project?: string | null;
  line?: string | null;
  station?: string | null;
  robotNumber?: string | null;
  gunId?: string | null;
  partNumber?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  detailedKind?: string;
  tags?: string[];
}

export type ReuseLinkResult = {
  updatedAssets: SimplifiedAsset[];
  unmatchedReuseRecords: ReuseRecord[];
};

export type LinkingStats = {
  totalAssets: number;
  assetsWithReuseInfo: number;
  totalReuseRecords: number;
  matchedReuseRecords: number;
  unmatchedReuseRecords: number;
};

/**
 * Attach reuse information to primary assets
 *
 * For each ReuseRecord, attempts to find matching assets using isReuseTargetMatch.
 * Updates matched assets with reuse allocation info and provenance.
 */
export function attachReuseToAssets(
  assets: SimplifiedAsset[],
  reuseRecords: ReuseRecord[]
): ReuseLinkResult {
  const unmatchedReuseRecords: ReuseRecord[] = [];
  const assetMatches = new Map<string, ReuseRecord[]>();

  // Build asset index for efficient matching
  const assetIndex = buildAssetIndex(assets);

  // Attempt to match each reuse record
  for (const reuseRecord of reuseRecords) {
    const matchedAssetKey = findMatchingAsset(reuseRecord, assetIndex);

    if (matchedAssetKey === null) {
      unmatchedReuseRecords.push(reuseRecord);
      continue;
    }

    // Track matches for this asset
    const existingMatches = assetMatches.get(matchedAssetKey) || [];
    assetMatches.set(matchedAssetKey, [...existingMatches, reuseRecord]);
  }

  // Update assets with reuse info
  const updatedAssets = assets.map(asset => {
    const assetKey = buildAssetKey(asset);
    const matches = assetMatches.get(assetKey);

    if (matches === undefined || matches.length === 0) {
      return asset;
    }

    // Apply best match (handle ambiguity)
    const bestMatch = selectBestMatch(matches, asset);
    return applyReuseInfoToAsset(asset, bestMatch);
  });

  return {
    updatedAssets,
    unmatchedReuseRecords
  };
}

/**
 * Build an index of assets for efficient matching
 */
type AssetIndexEntry = {
  key: string;
  asset: SimplifiedAsset;
};

function buildAssetIndex(assets: SimplifiedAsset[]): AssetIndexEntry[] {
  return assets.map(asset => ({
    key: buildAssetKey(asset),
    asset
  }));
}

/**
 * Build a key for asset matching
 */
function buildAssetKey(asset: SimplifiedAsset): string {
  const parts: string[] = [];

  if (asset.project) {
    parts.push(`proj:${asset.project}`);
  }

  if (asset.line) {
    parts.push(`line:${asset.line}`);
  }

  if (asset.station) {
    parts.push(`sta:${asset.station}`);
  }

  if (asset.robotNumber) {
    parts.push(`rob:${asset.robotNumber}`);
  }

  if (asset.gunId) {
    parts.push(`gun:${asset.gunId}`);
  }

  if (asset.partNumber) {
    parts.push(`pn:${asset.partNumber}`);
  }

  // Fallback if insufficient identifying info
  if (parts.length === 0) {
    parts.push(`unknown`);
  }

  return parts.join('|');
}

/**
 * Find matching asset for a reuse record
 * Returns asset key if match found, null otherwise
 */
function findMatchingAsset(
  reuseRecord: ReuseRecord,
  assetIndex: AssetIndexEntry[]
): string | null {
  // Skip invalid reuse records
  if (isInvalidReuseRecord(reuseRecord)) {
    return null;
  }

  // Try exact matches first
  for (const entry of assetIndex) {
    const matchResult = attemptMatch(reuseRecord, entry.asset);

    if (matchResult.score >= 3) {
      // High confidence match
      return entry.key;
    }
  }

  // Try fuzzy matches
  let bestMatch: { key: string; score: number } | null = null;

  for (const entry of assetIndex) {
    const matchResult = attemptMatch(reuseRecord, entry.asset);

    if (matchResult.score > 0) {
      if (bestMatch === null || matchResult.score > bestMatch.score) {
        bestMatch = { key: entry.key, score: matchResult.score };
      }
    }
  }

  if (bestMatch !== null && bestMatch.score >= 2) {
    // Acceptable fuzzy match
    return bestMatch.key;
  }

  return null;
}

/**
 * Check if reuse record is invalid for matching
 */
function isInvalidReuseRecord(reuseRecord: ReuseRecord): boolean {
  const hasTargetInfo = Boolean(
    reuseRecord.targetProject ||
    reuseRecord.targetLine ||
    reuseRecord.targetStation
  );

  const hasOldInfo = Boolean(
    reuseRecord.oldProject ||
    reuseRecord.oldLine ||
    reuseRecord.oldStation
  );

  // Need at least some location info
  if (hasTargetInfo === false && hasOldInfo === false) {
    return true;
  }

  return false;
}

/**
 * Attempt to match a reuse record to an asset
 * Returns score indicating match quality (higher = better)
 */
function attemptMatch(
  reuseRecord: ReuseRecord,
  asset: SimplifiedAsset
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Use isReuseTargetMatch helper for core matching logic
  const targetMatches = isReuseTargetMatch(
    {
      targetLine: reuseRecord.targetLine,
      targetStation: reuseRecord.targetStation
    },
    {
      assemblyLine: asset.line,
      station: asset.station
    }
  );

  if (targetMatches) {
    score += 2;
    reasons.push('target-location-match');
  }

  // Match by equipment type
  if (matchesEquipmentType(reuseRecord, asset)) {
    score += 1;
    reasons.push('equipment-type-match');
  }

  // Match by identifiers
  if (reuseRecord.partNumber !== null && asset.partNumber === reuseRecord.partNumber) {
    score += 2;
    reasons.push('part-number-match');
  }

  if (reuseRecord.serialNumber !== null && asset.serialNumber === reuseRecord.serialNumber) {
    score += 2;
    reasons.push('serial-number-match');
  }

  if (reuseRecord.gunId !== null && asset.gunId === reuseRecord.gunId) {
    score += 2;
    reasons.push('gun-id-match');
  }

  if (reuseRecord.model !== null && asset.model === reuseRecord.model) {
    score += 1;
    reasons.push('model-match');
  }

  return { score, reasons };
}

/**
 * Check if reuse record matches asset equipment type
 */
function matchesEquipmentType(
  reuseRecord: ReuseRecord,
  asset: SimplifiedAsset
): boolean {
  if (asset.detailedKind === undefined) {
    return false;
  }

  if (reuseRecord.assetType === 'Riser' && asset.detailedKind === 'Riser') {
    return true;
  }

  if (reuseRecord.assetType === 'TipDresser' && asset.detailedKind === 'TipDresser') {
    return true;
  }

  if (reuseRecord.assetType === 'TMSGun' && (asset.detailedKind === 'TMSGun' || asset.detailedKind === 'WeldGun')) {
    return true;
  }

  return false;
}

/**
 * Select best match when multiple reuse records match same asset
 */
function selectBestMatch(
  matches: ReuseRecord[],
  asset: SimplifiedAsset
): ReuseRecord {
  if (matches.length === 1) {
    return matches[0];
  }

  // Prefer INTERNAL source over DesignOS
  const internalMatches = matches.filter(m => m.source === 'INTERNAL');

  if (internalMatches.length > 0) {
    return selectHighestScoreMatch(internalMatches, asset);
  }

  return selectHighestScoreMatch(matches, asset);
}

/**
 * Select match with highest score
 */
function selectHighestScoreMatch(
  matches: ReuseRecord[],
  asset: SimplifiedAsset
): ReuseRecord {
  let bestMatch = matches[0];
  let bestScore = attemptMatch(bestMatch, asset).score;

  for (const match of matches.slice(1)) {
    const score = attemptMatch(match, asset).score;

    if (score > bestScore) {
      bestMatch = match;
      bestScore = score;
    }
  }

  return bestMatch;
}

/**
 * Apply reuse information to an asset
 */
function applyReuseInfoToAsset(
  asset: SimplifiedAsset,
  reuseRecord: ReuseRecord
): SimplifiedAsset {
  const updatedAsset: SimplifiedAsset = {
    ...asset,

    // Copy technical identifiers if missing
    partNumber: asset.partNumber || reuseRecord.partNumber || undefined,
    model: asset.model || reuseRecord.model || undefined,
    serialNumber: asset.serialNumber || reuseRecord.serialNumber || undefined,

    // Add provenance tags
    tags: [
      ...(asset.tags || []),
      `reuse:${reuseRecord.source}`,
      `reuse-status:${reuseRecord.allocationStatus}`,
      `reuse-wb:${reuseRecord.workbookId}:${reuseRecord.sheetName}:${reuseRecord.rowIndex}`
    ]
  };

  return updatedAsset;
}

/**
 * Calculate linking statistics for debugging
 */
export function calculateLinkingStats(result: ReuseLinkResult): LinkingStats {
  const assetsWithReuseInfo = result.updatedAssets.filter(
    asset => asset.tags?.some(tag => tag.startsWith('reuse:'))
  ).length;

  return {
    totalAssets: result.updatedAssets.length,
    assetsWithReuseInfo,
    totalReuseRecords: result.updatedAssets.length + result.unmatchedReuseRecords.length,
    matchedReuseRecords: assetsWithReuseInfo,
    unmatchedReuseRecords: result.unmatchedReuseRecords.length
  };
}
