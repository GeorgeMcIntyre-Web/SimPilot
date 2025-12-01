// Real-World Test Fixtures
// These fixtures mimic the EXACT messy headers and data found in user's Excel files
// Purpose: Ensure parsers handle real-world inconsistencies, not just "happy path" data

/**
 * MESSY_GUN_SHEET: Mimics GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx
 * 
 * Key characteristics:
 * - Misspelled headers: "Coments" instead of "Comments"
 * - Typo headers: "Refresment OK" instead of "Refreshment OK"
 * - Ambiguous sourcing: "CARRY OVER", "Existing", "Retain" (all mean REUSE)
 * - Unknown columns: "Supplier 2", "Robot Standard (Confirm)"
 * - Inconsistent data: Mixed case, extra spaces
 * 
 * Note: Must include GUN, TYPE, LINE to match POSSIBLE_HEADERS in parser
 */
export const MESSY_GUN_SHEET = [
    // Row 1: Headers (with real-world typos and inconsistencies)
    [
        'GUN',              // Required for header detection
        'Type',             // Required for header detection
        'Line',             // Required for header detection
        'Station',
        'Zone',
        'Coments',           // TYPO: Should be "Comments"
        'Refresment OK',     // TYPO: Should be "Refreshment OK"
        'Status',
        'Supplier 2',        // UNKNOWN: Not in standard schema
        'Robot Standard (Confirm)', // UNKNOWN: Not in standard schema
        'Asset description'  // UNKNOWN: Not in standard schema
    ],

    // Row 2: Data with "CARRY OVER" sourcing
    [
        'G-101',
        'Spot Weld Gun',
        'L-01',
        'OP-20',
        'P1Mx',
        'Issues with tip dresser',
        'Yes',
        'CARRY OVER',        // Should map to REUSE
        'ACME Corp',
        'R-2000i/210F',
        'Pneumatic spot weld gun with extended arm'
    ],

    // Row 3: Data with "Existing" sourcing
    [
        'G-202',
        'Servo Gun',
        'L-01',
        'OP-30',
        'P2Ux',
        '',
        'No',
        'Existing',          // Should map to REUSE
        'BETA Inc',
        '',
        'Servo gun for underbody'
    ],

    // Row 4: Data with "Retain" sourcing
    [
        'G-303',
        'Spot Weld',
        'L-02',
        'OP-50',
        'P1Dx',
        'Needs maintenance',
        'Yes',
        'Retain',            // Should map to REUSE
        '',
        'R-2000i/165F',
        ''
    ],

    // Row 5: Data with "NEW" sourcing
    [
        'G-404',
        'Pneumatic Gun',
        'L-03',
        'OP-60',
        'P3Ax',
        'New station requirement',
        '',
        'NEW',               // Should map to NEW_BUY
        'GAMMA Ltd',
        'R-2000i/210F',
        'New pneumatic gun for side body'
    ],

    // Row 6: Empty row (should be skipped)
    [],

    // Row 7: Data with ambiguous sourcing (should default to UNKNOWN)
    [
        'G-505',
        'Weld Gun',
        'L-01',
        'OP-70',
        'P1Mx',
        'TBD',
        '',
        '',                  // No status - should map to UNKNOWN
        '',
        '',
        ''
    ]
]

/**
 * MESSY_ROBOT_SHEET: Mimics robot list with similar messiness
 * Note: Avoid 'Reach' keyword as it triggers SimulationStatus detection
 */
export const MESSY_ROBOT_SHEET = [
    // Row 1: Headers (includes 'Fanuc Order Code' which identifies as RobotList)
    [
        'Area',
        'Station Code',
        'Robot ID',
        'Fanuc Order Code',
        'Model Descripton',  // TYPO: Should be "Description"
        'Max Extension (mm)',
        'Payload',
        'Reuse Stauts'       // TYPO: Should be "Status"
    ],

    // Row 2: Data
    [
        'Underbody',
        'OP-10',
        'R-001',
        'R-2000i/210F',
        'Spot welding robot with 210kg payload',
        '2655',
        '210',
        'CARRY OVER'
    ],

    // Row 3: Data with partial information
    [
        'Side Body',
        'OP-20',
        'R-002',
        'R-2000i/165F',
        '',
        '2655',
        '',
        'Existing'
    ]
]

/**
 * MESSY_SIMULATION_SHEET: Mimics simulation status with inconsistencies
 * Note: Simulation parser requires at least 5 rows (1 header + 4 data)
 */
export const MESSY_SIMULATION_SHEET = [
    // Row 1: Headers (matching required AREA, ASSEMBLY LINE, STATION, ROBOT, APPLICATION)
    [
        'AREA',
        'ASSEMBLY LINE',
        'STATION',
        'ROBOT',
        'APPLICATION',
        '1st Stage Sim',     // Inconsistent naming
        'Reach Status',
        'Coments'            // TYPO
    ],

    // Row 2: Data
    [
        'P1Mx',
        'BN_B05',
        'OP-10',
        'R-001',
        'Spot Welding',
        'PASS',
        'OK',
        'Initial simulation complete'
    ],

    // Row 3: Data
    [
        'P2Ux',
        'BN_B05',
        'OP-20',
        'R-002',
        'Sealing',
        'FAIL',
        'NEEDS_REVIEW',
        'Reach issue on rear door'
    ],

    // Row 4: Data
    [
        'P1Mx',
        'BN_B05',
        'OP-30',
        'R-003',
        'Spot Welding',
        'PASS',
        'OK',
        'Completed'
    ],

    // Row 5: Data
    [
        'P2Ux',
        'BN_B05',
        'OP-40',
        'R-004',
        'Sealing',
        'IN_PROGRESS',
        'PENDING',
        'Work in progress'
    ]
]

/**
 * GARBAGE_SHEET: Completely invalid data for resilience testing
 */
export const GARBAGE_SHEET = [
    ['!!!', '@@@', '###'],
    [123, 456, 789],
    [null, undefined, ''],
    ['', '', '']
]

/**
 * PARTIAL_SHEET: Minimal valid data
 */
export const PARTIAL_SHEET = [
    ['GUN ID', 'TYPE', 'LINE'],
    ['G-100', '', 'L-01'],
    ['G-200', null, 'L-02']
]
