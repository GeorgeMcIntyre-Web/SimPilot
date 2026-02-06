// Tests for Excel Ingestion Types
// Validates type mappings, sourcing classification, and workbook configuration

import { describe, it, expect } from 'vitest'
import {
  mapDetailedKindToAssetKind,
  inferDetailedKind,
  inferSourcing,
  getWorkbookConfig,
  buildAssetKey,
  buildRawRowId,
} from '../excelIngestionTypes'

// ============================================================================
// DETAILED KIND → ASSET KIND MAPPING
// ============================================================================

describe('mapDetailedKindToAssetKind', () => {
  it('should map Robot to ROBOT', () => {
    const result = mapDetailedKindToAssetKind('Robot')
    expect(result).toBe('ROBOT')
  })

  it('should map WeldGun to GUN', () => {
    const result = mapDetailedKindToAssetKind('WeldGun')
    expect(result).toBe('GUN')
  })

  it('should map TMSGun to GUN', () => {
    const result = mapDetailedKindToAssetKind('TMSGun')
    expect(result).toBe('GUN')
  })

  it('should map Gripper to TOOL', () => {
    const result = mapDetailedKindToAssetKind('Gripper')
    expect(result).toBe('TOOL')
  })

  it('should map Fixture to TOOL', () => {
    const result = mapDetailedKindToAssetKind('Fixture')
    expect(result).toBe('TOOL')
  })

  it('should map Riser to TOOL', () => {
    const result = mapDetailedKindToAssetKind('Riser')
    expect(result).toBe('TOOL')
  })

  it('should map TipDresser to TOOL', () => {
    const result = mapDetailedKindToAssetKind('TipDresser')
    expect(result).toBe('TOOL')
  })

  it('should map Measurement to TOOL', () => {
    const result = mapDetailedKindToAssetKind('Measurement')
    expect(result).toBe('TOOL')
  })

  it('should map Other to OTHER', () => {
    const result = mapDetailedKindToAssetKind('Other')
    expect(result).toBe('OTHER')
  })
})

// ============================================================================
// INFER DETAILED KIND FROM CONTEXT
// ============================================================================

describe('inferDetailedKind', () => {
  describe('from sheet category', () => {
    it('should infer Riser from sheet category', () => {
      const result = inferDetailedKind({
        sheetCategory: 'REUSE_RISERS',
      })
      expect(result).toBe('Riser')
    })

    it('should infer TipDresser from sheet category', () => {
      const result = inferDetailedKind({
        sheetCategory: 'REUSE_TIP_DRESSERS',
      })
      expect(result).toBe('TipDresser')
    })

    it('should infer TMSGun from sheet category', () => {
      const result = inferDetailedKind({
        sheetCategory: 'REUSE_TMS_WG',
      })
      expect(result).toBe('TMSGun')
    })

    it('should infer WeldGun from weld gun sheet category', () => {
      const result = inferDetailedKind({
        sheetCategory: 'REUSE_WELD_GUNS',
      })
      expect(result).toBe('WeldGun')
    })
  })

  describe('from application code', () => {
    it('should infer WeldGun from SW application code', () => {
      const result = inferDetailedKind({
        applicationCode: 'SW',
      })
      expect(result).toBe('WeldGun')
    })

    it('should infer WeldGun from SPOT application code', () => {
      const result = inferDetailedKind({
        applicationCode: 'SPOT WELD',
      })
      expect(result).toBe('WeldGun')
    })

    it('should infer Gripper from MH application code', () => {
      const result = inferDetailedKind({
        applicationCode: 'MH',
      })
      expect(result).toBe('Gripper')
    })

    it('should infer Measurement from IM application code', () => {
      const result = inferDetailedKind({
        applicationCode: 'IM',
      })
      expect(result).toBe('Measurement')
    })
  })

  describe('from asset name hints', () => {
    it('should infer WeldGun from gun in name', () => {
      const result = inferDetailedKind({
        assetName: 'WG-123 Gun Assembly',
      })
      expect(result).toBe('WeldGun')
    })

    it('should infer Gripper from grip in name', () => {
      const result = inferDetailedKind({
        assetName: 'Gripper-R01',
      })
      expect(result).toBe('Gripper')
    })

    it('should infer Riser from riser in name', () => {
      const result = inferDetailedKind({
        assetName: 'Robot Riser 500mm',
      })
      expect(result).toBe('Riser')
    })

    it('should infer Fixture from fixture in name', () => {
      const result = inferDetailedKind({
        assetName: 'Geo Fixture BA010',
      })
      expect(result).toBe('Fixture')
    })

    it('should infer Robot from robot in name', () => {
      const result = inferDetailedKind({
        assetName: 'Robot R01',
      })
      expect(result).toBe('Robot')
    })
  })

  describe('fallback behavior', () => {
    it('should return Other when no hints match', () => {
      const result = inferDetailedKind({
        applicationCode: 'UNKNOWN',
        assetName: 'Something Else',
      })
      expect(result).toBe('Other')
    })

    it('should prioritize sheet category over application code', () => {
      const result = inferDetailedKind({
        sheetCategory: 'REUSE_RISERS',
        applicationCode: 'SW',
      })
      expect(result).toBe('Riser')
    })
  })
})

// ============================================================================
// SOURCING CLASSIFICATION
// ============================================================================

describe('inferSourcing', () => {
  describe('reuse list priority', () => {
    it('should return REUSE when on reuse list', () => {
      const result = inferSourcing({
        isOnReuseList: true,
        rawTags: [],
      })
      expect(result).toBe('REUSE')
    })

    it('should prioritize reuse list over new hints', () => {
      const result = inferSourcing({
        isOnReuseList: true,
        cellText: 'NEW',
        rawTags: ['new'],
      })
      expect(result).toBe('REUSE')
    })
  })

  describe('explicit free issue', () => {
    it('should return REUSE for free issue', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'FREE ISSUE',
        rawTags: [],
      })
      expect(result).toBe('REUSE')
    })

    it('should return REUSE for free-issue (hyphenated)', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'free-issue',
        rawTags: [],
      })
      expect(result).toBe('REUSE')
    })

    it('should return REUSE for FI abbreviation', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        lifecycleHint: 'FI',
        rawTags: [],
      })
      expect(result).toBe('REUSE')
    })
  })

  describe('explicit new markers', () => {
    it('should return NEW_BUY for new marker', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'This is new equipment',
        rawTags: [],
      })
      expect(result).toBe('NEW_BUY')
    })

    it('should handle new at start of text', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'new robot order',
        rawTags: [],
      })
      expect(result).toBe('NEW_BUY')
    })
  })

  describe('explicit make markers', () => {
    it('should return MAKE for make marker', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'make in-house',
        rawTags: [],
      })
      expect(result).toBe('MAKE')
    })

    it('should return MAKE for custom marker', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'custom fabrication',
        rawTags: [],
      })
      expect(result).toBe('MAKE')
    })
  })

  describe('explicit reuse hints', () => {
    it('should return REUSE for reuse keyword', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'reuse from previous project',
        rawTags: [],
      })
      expect(result).toBe('REUSE')
    })

    it('should return REUSE for carry over', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        cellText: 'carry over equipment',
        rawTags: [],
      })
      expect(result).toBe('REUSE')
    })
  })

  describe('unknown/default', () => {
    it('should return UNKNOWN when no hints present', () => {
      const result = inferSourcing({
        isOnReuseList: false,
        rawTags: [],
      })
      expect(result).toBe('UNKNOWN')
    })
  })
})

// ============================================================================
// WORKBOOK CONFIGURATION
// ============================================================================

describe('getWorkbookConfig', () => {
  describe('internal simulation status', () => {
    it('should identify REAR UNIT internal status file', () => {
      const config = getWorkbookConfig(
        'STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx',
        'C:/SimPilot_Data/03_Simulation/00_Simulation_Status/',
      )
      expect(config.workbookId).toBe('STLA_REAR_DES_SIM_STATUS_INTERNAL')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
      expect(config.defaultSiteLocation).toBe('Durban')
    })

    it('should identify UNDERBODY internal status file', () => {
      const config = getWorkbookConfig(
        'STLA-S_UNDERBODY_Simulation_Status_DES.xlsx',
        'C:/SimPilot_Data/03_Simulation/00_Simulation_Status/',
      )
      expect(config.workbookId).toBe('STLA_UNDERBODY_DES_SIM_STATUS_INTERNAL')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })
  })

  describe('outsource simulation status', () => {
    it('should identify FRONT UNIT outsource status file', () => {
      const config = getWorkbookConfig(
        'STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx',
        'C:/SimPilot_Data/DesignOS/05_Status_Sheets/',
      )
      expect(config.workbookId).toBe('STLA_FRONT_CSG_SIM_STATUS_OUTSOURCE')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })

    it('should identify REAR UNIT outsource status file', () => {
      const config = getWorkbookConfig(
        'STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx',
        'C:/SimPilot_Data/DesignOS/05_Status_Sheets/',
      )
      expect(config.workbookId).toBe('STLA_REAR_CSG_SIM_STATUS_OUTSOURCE')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })
  })

  describe('duplicate reuse lists', () => {
    it('should identify internal RISERS list', () => {
      const config = getWorkbookConfig(
        'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
        'C:/SimPilot_Data/03_Simulation/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('GLOBAL_ZA_REUSE_RISERS_INTERNAL')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })

    it('should identify outsource RISERS list', () => {
      const config = getWorkbookConfig(
        'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
        'C:/SimPilot_Data/DesignOS/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('GLOBAL_ZA_REUSE_RISERS_OUTSOURCE')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })

    it('should identify internal TIP DRESSER list', () => {
      const config = getWorkbookConfig(
        'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx',
        'C:/SimPilot_Data/03_Simulation/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('GLOBAL_ZA_REUSE_TIP_DRESSER_INTERNAL')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })

    it('should identify outsource TIP DRESSER list', () => {
      const config = getWorkbookConfig(
        'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx',
        'C:/SimPilot_Data/DesignOS/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('GLOBAL_ZA_REUSE_TIP_DRESSER_OUTSOURCE')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })

    it('should identify internal TMS WG list', () => {
      const config = getWorkbookConfig(
        'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
        'C:/SimPilot_Data/03_Simulation/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('GLOBAL_ZA_REUSE_TMS_WG_INTERNAL')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })

    it('should identify outsource TMS WG list', () => {
      const config = getWorkbookConfig(
        'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
        'C:/SimPilot_Data/DesignOS/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('GLOBAL_ZA_REUSE_TMS_WG_OUTSOURCE')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })
  })

  describe('robotlist versioning', () => {
    it('should identify internal Rev05 robotlist', () => {
      const config = getWorkbookConfig(
        'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx',
        'C:/SimPilot_Data/03_Simulation/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('STLA_UB_ROBOTLIST_REV05_INTERNAL')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })

    it('should identify outsource Rev01 robotlist', () => {
      const config = getWorkbookConfig(
        'Robotlist_ZA__STLA-S_UB_Rev01_20251028.xlsx',
        'C:/SimPilot_Data/DesignOS/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('STLA_UB_ROBOTLIST_REV01_OUTSOURCE')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })

    it('should identify outsource Rev05 robotlist (duplicate)', () => {
      const config = getWorkbookConfig(
        'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx',
        'C:/SimPilot_Data/DesignOS/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('STLA_UB_ROBOTLIST_REV05_OUTSOURCE')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })
  })

  describe('gun info files', () => {
    it('should identify Zangenpool file', () => {
      const config = getWorkbookConfig(
        'Zangenpool_TMS_Rev01_Quantity_Force_Info.xls',
        'C:/SimPilot_Data/DesignOS/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('ZANGENPOOL_TMS_QUANTITY_FORCE')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })

    it('should identify Zangenübersichtsliste file', () => {
      const config = getWorkbookConfig(
        'Zangenübersichtsliste_OPEL_MERIVA_ZARA_052017.xls',
        'C:/SimPilot_Data/DesignOS/01_Equipment_List/',
      )
      expect(config.workbookId).toBe('ZANGEN_UEBERSICHTSLISTE_OPEL_MERIVA_ZARA')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })
  })

  describe('unknown files', () => {
    it('should return UNKNOWN_WORKBOOK for unrecognized files', () => {
      const config = getWorkbookConfig('SomeRandomFile.xlsx', 'C:/SimPilot_Data/')
      expect(config.workbookId).toBe('UNKNOWN_WORKBOOK')
    })

    it('should infer InternalSimulation from path for unknown files', () => {
      const config = getWorkbookConfig('Unknown.xlsx', 'C:/SimPilot_Data/03_Simulation/')
      expect(config.simulationSourceKind).toBe('InternalSimulation')
    })

    it('should infer OutsourceSimulation from path for unknown files', () => {
      const config = getWorkbookConfig('Unknown.xlsx', 'C:/SimPilot_Data/DesignOS/')
      expect(config.simulationSourceKind).toBe('OutsourceSimulation')
    })
  })
})

// ============================================================================
// ASSET KEY BUILDING
// ============================================================================

describe('buildAssetKey', () => {
  it('should build key from minimal data (project + area)', () => {
    const key = buildAssetKey({
      projectCode: 'STLA-S',
      areaName: 'Underbody',
    })
    expect(key).toBe('stla-s|underbody')
  })

  it('should include assembly line when present', () => {
    const key = buildAssetKey({
      projectCode: 'STLA-S',
      areaName: 'Underbody',
      assemblyLine: 'BN_B05',
    })
    expect(key).toBe('stla-s|underbody|bn_b05')
  })

  it('should include station when present', () => {
    const key = buildAssetKey({
      projectCode: 'STLA-S',
      areaName: 'Underbody',
      assemblyLine: 'BN_B05',
      station: '010',
    })
    expect(key).toBe('stla-s|underbody|bn_b05|010')
  })

  it('should include robot number when present', () => {
    const key = buildAssetKey({
      projectCode: 'STLA-S',
      areaName: 'Underbody',
      assemblyLine: 'BN_B05',
      station: '010',
      robotNumber: 'R01',
    })
    expect(key).toBe('stla-s|underbody|bn_b05|010|r01')
  })

  it('should include asset name when present', () => {
    const key = buildAssetKey({
      projectCode: 'STLA-S',
      areaName: 'Underbody',
      assemblyLine: 'BN_B05',
      station: '010',
      robotNumber: 'R01',
      assetName: 'WG-123',
    })
    expect(key).toBe('stla-s|underbody|bn_b05|010|r01|wg-123')
  })

  it('should normalize case and trim whitespace', () => {
    const key = buildAssetKey({
      projectCode: '  STLA-S  ',
      areaName: '  UNDERBODY  ',
    })
    expect(key).toBe('stla-s|underbody')
  })

  it('should skip null/undefined fields', () => {
    const key = buildAssetKey({
      projectCode: 'STLA-S',
      areaName: 'Underbody',
      assemblyLine: null,
      station: undefined,
      robotNumber: null,
    })
    expect(key).toBe('stla-s|underbody')
  })

  it('should skip empty string fields', () => {
    const key = buildAssetKey({
      projectCode: 'STLA-S',
      areaName: 'Underbody',
      assemblyLine: '',
      station: '  ',
      robotNumber: '',
    })
    expect(key).toBe('stla-s|underbody')
  })
})

// ============================================================================
// RAW ROW ID BUILDING
// ============================================================================

describe('buildRawRowId', () => {
  it('should build unique row ID', () => {
    const id = buildRawRowId('STLA_REAR_DES_SIM_STATUS_INTERNAL', 'SIMULATION', 42)
    expect(id).toBe('STLA_REAR_DES_SIM_STATUS_INTERNAL:SIMULATION:42')
  })

  it('should produce different IDs for different rows', () => {
    const id1 = buildRawRowId('STLA_REAR_DES_SIM_STATUS_INTERNAL', 'SIMULATION', 10)
    const id2 = buildRawRowId('STLA_REAR_DES_SIM_STATUS_INTERNAL', 'SIMULATION', 11)
    expect(id1).not.toBe(id2)
  })

  it('should produce different IDs for different sheets', () => {
    const id1 = buildRawRowId('STLA_REAR_DES_SIM_STATUS_INTERNAL', 'Sheet1', 10)
    const id2 = buildRawRowId('STLA_REAR_DES_SIM_STATUS_INTERNAL', 'Sheet2', 10)
    expect(id1).not.toBe(id2)
  })

  it('should produce different IDs for different workbooks', () => {
    const id1 = buildRawRowId('STLA_REAR_DES_SIM_STATUS_INTERNAL', 'SIMULATION', 10)
    const id2 = buildRawRowId('STLA_UNDERBODY_DES_SIM_STATUS_INTERNAL', 'SIMULATION', 10)
    expect(id1).not.toBe(id2)
  })
})
