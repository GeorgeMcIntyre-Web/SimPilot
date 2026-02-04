// Excel Ingestion Types - Workbook Registry
// Source workbook identification and configuration

import type { SimulationSourceKind, SiteLocation } from './sourceLocation'

/**
 * Stable IDs for source workbooks.
 * Used for provenance tracking and merge rules.
 */
export type SourceWorkbookId =
  // Internal Simulation Status
  | 'STLA_REAR_DES_SIM_STATUS_INTERNAL'
  | 'STLA_UNDERBODY_DES_SIM_STATUS_INTERNAL'
  | 'STLA_FRONT_DES_SIM_STATUS_INTERNAL'
  // Outsource Simulation Status
  | 'STLA_FRONT_CSG_SIM_STATUS_OUTSOURCE'
  | 'STLA_REAR_CSG_SIM_STATUS_OUTSOURCE'
  | 'STLA_UNDERBODY_CSG_SIM_STATUS_OUTSOURCE'
  // Internal Robot Lists
  | 'STLA_UB_ROBOTLIST_REV05_INTERNAL'
  | 'STLA_UB_ROBOTLIST_REV01_INTERNAL'
  // Outsource Robot Lists
  | 'STLA_UB_ROBOTLIST_REV01_OUTSOURCE'
  | 'STLA_UB_ROBOTLIST_REV05_OUTSOURCE'
  // Reuse Lists (Internal)
  | 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_INTERNAL'
  | 'GLOBAL_ZA_REUSE_RISERS_INTERNAL'
  | 'GLOBAL_ZA_REUSE_TIP_DRESSER_INTERNAL'
  | 'GLOBAL_ZA_REUSE_TMS_WG_INTERNAL'
  // Reuse Lists (Outsource - duplicates)
  | 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_OUTSOURCE'
  | 'GLOBAL_ZA_REUSE_RISERS_OUTSOURCE'
  | 'GLOBAL_ZA_REUSE_TIP_DRESSER_OUTSOURCE'
  | 'GLOBAL_ZA_REUSE_TMS_WG_OUTSOURCE'
  // Gun Info / Reference
  | 'ZANGENPOOL_TMS_QUANTITY_FORCE'
  | 'ZANGEN_UEBERSICHTSLISTE_OPEL_MERIVA_ZARA'
  | 'UNKNOWN_WORKBOOK'

/**
 * Workbook configuration metadata
 */
export interface WorkbookConfig {
  workbookId: SourceWorkbookId
  simulationSourceKind: SimulationSourceKind
  defaultSiteLocation: SiteLocation
  humanLabel: string
  expectedSheets: string[]
  notes?: string
}

/**
 * Registry of all known workbooks.
 * Maps file paths/patterns to workbook configuration.
 */
export const WORKBOOK_REGISTRY: Record<string, WorkbookConfig> = {
  // Internal Simulation Status
  'STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx': {
    workbookId: 'STLA_REAR_DES_SIM_STATUS_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S Rear Unit Simulation Status (DES)',
    expectedSheets: ['SIMULATION']
  },
  'STLA-S_UNDERBODY_Simulation_Status_DES.xlsx': {
    workbookId: 'STLA_UNDERBODY_DES_SIM_STATUS_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S Underbody Simulation Status (DES)',
    expectedSheets: ['SIMULATION']
  },

  // Outsource Simulation Status
  'STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx': {
    workbookId: 'STLA_FRONT_CSG_SIM_STATUS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S Front Unit Simulation Status (CSG)',
    expectedSheets: ['SIMULATION']
  },
  'STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx': {
    workbookId: 'STLA_REAR_CSG_SIM_STATUS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S Rear Unit Simulation Status (CSG)',
    expectedSheets: ['SIMULATION']
  },
  'STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx': {
    workbookId: 'STLA_UNDERBODY_CSG_SIM_STATUS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S Underbody Simulation Status (CSG)',
    expectedSheets: ['SIMULATION']
  },

  // Internal Robot Lists
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx:INTERNAL': {
    workbookId: 'STLA_UB_ROBOTLIST_REV05_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S UB Robotlist Rev05',
    expectedSheets: ['STLA-S'],
    notes: 'Latest revision - prefer over Rev01'
  },
  'Robotlist_ZA__STLA-S_UB_Rev01_20251028.xlsx:INTERNAL': {
    workbookId: 'STLA_UB_ROBOTLIST_REV01_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S UB Robotlist Rev01',
    expectedSheets: ['STLA-S'],
    notes: 'Superseded by Rev05'
  },

  // Outsource Robot Lists
  'Robotlist_ZA__STLA-S_UB_Rev01_20251028.xlsx': {
    workbookId: 'STLA_UB_ROBOTLIST_REV01_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S UB Robotlist Rev01',
    expectedSheets: ['STLA-S'],
    notes: 'Superseded by Rev05 - only exists in outsource'
  },
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx:OUTSOURCE': {
    workbookId: 'STLA_UB_ROBOTLIST_REV05_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S UB Robotlist Rev05',
    expectedSheets: ['STLA-S'],
    notes: 'Same rev as internal - prefer internal as canonical'
  },

  // Reuse Lists - Internal (Primary)
  'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx:INTERNAL': {
    workbookId: 'GLOBAL_ZA_REUSE_RISERS_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Risers (Internal)',
    expectedSheets: ['Raisers']
  },
  'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx:INTERNAL': {
    workbookId: 'GLOBAL_ZA_REUSE_TIP_DRESSER_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Tip Dressers (Internal)',
    expectedSheets: ['Tip Dressers']
  },
  'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx:INTERNAL': {
    workbookId: 'GLOBAL_ZA_REUSE_TMS_WG_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - TMS Weld Guns (Internal)',
    expectedSheets: ['Welding guns']
  },
  'FEB Underbody TMS_10.09.25_REUSE_LIST_ROBOTS_DES - R01.xlsx:INTERNAL': {
    workbookId: 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'FEB Underbody TMS Reuse List - Robots (DES)',
    expectedSheets: ['STLA-S']
  },

  // Reuse Lists - Outsource (Duplicates)
  'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx:OUTSOURCE': {
    workbookId: 'GLOBAL_ZA_REUSE_RISERS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Risers (Outsource)',
    expectedSheets: ['Raisers'],
    notes: 'Duplicate of internal - use for cross-validation'
  },
  'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx:OUTSOURCE': {
    workbookId: 'GLOBAL_ZA_REUSE_TIP_DRESSER_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Tip Dressers (Outsource)',
    expectedSheets: ['Tip Dressers'],
    notes: 'Duplicate of internal - use for cross-validation'
  },
  'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx:OUTSOURCE': {
    workbookId: 'GLOBAL_ZA_REUSE_TMS_WG_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - TMS Weld Guns (Outsource)',
    expectedSheets: ['Welding guns'],
    notes: 'Duplicate of internal - use for cross-validation'
  },
  'FEB Underbody TMS_10.09.25_REUSE_LIST_ROBOTS_DES - R01.xlsx:OUTSOURCE': {
    workbookId: 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'FEB Underbody TMS Reuse List - Robots (Outsource)',
    expectedSheets: ['STLA-S'],
    notes: 'Duplicate of internal - use for cross-validation'
  },

  // Gun Info / Reference
  'Zangenpool_TMS_Rev01_Quantity_Force_Info.xls': {
    workbookId: 'ZANGENPOOL_TMS_QUANTITY_FORCE',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Zangenpool TMS - Gun Force & Quantity Info',
    expectedSheets: ['Zaragoza Allocation']
  },
  'Zangenübersichtsliste_OPEL_MERIVA_ZARA_052017.xls': {
    workbookId: 'ZANGEN_UEBERSICHTSLISTE_OPEL_MERIVA_ZARA',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Zangenübersichtsliste - OPEL Meriva Historic Gun List',
    expectedSheets: []
  }
}

/**
 * Get workbook config from file name and path context
 */
export function getWorkbookConfig(fileName: string, sourcePath: string): WorkbookConfig {
  // Determine if file is from Internal or Outsource path
  const isOutsource = sourcePath.includes('DesignOS')
  const isInternal = sourcePath.includes('03_Simulation')

  // For duplicate files, add :INTERNAL or :OUTSOURCE suffix
  const duplicateFiles = [
    'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
    'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx',
    'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
    'FEB Underbody TMS_10.09.25_REUSE_LIST_ROBOTS_DES - R01.xlsx',
    'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx'
  ]

  let lookupKey = fileName

  if (duplicateFiles.includes(fileName)) {
    if (isInternal) {
      lookupKey = `${fileName}:INTERNAL`
    }

    if (isOutsource) {
      lookupKey = `${fileName}:OUTSOURCE`
    }
  }

  const config = WORKBOOK_REGISTRY[lookupKey]

  if (config !== undefined) {
    return config
  }

  // Fallback for unknown workbooks
  return {
    workbookId: 'UNKNOWN_WORKBOOK',
    simulationSourceKind: isOutsource ? 'OutsourceSimulation' : 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: fileName,
    expectedSheets: []
  }
}
