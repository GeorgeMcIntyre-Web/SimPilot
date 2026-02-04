// Field Matcher - Field Registry
// Default field descriptors for SimPilot domain

import type { FieldDescriptor } from './types'

/**
 * Default field descriptors for SimPilot domain
 */
export const DEFAULT_FIELD_REGISTRY: FieldDescriptor[] = [
  // Identity fields
  {
    id: 'robot_id',
    name: 'Robot ID',
    role: 'ROBOT_ID',
    semanticDescription: 'Unique identifier for a robot, typically a number or code like R1, Robot-001',
    aliases: ['robotnumber', 'robot number', 'robot id', 'robot name', 'robot #'],
    expectedType: 'string',
    required: true,
    priority: 10
  },
  {
    id: 'tool_id',
    name: 'Tool ID',
    role: 'TOOL_ID',
    semanticDescription: 'Unique identifier for a tool or piece of equipment',
    aliases: ['tool id', 'tool name', 'tool number', 'tool #', 'equipment id'],
    expectedType: 'string',
    required: true,
    priority: 10
  },
  {
    id: 'gun_number',
    name: 'Gun Number',
    role: 'GUN_NUMBER',
    semanticDescription: 'Identifier for a welding gun or weld gun device',
    aliases: ['gun number', 'gun no', 'gun id', 'gun #', 'wg number', 'welding gun'],
    expectedType: 'string',
    required: false,
    priority: 9
  },
  {
    id: 'device_name',
    name: 'Device Name',
    role: 'DEVICE_NAME',
    semanticDescription: 'Name or identifier for a device or asset',
    aliases: ['device name', 'device id', 'asset description', 'equipment name'],
    expectedType: 'string',
    required: false,
    priority: 8
  },
  {
    id: 'serial_number',
    name: 'Serial Number',
    role: 'SERIAL_NUMBER',
    semanticDescription: 'Manufacturer serial number for tracking physical equipment',
    aliases: ['serial number', 'serial no', 'serial #', 's/n'],
    expectedType: 'string',
    required: false,
    priority: 7
  },

  // Location fields
  {
    id: 'area',
    name: 'Area',
    role: 'AREA',
    semanticDescription: 'Manufacturing area or zone name in the factory',
    aliases: ['area', 'area name', 'area code'],
    expectedType: 'string',
    required: false,
    priority: 8
  },
  {
    id: 'station',
    name: 'Station',
    role: 'STATION',
    semanticDescription: 'Work station or position on the assembly line',
    aliases: ['station', 'station number', 'station code', 'station no', 'station #'],
    expectedType: 'string',
    required: false,
    priority: 8
  },
  {
    id: 'line_code',
    name: 'Assembly Line',
    role: 'LINE_CODE',
    semanticDescription: 'Assembly line identifier or code',
    aliases: ['assembly line', 'line code', 'line', 'production line'],
    expectedType: 'string',
    required: false,
    priority: 7
  },
  {
    id: 'zone',
    name: 'Zone',
    role: 'ZONE',
    semanticDescription: 'Zone or location within an area',
    aliases: ['zone', 'location', 'position'],
    expectedType: 'string',
    required: false,
    priority: 5
  },
  {
    id: 'cell',
    name: 'Cell',
    role: 'CELL',
    semanticDescription: 'Manufacturing cell identifier',
    aliases: ['cell', 'cell code', 'cell name'],
    expectedType: 'string',
    required: false,
    priority: 6
  },

  // Status fields
  {
    id: 'reuse_status',
    name: 'Reuse Status',
    role: 'REUSE_STATUS',
    semanticDescription: 'Status indicating if equipment is reused, refurbished, or new',
    aliases: ['reuse status', 'reuse', 'refresment ok', 'refreshment ok', 'carry over'],
    expectedType: 'string',
    required: false,
    priority: 7
  },
  {
    id: 'sourcing',
    name: 'Sourcing',
    role: 'SOURCING',
    semanticDescription: 'How the equipment is being sourced or procured',
    aliases: ['sourcing', 'supply', 'source', 'procurement'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'project',
    name: 'Project',
    role: 'PROJECT',
    semanticDescription: 'Project name or identifier',
    aliases: ['project', 'project name', 'proyect', 'program'],
    expectedType: 'string',
    required: false,
    priority: 7
  },

  // Technical fields
  {
    id: 'gun_force',
    name: 'Gun Force',
    role: 'GUN_FORCE',
    semanticDescription: 'Force rating of a welding gun in Newtons or kN',
    aliases: ['gun force', 'force', 'max force', 'required force'],
    expectedType: 'number',
    required: false,
    priority: 8
  },
  {
    id: 'oem_model',
    name: 'OEM Model',
    role: 'OEM_MODEL',
    semanticDescription: 'Original equipment manufacturer model or order code',
    aliases: ['oem model', 'model', 'fanuc order code', 'manufacturer'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'robot_type',
    name: 'Robot Type',
    role: 'ROBOT_TYPE',
    semanticDescription: 'Type or category of robot',
    aliases: ['robot type', 'type', 'category'],
    expectedType: 'string',
    required: false,
    priority: 5
  },
  {
    id: 'payload',
    name: 'Payload',
    role: 'PAYLOAD',
    semanticDescription: 'Maximum payload capacity of the robot in kg',
    aliases: ['payload', 'capacity', 'load', 'payload kg'],
    expectedType: 'number',
    required: false,
    priority: 6
  },
  {
    id: 'reach',
    name: 'Reach',
    role: 'REACH',
    semanticDescription: 'Maximum reach distance of the robot arm in mm',
    aliases: ['reach', 'reach mm', 'arm length'],
    expectedType: 'number',
    required: false,
    priority: 6
  },
  {
    id: 'height',
    name: 'Height',
    role: 'HEIGHT',
    semanticDescription: 'Height of a riser or stand in mm',
    aliases: ['height', 'riser height', 'stand height'],
    expectedType: 'number',
    required: false,
    priority: 6
  },
  {
    id: 'brand',
    name: 'Brand',
    role: 'BRAND',
    semanticDescription: 'Brand or manufacturer name',
    aliases: ['brand', 'make', 'vendor'],
    expectedType: 'string',
    required: false,
    priority: 5
  },

  // Personnel fields
  {
    id: 'engineer',
    name: 'Engineer',
    role: 'ENGINEER',
    semanticDescription: 'Person responsible for the work or simulation',
    aliases: ['engineer', 'persons responsible', 'responsible', 'assigned to', 'owner'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'sim_leader',
    name: 'Sim Leader',
    role: 'SIM_LEADER',
    semanticDescription: 'Simulation team leader',
    aliases: ['sim. leader', 'sim leader', 'simulation leader'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'team_leader',
    name: 'Team Leader',
    role: 'TEAM_LEADER',
    semanticDescription: 'Team leader or manager',
    aliases: ['team leader', 'lead', 'manager'],
    expectedType: 'string',
    required: false,
    priority: 5
  },

  // Date fields
  {
    id: 'due_date',
    name: 'Due Date',
    role: 'DUE_DATE',
    semanticDescription: 'Target completion date for a task or simulation',
    aliases: ['due date', 'sim. due date', 'deadline', 'target date'],
    expectedType: 'date',
    required: false,
    priority: 6
  },
  {
    id: 'start_date',
    name: 'Start Date',
    role: 'START_DATE',
    semanticDescription: 'Start date of a task or project phase',
    aliases: ['start date', 'begin date'],
    expectedType: 'date',
    required: false,
    priority: 5
  },
  {
    id: 'end_date',
    name: 'End Date',
    role: 'END_DATE',
    semanticDescription: 'End or completion date',
    aliases: ['end date', 'finish date', 'completion date'],
    expectedType: 'date',
    required: false,
    priority: 5
  },

  // Other fields
  {
    id: 'comments',
    name: 'Comments',
    role: 'COMMENTS',
    semanticDescription: 'Notes, comments, or additional information',
    aliases: ['comments', 'comment', 'notes', 'remarks', 'description', 'coments'],
    expectedType: 'string',
    required: false,
    priority: 3
  },
  {
    id: 'quantity',
    name: 'Quantity',
    role: 'QUANTITY',
    semanticDescription: 'Count or quantity of items',
    aliases: ['quantity', 'qty', 'count', 'amount'],
    expectedType: 'number',
    required: false,
    priority: 5
  },
  {
    id: 'reserve',
    name: 'Reserve',
    role: 'RESERVE',
    semanticDescription: 'Reserve or spare quantity',
    aliases: ['reserve', 'spare', 'backup'],
    expectedType: 'number',
    required: false,
    priority: 4
  }
]
