/**
 * Sheet Sniffer Core
 * Re-exports from modular structure for backwards compatibility
 *
 * This file has been refactored into smaller modules:
 * - sheetSnifferCore/sniffSheet.ts - Single sheet detection
 * - sheetSnifferCore/scanWorkbook.ts - Workbook scanning functions
 * - sheetSnifferCore/normalizedWorkbook.ts - NormalizedWorkbook scanning
 * - sheetSnifferCore/helpers.ts - Utility functions
 * - sheetSnifferCore/configAware.ts - Config-aware scanning
 * - sheetSnifferCore/v2Engine.ts - New engine integration
 */

export * from './sheetSnifferCore/index'
