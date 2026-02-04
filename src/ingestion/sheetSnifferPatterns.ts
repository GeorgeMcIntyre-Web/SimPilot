/**
 * Sheet Sniffer Patterns
 * Category signatures and skip patterns for sheet detection
 */

import { SheetCategory } from './sheetSnifferTypes'

// ============================================================================
// CATEGORY SIGNATURES
// ============================================================================
// Ground-truth signatures for each category.
// DO NOT "fix" spelling - these match real-world headers exactly.

/**
 * Keywords that uniquely identify each sheet category.
 *
 * Scoring:
 * - Strong keyword match: +5 points
 * - Weak keyword match: +1 point
 * - Minimum score of 5 required for a match (at least 1 strong OR 5 weak)
 */
export const CATEGORY_SIGNATURES: Record<Exclude<SheetCategory, 'UNKNOWN'>, {
    strong: string[]
    weak: string[]
}> = {
    // -------------------------------------------------------------------------
    // SIMULATION_STATUS
    // Typical file: STLA-S_...Simulation_Status_DES.xlsx
    // Typical sheet: SIMULATION
    // -------------------------------------------------------------------------
    SIMULATION_STATUS: {
        strong: [
            '1st STAGE SIM COMPLETION',
            'FINAL DELIVERABLES',
            'ROBOT POSITION - STAGE 1',
            '1st STAGE SIM',
            '1st Stage Sim',
            // MRS_OLP sheet signatures
            'FULL ROBOT PATHS CREATED WITH AUX DATA SET',
            'FINAL ROBOT POSITION',
            'COLLISION CHECKS DONE WITH RCS MODULE',
            'RCS MULTI RESOURCE SIMULATION',
            'OLP DONE TO PROGRAMMING GUIDELINE',
            // DOCUMENTATION sheet signatures
            'INTERLOCK ZONING DOCUMENTATION CREATED',
            'WIS7 SPOT LIST UPDATED',
            'CORE CUBIC S DOCUMENTATION CREATED',
            'ROBOT INSTALLATION DOCUMENTATION CREATED',
            '1A4 SHEET CREATED + COMPLETED',
            // SAFETY_LAYOUT sheet signatures
            'LIGHT CURTAIN CALCULATIONS VERIFIED',
            'ROBOT MAIN CABLE LENGTH VERIFIED',
            '3D CABLE TRAYS CHECKED',
            '3D FENCING CHECKED',
            '3D CABINETS CHECKED'
        ],
        weak: [
            'PERSONS RESPONSIBLE',
            'DCS CONFIGURED',
            'APPLICATION',
            'ASSEMBLY LINE',
            'STAGE 1',
            'ROBOT POSITION',
            'AREA',
            'STATION',
            'ROBOT',
            'Reach Status',
            'REACH',
            // MRS_OLP weak keywords
            'MULTI RESOURCE SIMULATION',
            'MRS',
            'OLP',
            'OFFLINE PROGRAMMING',
            'CYCLETIME',
            // DOCUMENTATION weak keywords
            'DOCUMENTATION',
            'WIS7',
            // SAFETY_LAYOUT weak keywords
            'SAFETY',
            'LAYOUT',
            'CABLE LENGTH',
            'HOSE LENGTH'
        ]
    },

    // -------------------------------------------------------------------------
    // IN_HOUSE_TOOLING
    // File: STLA_S_ZAR Tool List.xlsx
    // Sheet: ToolList
    // Also handles generic tool/equipment files
    // -------------------------------------------------------------------------
    IN_HOUSE_TOOLING: {
        strong: [
            'Sim. Leader',
            'Sim. Employee',
            'Team Leader',
            'Sim. Due Date',
            'TOOL ID',
            'Tool ID',
            'EQUIPMENT ID',
            'Equipment ID'
        ],
        weak: [
            'SUB Area Name',
            'Designer',
            'Station',
            'Due Date',
            'Employee',
            'Tool',
            'Equipment',
            'Status',
            'TYPE',
            'AREA',
            'LINE'
        ]
    },

    // -------------------------------------------------------------------------
    // ASSEMBLIES_LIST
    // File: J11006_TMS_STLA_S_*_Assemblies_List.xlsm
    // Sheet: A_List
    // Design progress tracking ("status document between design and simulation")
    // -------------------------------------------------------------------------
    ASSEMBLIES_LIST: {
        strong: [
            '1st Stage',
            '2nd Stage',
            'Detailing',
            'Checking',
            'Issued',
            'Not Started'
        ],
        weak: [
            'Station',
            'Tool Number',
            'Description',
            'Progress',
            'Status',
            'Date',
            'Job Number',
            'Customer',
            'Area'
        ]
    },

    // -------------------------------------------------------------------------
    // ROBOT_SPECS
    // File: Robotlist_ZA...xlsx, Ford_OHAP_V801N_Robot_Equipment_List.xlsx
    // Sheet: STLA-S, V801N_Robot_Equipment_List
    // -------------------------------------------------------------------------
    ROBOT_SPECS: {
        strong: [
            'Robotnumber',
            'Robot caption',
            'Dress Pack',
            'Fanuc order code',
            'Robo No',           // Ford V801: "Robo No. New", "Robo No. Old"
            'Robot Key',         // Ford V801: "Robot Key"
            'Serial #',          // Ford V801: "Serial #"
            'Robot Order'        // Ford V801: "Robot Order Submitted"
        ],
        weak: [
            'Station Number',
            'Station No',        // Ford V801: "Station No."
            'Assembly line',
            'Position',
            'E-Number',
            'Robot Type',
            'Model',
            'Payload',
            'Reach',
            'PLC Name',          // Ford V801: "PLC Name"
            'Safety Zone',       // Ford V801: "Safety Zone"
            'Bundle',            // Ford V801: "Bundle"
            'Person Responsible' // Ford V801: "Person Responsible"
        ]
    },

    // -------------------------------------------------------------------------
    // REUSE_WELD_GUNS
    // File: GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx
    // Sheet: Welding guns
    // -------------------------------------------------------------------------
    REUSE_WELD_GUNS: {
        strong: [
            'Refresment OK',           // Keep typo exactly
            'Serial Number Complete WG',
            'Device Name'
        ],
        weak: [
            'Asset description',
            'Application robot',
            'Cabinet',
            'Serial Number',
            'WG',
            'Welding Gun',
            'Weld Gun',
            'Device',
            'Asset'
        ]
    },

    // -------------------------------------------------------------------------
    // GUN_FORCE
    // File: Zangenpool_TMS...xls
    // Sheet: Zaragoza Allocation
    // Also handles generic weld gun files
    // -------------------------------------------------------------------------
    GUN_FORCE: {
        strong: [
            'Gun Force',
            'Gun Number',
            'GUN ID',
            'Gun ID'
        ],
        weak: [
            'Required Force',
            'Old Line',
            'Quantity',
            'Reserve',
            'Robot Number',
            'Area',
            'Gun',
            'Force',
            'TYPE',
            'STATION',
            'Spot Weld'
        ]
    },

    // -------------------------------------------------------------------------
    // REUSE_RISERS
    // File: GLOBAL_ZA_REUSE_LIST_RISERS.xlsx
    // Sheet: Raisers
    // -------------------------------------------------------------------------
    REUSE_RISERS: {
        strong: [
            'Proyect',                  // Keep typo exactly
            'Coments'                   // Keep typo exactly
        ],
        weak: [
            'Brand',
            'Height',
            'New Line',
            'New station',
            'Riser',
            'Raiser',
            'Standard',
            'Area',
            'Location',
            'Type',
            'Project'
        ]
    },

    // -------------------------------------------------------------------------
    // REUSE_TIP_DRESSERS
    // File: GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx
    // Sheet: Tip Dressers
    // -------------------------------------------------------------------------
    REUSE_TIP_DRESSERS: {
        strong: [
            'Tip Dresser ID',
            'Tip Dresser',
            'TipDresser'
        ],
        weak: [
            'New Project',
            'Old Project',
            'New Line',
            'Old Line',
            'Station',
            'Area',
            'Type',
            'Status',
            'Location',
            'Project'
        ]
    },

    // -------------------------------------------------------------------------
    // REUSE_ROBOTS
    // File: FEB Underbody TMS_10.09.25_REUSE_LIST_ROBOTS_DES - R01.xlsx
    // Sheet: STLA-S
    // -------------------------------------------------------------------------
    REUSE_ROBOTS: {
        strong: [
            'REUSE LIST',
            'Old Line',
            'New Line',
            'Robot Reuse'
        ],
        weak: [
            'Robot Number',
            'Robot Type',
            'Old Station',
            'New Station',
            'Old Project',
            'New Project',
            'Station',
            'Area',
            'Type',
            'Status',
            'Reuse'
        ]
    },

    // -------------------------------------------------------------------------
    // METADATA
    // Employee / supplier / support lists
    // -------------------------------------------------------------------------
    METADATA: {
        strong: [
            'EmployeeList',
            'SupplierName'
        ],
        weak: [
            'BranchName',
            'Employee ID',
            'Supplier ID',
            'Contact Info',
            'Employee',
            'Supplier',
            'Branch',
            'ID',
            'Name'
        ]
    }
}

// Backward compatibility: export old name
export const CATEGORY_KEYWORDS = CATEGORY_SIGNATURES

// ============================================================================
// SKIP PATTERNS
// ============================================================================
// Sheets to skip (Introduction, TOC, blank sheets, etc.)

export const SKIP_SHEET_PATTERNS = [
    /^introduction$/i,
    /^intro$/i,
    /^toc$/i,
    /^table of contents$/i,
    /^contents$/i,
    /^index$/i,
    /^cover$/i,
    /^sheet\d+$/i,
    /^blank$/i,
    /^template$/i,
    /^instructions$/i,
    /^readme$/i,
    /^change\s*index$/i,
    /^change\s*log$/i,
    /^revision$/i,
    /^history$/i
]

/**
 * Check if a sheet name should be skipped
 */
export function shouldSkipSheet(sheetName: string): boolean {
    const normalized = sheetName.trim()

    for (const pattern of SKIP_SHEET_PATTERNS) {
        if (pattern.test(normalized)) {
            return true
        }
    }

    return false
}
