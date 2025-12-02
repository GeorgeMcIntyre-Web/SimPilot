/**
 * Integration tests for excelIngestionOrchestrator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ingestAllExcelData,
  validateIngestionResult,
  formatIngestionSummary,
  type FullIngestionResult
} from '../excelIngestionOrchestrator';

// Mock the coordinator and linker
vi.mock('../parsers/reuseListCoordinator', () => ({
  loadAllReuseLists: vi.fn(),
  summarizeReuseRecords: vi.fn()
}));

vi.mock('../parsers/reuseLinker', () => ({
  attachReuseToAssets: vi.fn(),
  calculateLinkingStats: vi.fn()
}));

import { loadAllReuseLists, summarizeReuseRecords } from '../parsers/reuseListCoordinator';
import { attachReuseToAssets, calculateLinkingStats } from '../parsers/reuseLinker';

describe('excelIngestionOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ingestAllExcelData', () => {
    it('should orchestrate full ingestion pipeline', async () => {
      // Mock reuse list loading
      vi.mocked(loadAllReuseLists).mockResolvedValue({
        records: [
          {
            id: 'test-1',
            assetType: 'Riser',
            allocationStatus: 'AVAILABLE',
            oldProject: 'OLD',
            oldLine: 'L1',
            oldStation: 'S1',
            targetProject: 'NEW',
            targetLine: 'L2',
            targetStation: 'S2',
            workbookId: 'wb1',
            sheetName: 'Sheet1',
            rowIndex: 1,
            source: 'INTERNAL',
            tags: []
          }
        ],
        errors: []
      });

      // Mock summarize
      vi.mocked(summarizeReuseRecords).mockReturnValue({
        total: 1,
        byType: { Riser: 1 },
        byStatus: { AVAILABLE: 1, ALLOCATED: 0, IN_USE: 0, RESERVED: 0, UNKNOWN: 0 }
      });

      // Mock linking
      vi.mocked(attachReuseToAssets).mockReturnValue({
        updatedAssets: [],
        unmatchedReuseRecords: []
      });

      vi.mocked(calculateLinkingStats).mockReturnValue({
        totalAssets: 0,
        assetsWithReuseInfo: 0,
        matchedReuseRecords: 0,
        unmatchedReuseRecords: 0,
        totalReuseRecords: 1
      });

      const result = await ingestAllExcelData({
        dataRoot: '/test/data'
      });

      expect(result.reuseSummary.total).toBe(1);
      expect(result.reuseSummary.byType.Riser).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should handle errors from reuse list loading', async () => {
      vi.mocked(loadAllReuseLists).mockResolvedValue({
        records: [],
        errors: ['Failed to parse RISERS.xlsx']
      });

      vi.mocked(summarizeReuseRecords).mockReturnValue({
        total: 0,
        byType: {},
        byStatus: { AVAILABLE: 0, ALLOCATED: 0, IN_USE: 0, RESERVED: 0, UNKNOWN: 0 }
      });

      vi.mocked(attachReuseToAssets).mockReturnValue({
        updatedAssets: [],
        unmatchedReuseRecords: []
      });

      vi.mocked(calculateLinkingStats).mockReturnValue({
        totalAssets: 0,
        assetsWithReuseInfo: 0,
        matchedReuseRecords: 0,
        unmatchedReuseRecords: 0,
        totalReuseRecords: 0
      });

      const result = await ingestAllExcelData({
        dataRoot: '/test/data'
      });

      expect(result.errors).toContain('Failed to parse RISERS.xlsx');
    });

    it('should skip reuse lists when loadReuseLists is false', async () => {
      const result = await ingestAllExcelData({
        dataRoot: '/test/data',
        loadReuseLists: false
      });

      expect(loadAllReuseLists).not.toHaveBeenCalled();
    });

    it('should skip linking when attachReuseInfo is false', async () => {
      vi.mocked(loadAllReuseLists).mockResolvedValue({
        records: [
          {
            id: 'test-1',
            assetType: 'Riser',
            allocationStatus: 'AVAILABLE',
            oldProject: null,
            oldLine: null,
            oldStation: null,
            targetProject: null,
            targetLine: null,
            targetStation: null,
            workbookId: 'wb1',
            sheetName: 'Sheet1',
            rowIndex: 1,
            source: 'INTERNAL',
            tags: []
          }
        ],
        errors: []
      });

      vi.mocked(summarizeReuseRecords).mockReturnValue({
        total: 1,
        byType: { Riser: 1 },
        byStatus: { AVAILABLE: 1, ALLOCATED: 0, IN_USE: 0, RESERVED: 0, UNKNOWN: 0 }
      });

      vi.mocked(calculateLinkingStats).mockReturnValue({
        totalAssets: 0,
        assetsWithReuseInfo: 0,
        matchedReuseRecords: 0,
        unmatchedReuseRecords: 1,
        totalReuseRecords: 1
      });

      const result = await ingestAllExcelData({
        dataRoot: '/test/data',
        attachReuseInfo: false
      });

      expect(attachReuseToAssets).not.toHaveBeenCalled();
      expect(result.linkingStats.unmatchedReuseRecords).toBe(1);
    });
  });

  describe('validateIngestionResult', () => {
    it('should pass validation for healthy result', () => {
      const result: FullIngestionResult = {
        assets: [],
        reuseSummary: {
          total: 100,
          byType: { Riser: 100 },
          byStatus: { AVAILABLE: 80, ALLOCATED: 20, IN_USE: 0, RESERVED: 0, UNKNOWN: 0 },
          unmatchedReuseCount: 10
        },
        linkingStats: {
          totalAssets: 100,
          assetsWithReuseInfo: 90,
          matchedReuseRecords: 90,
          unmatchedReuseRecords: 10
        },
        errors: []
      };

      const validation = validateIngestionResult(result);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should warn on high unmatched reuse count', () => {
      const result: FullIngestionResult = {
        assets: [],
        reuseSummary: {
          total: 100,
          byType: { Riser: 100 },
          byStatus: { AVAILABLE: 100, ALLOCATED: 0, IN_USE: 0, RESERVED: 0, UNKNOWN: 0 },
          unmatchedReuseCount: 60
        },
        linkingStats: {
          totalAssets: 100,
          assetsWithReuseInfo: 40,
          matchedReuseRecords: 40,
          unmatchedReuseRecords: 60
        },
        errors: []
      };

      const validation = validateIngestionResult(result);

      expect(validation.isValid).toBe(false);
      expect(validation.warnings.some(w => w.includes('High unmatched reuse count'))).toBe(true);
    });

    it('should warn on high UNKNOWN allocation status', () => {
      const result: FullIngestionResult = {
        assets: [],
        reuseSummary: {
          total: 100,
          byType: { Riser: 100 },
          byStatus: { AVAILABLE: 0, ALLOCATED: 0, IN_USE: 0, RESERVED: 0, UNKNOWN: 50 },
          unmatchedReuseCount: 0
        },
        linkingStats: {
          totalAssets: 100,
          assetsWithReuseInfo: 100,
          matchedReuseRecords: 100,
          unmatchedReuseRecords: 0
        },
        errors: []
      };

      const validation = validateIngestionResult(result);

      expect(validation.isValid).toBe(false);
      expect(validation.warnings.some(w => w.includes('High UNKNOWN allocation status'))).toBe(true);
    });

    it('should warn when most assets lack reuse info', () => {
      const result: FullIngestionResult = {
        assets: [],
        reuseSummary: {
          total: 100,
          byType: { Riser: 100 },
          byStatus: { AVAILABLE: 100, ALLOCATED: 0, IN_USE: 0, RESERVED: 0, UNKNOWN: 0 },
          unmatchedReuseCount: 0
        },
        linkingStats: {
          totalAssets: 100,
          assetsWithReuseInfo: 10, // Only 10% have reuse info
          matchedReuseRecords: 10,
          unmatchedReuseRecords: 0
        },
        errors: []
      };

      const validation = validateIngestionResult(result);

      expect(validation.isValid).toBe(false);
      expect(validation.warnings.some(w => w.includes('Most assets lack reuse info'))).toBe(true);
    });
  });

  describe('formatIngestionSummary', () => {
    it('should format result as readable text', () => {
      const result: FullIngestionResult = {
        assets: [],
        reuseSummary: {
          total: 150,
          byType: { Riser: 50, TipDresser: 60, TMSGun: 40 },
          byStatus: { AVAILABLE: 80, ALLOCATED: 50, IN_USE: 20, RESERVED: 0, UNKNOWN: 0 },
          unmatchedReuseCount: 10
        },
        linkingStats: {
          totalAssets: 200,
          assetsWithReuseInfo: 140,
          matchedReuseRecords: 140,
          unmatchedReuseRecords: 10
        },
        errors: ['Warning: some data missing']
      };

      const summary = formatIngestionSummary(result);

      expect(summary).toContain('Total Assets: 200');
      expect(summary).toContain('Total Reuse Records: 150');
      expect(summary).toContain('Riser: 50');
      expect(summary).toContain('TipDresser: 60');
      expect(summary).toContain('TMSGun: 40');
      expect(summary).toContain('AVAILABLE: 80');
      expect(summary).toContain('Matched: 140');
      expect(summary).toContain('Unmatched: 10');
      expect(summary).toContain('Warning: some data missing');
    });

    it('should handle empty result', () => {
      const result: FullIngestionResult = {
        assets: [],
        reuseSummary: {
          total: 0,
          byType: {},
          byStatus: { AVAILABLE: 0, ALLOCATED: 0, IN_USE: 0, RESERVED: 0, UNKNOWN: 0 },
          unmatchedReuseCount: 0
        },
        linkingStats: {
          totalAssets: 0,
          assetsWithReuseInfo: 0,
          matchedReuseRecords: 0,
          unmatchedReuseRecords: 0
        },
        errors: []
      };

      const summary = formatIngestionSummary(result);

      expect(summary).toContain('Total Assets: 0');
      expect(summary).toContain('Total Reuse Records: 0');
    });
  });
});
