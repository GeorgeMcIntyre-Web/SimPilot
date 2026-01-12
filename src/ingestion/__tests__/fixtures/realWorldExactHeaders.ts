// Real-World Exact Headers Fixtures
// These fixtures use EXACT headers from production Excel files:
// - STLA-S_UNDERBODY_Simulation_Status_DES.xlsx
// - STLA_S_ZAR Tool List.xlsx
//
// Purpose: Verify ingestion pipeline works with real production data structure

/**
 * EXACT_SIMULATION_STATUS: Mimics STLA-S_UNDERBODY_Simulation_Status_DES.xlsx
 *
 * Headers: EXACT match to production file (SIMULATION sheet)
 * Test data: Station "010", Robot "R01" for linking verification
 */
export const EXACT_SIMULATION_STATUS = [
    // Row 1: Headers (EXACT from STLA-S_UNDERBODY_Simulation_Status_DES.xlsx)
    [
        'PERSONS RESPONSIBLE',
        'AREA',
        'ASSEMBLY LINE',
        'STATION',
        'ROBOT',
        'APPLICATION',
        '1st STAGE SIM COMPLETION',
        'FINAL DELIVERABLES COMPLETION'
    ],

    // Row 2: Test data for Station 010 / Robot R01 (primary test case)
    [
        'John Doe',
        'Underbody',
        'L-01',
        '010',              // Station code for linking
        'R01',              // Robot name for linking
        'Spot Welding',
        75,                 // Sim completion %
        60                  // Final deliverables %
    ],

    // Row 3: Second test cell (Station 020 / Robot R02)
    [
        'Jane Smith',
        'Underbody',
        'L-01',
        '020',
        'R02',
        'Sealing',
        80,
        70
    ],

    // Row 4: Third test cell (to meet minimum 5 rows requirement)
    [
        'Bob Wilson',
        'Side Body',
        'L-02',
        '030',
        'R03',
        'Hemming',
        90,
        85
    ],

    // Row 5: Fourth test cell
    [
        'Sarah Chen',
        'Side Body',
        'L-02',
        '040',
        'R04',
        'Stud Welding',
        70,
        65
    ]
]

/**
 * EXACT_TOOL_LIST: Mimics STLA_S_ZAR Tool List.xlsx - ToolList sheet
 *
 * Headers: EXACT match to production file
 * CRITICAL: Column 2 (index 1) is EMPTY in production file - preserved here
 * Test data: Station "010" with "Werner Hamel" as Sim. Leader
 *
 * Vacuum columns (should appear in metadata):
 * - 'Sim. Leader'
 * - 'Sim. Employee'
 * - 'Sim. Due Date (yyyy/MM/dd)'
 * - 'Team Leader'
 * - 'Designer'
 * - 'SUB Area Name'
 */
export const EXACT_TOOL_LIST = [
    // Row 1: Headers (EXACT from STLA_S_ZAR Tool List.xlsx - ToolList sheet)
    // Added 'Equipment No Shown' so STLA schema can create entities
    [
        'ID',
        '',                                    // EMPTY column (index 1) - from production file
        'SUB Area Name',
        'Station',
        'Equipment No Shown',                  // Required for STLA schema to create entities
        'Sim. Leader',
        'Sim. Employee',
        'Sim. Due Date (yyyy/MM/dd)',
        'Team Leader',
        'Designer'
    ],

    // Row 2: Test data for Station 010 (links to EXACT_SIMULATION_STATUS)
    [
        'TOOL-001',
        '',                                    // Empty column (no data)
        'Underbody Sub-Area A',
        '010',                                 // Station code for linking
        'EQ-001',                              // Equipment No Shown - required for entity creation
        'Werner Hamel',                        // Unmapped → should vacuum to metadata
        'Alice Johnson',                       // Unmapped → should vacuum to metadata
        '2024/12/15',                          // Unmapped → should vacuum to metadata
        'Bob Smith',                           // Unmapped → should vacuum to metadata
        'Charlie Brown'                        // Unmapped → should vacuum to metadata
    ],

    // Row 3: Second test tool for Station 020
    [
        'TOOL-002',
        '',
        'Underbody Sub-Area B',
        '020',
        'EQ-002',                              // Equipment No Shown - required for entity creation
        'Lisa Mueller',
        'Tom Davis',
        '2024/12/20',
        'Emma Wilson',
        'Dave Lee'
    ]
]

/**
 * EXACT_EMPLOYEE_LIST: Mimics EmployeeList sheet in STLA_S_ZAR Tool List.xlsx
 *
 * Headers: EXACT match to production file
 * Purpose: Verify employees populate coreStore.referenceData.employees
 */
export const EXACT_EMPLOYEE_LIST = [
    // Row 1: Headers (EXACT from EmployeeList sheet)
    [
        'ID',
        'EmployeeList'
    ],

    // Row 2-4: Test employees (match names used in EXACT_TOOL_LIST)
    [
        'EMP-001',
        'Werner Hamel'
    ],
    [
        'EMP-002',
        'Lisa Mueller'
    ],
    [
        'EMP-003',
        'Alice Johnson'
    ]
]

/**
 * EXACT_SUPPLIER_LIST: Mimics SupplierList sheet in STLA_S_ZAR Tool List.xlsx
 *
 * Headers: EXACT match to production file
 * Purpose: Verify suppliers populate coreStore.referenceData.suppliers
 */
export const EXACT_SUPPLIER_LIST = [
    // Row 1: Headers (EXACT from SupplierList sheet)
    [
        'ID',
        'SupplierName'
    ],

    // Row 2-4: Test suppliers
    [
        'SUP-001',
        'ACME Robotics GmbH'
    ],
    [
        'SUP-002',
        'TechWeld Solutions'
    ],
    [
        'SUP-003',
        'Precision Tools Inc'
    ]
]
