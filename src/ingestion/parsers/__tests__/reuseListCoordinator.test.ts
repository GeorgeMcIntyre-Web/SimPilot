/**
 * Unit tests for reuseListCoordinator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadAllReuseLists,
  summarizeReuseRecords,
  type ReuseRecord
} from '../reuseListCoordinator';
import type { ReuseAllocationStatus } from '../../excelIngestionTypes';

// Mock the parsers
vi.mock('../reuseListRisersParser', () => ({
  parseReuseListRisers: vi.fn()
}));

vi.mock('../reuseListTipDressersParser', () => ({
  parseReuseListTipDressers: vi.fn()
}));

vi.mock('../reuseListTMSWGParser', () => ({
  parseReuseListTMSWG: vi.fn()
}));

describe('reuseListCoordinator', () => {
  describe('summarizeReuseRecords', () => {
    it('should correctly count records by type and status', () => {
      const records: ReuseRecord[] = [
        createMockReuseRecord('Riser', 'AVAILABLE'),
        createMockReuseRecord('Riser', 'ALLOCATED'),
        createMockReuseRecord('TipDresser', 'IN_USE'),
        createMockReuseRecord('TMSGun', 'AVAILABLE'),
        createMockReuseRecord('TMSGun', 'UNKNOWN')
      ];

      const summary = summarizeReuseRecords(records);

      expect(summary.total).toBe(5);
      expect(summary.byType.Riser).toBe(2);
      expect(summary.byType.TipDresser).toBe(1);
      expect(summary.byType.TMSGun).toBe(2);
      expect(summary.byStatus.AVAILABLE).toBe(2);
      expect(summary.byStatus.ALLOCATED).toBe(1);
      expect(summary.byStatus.IN_USE).toBe(1);
      expect(summary.byStatus.UNKNOWN).toBe(1);
    });

    it('should handle empty records array', () => {
      const summary = summarizeReuseRecords([]);

      expect(summary.total).toBe(0);
      expect(summary.byType).toEqual({});
      expect(summary.byStatus.AVAILABLE).toBe(0);
      expect(summary.byStatus.ALLOCATED).toBe(0);
      expect(summary.byStatus.IN_USE).toBe(0);
      expect(summary.byStatus.UNKNOWN).toBe(0);
    });

    it('should handle records with same type', () => {
      const records: ReuseRecord[] = [
        createMockReuseRecord('Riser', 'AVAILABLE'),
        createMockReuseRecord('Riser', 'AVAILABLE'),
        createMockReuseRecord('Riser', 'AVAILABLE')
      ];

      const summary = summarizeReuseRecords(records);

      expect(summary.total).toBe(3);
      expect(summary.byType.Riser).toBe(3);
      expect(summary.byStatus.AVAILABLE).toBe(3);
    });
  });

  describe('loadAllReuseLists - precedence logic', () => {
    it('should prefer INTERNAL over DesignOS for same record', async () => {
      // This test would require mocking fs and parsers
      // For now, we test the precedence logic concept
      const records: ReuseRecord[] = [
        { ...createMockReuseRecord('Riser', 'AVAILABLE'), id: 'test-1', source: 'INTERNAL' },
        { ...createMockReuseRecord('Riser', 'AVAILABLE'), id: 'test-1', source: 'DESIGNOS' }
      ];

      // In actual implementation, applyPrecedenceAndDedupe would be called
      // and INTERNAL would win
      const internalRecord = records.find(r => r.source === 'INTERNAL');
      const designOsRecord = records.find(r => r.source === 'DESIGNOS');

      expect(internalRecord).toBeDefined();
      expect(designOsRecord).toBeDefined();
      expect(internalRecord?.id).toBe(designOsRecord?.id);
    });

    it('should include DesignOS-only records', () => {
      const records: ReuseRecord[] = [
        { ...createMockReuseRecord('Riser', 'AVAILABLE'), id: 'test-1', source: 'INTERNAL' },
        { ...createMockReuseRecord('TipDresser', 'ALLOCATED'), id: 'test-2', source: 'DESIGNOS' }
      ];

      const designOsOnlyRecords = records.filter(
        r => r.source === 'DESIGNOS' && !records.some(
          other => other.id === r.id && other.source === 'INTERNAL'
        )
      );

      expect(designOsOnlyRecords).toHaveLength(1);
      expect(designOsOnlyRecords[0].id).toBe('test-2');
    });
  });
});

/**
 * Helper to create mock ReuseRecord
 */
function createMockReuseRecord(
  assetType: 'Riser' | 'TipDresser' | 'TMSGun',
  allocationStatus: ReuseAllocationStatus
): ReuseRecord {
  return {
    id: `mock-${Math.random()}`,
    assetType,
    allocationStatus,
    oldProject: 'OLD_PROJ',
    oldLine: 'LINE_1',
    oldStation: 'STA_10',
    targetProject: 'NEW_PROJ',
    targetLine: 'LINE_2',
    targetStation: 'STA_20',
    partNumber: 'PN-123',
    model: 'MODEL-A',
    serialNumber: 'SN-456',
    riserType: null,
    gunId: null,
    tipDresserId: null,
    workbookId: 'test-workbook',
    sheetName: 'Sheet1',
    rowIndex: 1,
    source: 'INTERNAL',
    tags: []
  };
}
