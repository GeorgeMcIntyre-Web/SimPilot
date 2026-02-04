import type { RolePattern } from './types'

// All known patterns for column role detection.
// Order matters - more specific patterns should come first.
// IMPORTANT: DO NOT "fix" typos - these match real-world headers exactly.
export const ROLE_PATTERNS: RolePattern[] = [
  // -------------------------------------------------------------------------
  // Technical Columns (checked first to avoid 'gun' matching before 'gun force')
  // -------------------------------------------------------------------------
  {
    role: 'GUN_FORCE',
    patterns: [
      'gun force [n]',
      'gun force',
      'force [n]',
      'max force',
      'required force'  // From GUN_FORCE files
      // Note: 'force' alone is too generic - removed to avoid false matches
    ],
    confidence: 'HIGH'
  },
  
  // -------------------------------------------------------------------------
  // Identity Columns (HIGH priority)
  // -------------------------------------------------------------------------
  {
    role: 'GUN_NUMBER',
    patterns: [
      'gun number',
      'gun no',
      'gun id',
      'gun #',
      'gun',
      'wg number',
      'wg id',
      'welding gun'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'DEVICE_NAME',
    patterns: [
      'device name',
      'device id',
      'device',
      'asset description',
      'equipment name',
      'equipment id'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'SERIAL_NUMBER',
    patterns: [
      'serial number complete wg',
      'serial number',
      'serial no',
      'serial #',
      's/n'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'TOOL_ID',
    patterns: [
      'tool id',
      'tool name',
      'tool number',
      'tool no',
      'tool #',
      'tool'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'ROBOT_ID',
    patterns: [
      'robotnumber',
      'robot number',
      'robot id',
      'robot name',
      'robot no',
      'robot #',
      'robot caption',
      'robotnumber (e-number)',
      'robot'
    ],
    confidence: 'HIGH'
  },

  // -------------------------------------------------------------------------
  // Date Columns (before Location to prevent 'deadline' matching 'line')
  // -------------------------------------------------------------------------
  {
    role: 'DUE_DATE',
    patterns: [
      'sim. due date (yyyy/mm/dd)',
      'sim. due date',
      'due date',
      'deadline',
      'date',
      'date required'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'START_DATE',
    patterns: [
      'start date',
      'planned start',
      'start'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'END_DATE',
    patterns: [
      'end date',
      'planned end',
      'finish date',
      'end'
    ],
    confidence: 'MEDIUM'
  },

  // -------------------------------------------------------------------------
  // Location Columns
  // -------------------------------------------------------------------------
  {
    role: 'AREA',
    patterns: [
      'area name',
      'area',
      'area code',
      'area description',
      'zone',
      'workcell'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'STATION',
    patterns: [
      'station',
      'station no',
      'station number',
      'station code',
      'station key',
      'station no. new',
      'new station'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'LINE_CODE',
    patterns: [
      'assembly line',
      'line code',
      'line',
      'new line'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'ZONE',
    patterns: [
      'zone',
      'cell',
      'zone name'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'CELL',
    patterns: [
      'cell',
      'cell name'
    ],
    confidence: 'LOW'
  },

  // -------------------------------------------------------------------------
  // Personnel Columns
  // -------------------------------------------------------------------------
  {
    role: 'ENGINEER',
    patterns: [
      'persons responsible',
      'person responsible',
      'engineer',
      'responsible',
      'assigned to'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'SIM_LEADER',
    patterns: [
      'sim. leader',
      'sim leader',
      'simulation leader'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'TEAM_LEADER',
    patterns: [
      'team leader',
      'teamlead'
    ],
    confidence: 'LOW'
  },

  // -------------------------------------------------------------------------
  // Status Columns
  // -------------------------------------------------------------------------
  {
    role: 'REUSE_STATUS',
    patterns: [
      'reuse',
      'reuse status',
      'reuse plan',
      'reuse yes/no'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'SOURCING',
    patterns: [
      'sourcing',
      'source',
      'sourcing status'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'PROJECT',
    patterns: [
      'project',
      'project code',
      'project name',
      'proyect' // common typo
    ],
    confidence: 'LOW'
  },

  // -------------------------------------------------------------------------
  // Technical Columns
  // -------------------------------------------------------------------------
  {
    role: 'OEM_MODEL',
    patterns: [
      'fanuc order code',
      'oem model',
      'model',
      'robot model'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'ROBOT_TYPE',
    patterns: [
      'robot type',
      'type'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'PAYLOAD',
    patterns: [
      'payload',
      'payload class'
    ],
    confidence: 'LOW'
  },
  {
    role: 'REACH',
    patterns: [
      'reach'
    ],
    confidence: 'LOW'
  },
  {
    role: 'HEIGHT',
    patterns: [
      'height',
      'riser height'
    ],
    confidence: 'LOW'
  },
  {
    role: 'BRAND',
    patterns: [
      'brand',
      'supplier'
    ],
    confidence: 'LOW'
  },

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------
  {
    role: 'COMMENTS',
    patterns: [
      'comments',
      'notes',
      'remarks',
      'coments' // common typo
    ],
    confidence: 'LOW'
  },

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------
  {
    role: 'QUANTITY',
    patterns: [
      'quantity',
      'qty',
      'count',
      'amount',
      'additional'  // From GUN_FORCE files - often indicates additional quantity
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'RESERVE',
    patterns: [
      'reserve',
      'spare',
      'backup',
      'additional'  // Can also indicate reserve/additional stock
    ],
    confidence: 'LOW'
  }
]
