/**
 * Unit tests for reuseLinker
 */

import { describe, it, expect } from 'vitest';
import {
  attachReuseToAssets,
  calculateLinkingStats,
  type ReuseLinkResult
} from '../reuseLinker';
import type { ExcelIngestedAsset, ReuseAllocationStatus } from '../../excelIngestionTypes';
import type { ReuseRecord } from '../reuseListCoordinator';

describe('reuseLinker', () => {
  describe('attachReuseToAssets', () => {
    it('should match reuse record to asset by target location', () => {
      const assets: ExcelIngestedAsset[] = [
        createMockAsset({
          project: 'PROJ_A',
          line: 'LINE_1',
          station: 'STA_10',
          equipmentCategory: 'RISER'
        })
      ];

      const reuseRecords: ReuseRecord[] = [
        createMockReuseRecord({
          assetType: 'Riser',
          targetProject: 'PROJ_A',
          targetLine: 'LINE_1',
          targetStation: 'STA_10',
          allocationStatus: 'ALLOCATED'
        })
      ];

      const result = attachReuseToAssets(assets, reuseRecords);

      expect(result.updatedAssets).toHaveLength(1);
      expect(result.unmatchedReuseRecords).toHaveLength(0);

      const updatedAsset = result.updatedAssets[0];
      expect(updatedAsset.sourcing).toBe('REUSE');
      expect(updatedAsset.allocationStatus).toBe('ALLOCATED');
      expect(updatedAsset.tags?.some(t => t.startsWith('reuse:'))).toBe(true);
    });

    it('should match by part number when locations match', () => {
      const assets: ExcelIngestedAsset[] = [
        createMockAsset({
          project: 'PROJ_A',
          line: 'LINE_1',
          station: 'STA_10',
          partNumber: 'PN-12345',
          equipmentCategory: 'RISER'
        })
      ];

      const reuseRecords: ReuseRecord[] = [
        createMockReuseRecord({
          assetType: 'Riser',
          targetProject: 'PROJ_A',
          targetLine: 'LINE_1',
          targetStation: 'STA_10',
          partNumber: 'PN-12345',
          allocationStatus: 'AVAILABLE'
        })
      ];

      const result = attachReuseToAssets(assets, reuseRecords);

      expect(result.updatedAssets).toHaveLength(1);
      expect(result.unmatchedReuseRecords).toHaveLength(0);

      const updatedAsset = result.updatedAssets[0];
      expect(updatedAsset.partNumber).toBe('PN-12345');
      expect(updatedAsset.allocationStatus).toBe('AVAILABLE');
    });

    it('should not match reuse record with wrong equipment type', () => {
      const assets: ExcelIngestedAsset[] = [
        createMockAsset({
          project: 'PROJ_A',
          line: 'LINE_1',
          station: 'STA_10',
          equipmentCategory: 'WELD_GUN'
        })
      ];

      const reuseRecords: ReuseRecord[] = [
        createMockReuseRecord({
          assetType: 'Riser', // Mismatch: gun vs riser
          targetProject: 'PROJ_A',
          targetLine: 'LINE_1',
          targetStation: 'STA_10',
          allocationStatus: 'AVAILABLE'
        })
      ];

      const result = attachReuseToAssets(assets, reuseRecords);

      // Should not match due to type mismatch
      expect(result.unmatchedReuseRecords).toHaveLength(1);

      const asset = result.updatedAssets[0];
      expect(asset.tags?.some(t => t.startsWith('reuse:'))).toBe(false);
    });

    it('should leave unmatched reuse records in unmatchedReuseRecords', () => {
      const assets: ExcelIngestedAsset[] = [
        createMockAsset({
          project: 'PROJ_A',
          line: 'LINE_1',
          station: 'STA_10',
          equipmentCategory: 'RISER'
        })
      ];

      const reuseRecords: ReuseRecord[] = [
        createMockReuseRecord({
          assetType: 'Riser',
          targetProject: 'PROJ_B', // Different project - no match
          targetLine: 'LINE_2',
          targetStation: 'STA_20',
          allocationStatus: 'AVAILABLE'
        })
      ];

      const result = attachReuseToAssets(assets, reuseRecords);

      expect(result.unmatchedReuseRecords).toHaveLength(1);
      expect(result.unmatchedReuseRecords[0].targetProject).toBe('PROJ_B');
    });

    it('should handle assets with no matching reuse records', () => {
      const assets: ExcelIngestedAsset[] = [
        createMockAsset({
          project: 'PROJ_A',
          line: 'LINE_1',
          station: 'STA_10',
          equipmentCategory: 'RISER'
        })
      ];

      const reuseRecords: ReuseRecord[] = [];

      const result = attachReuseToAssets(assets, reuseRecords);

      expect(result.updatedAssets).toHaveLength(1);
      expect(result.unmatchedReuseRecords).toHaveLength(0);

      const asset = result.updatedAssets[0];
      expect(asset.tags?.some(t => t.startsWith('reuse:'))).toBe(false);
    });

    it('should update old location info from reuse record', () => {
      const assets: ExcelIngestedAsset[] = [
        createMockAsset({
          project: 'PROJ_A',
          line: 'LINE_1',
          station: 'STA_10',
          equipmentCategory: 'RISER'
        })
      ];

      const reuseRecords: ReuseRecord[] = [
        createMockReuseRecord({
          assetType: 'Riser',
          targetProject: 'PROJ_A',
          targetLine: 'LINE_1',
          targetStation: 'STA_10',
          oldProject: 'OLD_PROJ',
          oldLine: 'OLD_LINE',
          oldStation: 'OLD_STA',
          allocationStatus: 'IN_USE'
        })
      ];

      const result = attachReuseToAssets(assets, reuseRecords);

      const updatedAsset = result.updatedAssets[0];
      expect(updatedAsset.oldProject).toBe('OLD_PROJ');
      expect(updatedAsset.oldLine).toBe('OLD_LINE');
      expect(updatedAsset.oldStation).toBe('OLD_STA');
    });
  });

  describe('calculateLinkingStats', () => {
    it('should calculate correct stats', () => {
      const result: ReuseLinkResult = {
        updatedAssets: [
          createMockAsset({ tags: ['reuse:INTERNAL'] }),
          createMockAsset({ tags: ['reuse:DESIGNOS'] }),
          createMockAsset({ tags: [] })
        ],
        unmatchedReuseRecords: [
          createMockReuseRecord({ assetType: 'Riser', allocationStatus: 'AVAILABLE' })
        ]
      };

      const stats = calculateLinkingStats(result);

      expect(stats.totalAssets).toBe(3);
      expect(stats.assetsWithReuseInfo).toBe(2);
      expect(stats.matchedReuseRecords).toBe(2);
      expect(stats.unmatchedReuseRecords).toBe(1);
    });

    it('should handle zero assets', () => {
      const result: ReuseLinkResult = {
        updatedAssets: [],
        unmatchedReuseRecords: []
      };

      const stats = calculateLinkingStats(result);

      expect(stats.totalAssets).toBe(0);
      expect(stats.assetsWithReuseInfo).toBe(0);
    });
  });
});

/**
 * Helper to create mock asset
 */
function createMockAsset(
  overrides: Partial<ExcelIngestedAsset> = {}
): ExcelIngestedAsset {
  return {
    workbookId: 'test-wb',
    sheetName: 'Sheet1',
    rowIndex: 1,
    project: 'TEST_PROJ',
    line: 'LINE_1',
    station: 'STA_10',
    equipmentCategory: 'RISER',
    tags: [],
    ...overrides
  };
}

/**
 * Helper to create mock ReuseRecord
 */
function createMockReuseRecord(
  overrides: Partial<ReuseRecord> = {}
): ReuseRecord {
  return {
    id: `mock-${Math.random()}`,
    assetType: 'Riser',
    allocationStatus: 'AVAILABLE',
    oldProject: 'OLD_PROJ',
    oldLine: 'LINE_1',
    oldStation: 'STA_10',
    targetProject: 'NEW_PROJ',
    targetLine: 'LINE_2',
    targetStation: 'STA_20',
    partNumber: null,
    model: null,
    serialNumber: null,
    riserType: null,
    gunId: null,
    tipDresserId: null,
    workbookId: 'test-workbook',
    sheetName: 'Sheet1',
    rowIndex: 1,
    source: 'INTERNAL',
    tags: [],
    ...overrides
  };
}
