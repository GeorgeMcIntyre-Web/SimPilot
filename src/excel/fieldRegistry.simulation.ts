import type { FieldDescriptor } from './fieldRegistry.types'

export const simulationFieldDescriptors: FieldDescriptor[] = [
  {
    id: 'application_code',
    canonicalName: 'Application Code',
    synonyms: ['application', 'application code', 'app code', 'application robot'],
    description: 'Application type code (e.g., SW, MH, HD)',
    expectedType: 'string',
    headerRegexes: [/application\s*(code)?/i, /app\s*code/i],
    importance: 'medium'
  },
  {
    id: 'application_name',
    canonicalName: 'Application Name',
    synonyms: ['application name', 'app name'],
    description: 'Full application type name',
    expectedType: 'string',
    headerRegexes: [/application\s*name/i],
    importance: 'low'
  },
  {
    id: 'technology_code',
    canonicalName: 'Technology Code',
    synonyms: ['technology', 'tech code', 'tech'],
    description: 'Technology classification code',
    expectedType: 'string',
    headerRegexes: [/tech(nology)?\s*(code)?/i],
    importance: 'low'
  },
  {
    id: 'simulation_status',
    canonicalName: 'Simulation Status',
    synonyms: ['simulation status', 'sim status', 'status'],
    description: 'Overall simulation completion status',
    expectedType: 'mixed',
    headerRegexes: [/simulation\s*status/i, /sim\s*status/i],
    importance: 'high'
  },
  {
    id: 'stage_completion',
    canonicalName: 'Stage Completion',
    synonyms: ['stage completion', 'completion', 'progress'],
    description: 'Stage completion percentage',
    expectedType: 'percentage',
    headerRegexes: [/stage\s*completion/i, /completion/i, /progress/i],
    importance: 'medium'
  },
  {
    id: 'stage_1_completion',
    canonicalName: '1st Stage Completion',
    synonyms: ['1st stage sim completion', '1st stage sim', 'stage 1'],
    description: 'First stage simulation completion',
    expectedType: 'percentage',
    headerRegexes: [/1st\s*stage/i, /stage\s*1/i],
    importance: 'high'
  },
  {
    id: 'final_deliverables',
    canonicalName: 'Final Deliverables',
    synonyms: ['final deliverables', 'final deliverables completion'],
    description: 'Final deliverables completion status',
    expectedType: 'percentage',
    headerRegexes: [/final\s*deliverables/i],
    importance: 'high'
  },
  {
    id: 'dcs_configured',
    canonicalName: 'DCS Configured',
    synonyms: ['dcs configured', 'dcs'],
    description: 'DCS configuration status',
    expectedType: 'percentage',
    headerRegexes: [/dcs\s*configured/i],
    importance: 'low'
  },
  {
    id: 'dress_pack_configured',
    canonicalName: 'Dress Pack Configured',
    synonyms: ['dress pack configured', 'dress pack', 'frying pan configured'],
    description: 'Dress pack configuration status',
    expectedType: 'percentage',
    headerRegexes: [/dress\s*pack/i, /frying\s*pan/i],
    importance: 'low'
  },
  {
    id: 'robot_position',
    canonicalName: 'Robot Position',
    synonyms: ['robot position', 'robot position - stage 1'],
    description: 'Robot position stage completion',
    expectedType: 'percentage',
    headerRegexes: [/robot\s*position/i],
    importance: 'low'
  },
  {
    id: 'collisions_checked',
    canonicalName: 'Collisions Checked',
    synonyms: ['collisions checked', 'collision check'],
    description: 'Collision check status',
    expectedType: 'percentage',
    headerRegexes: [/collision/i],
    importance: 'low'
  },
  {
    id: 'spot_welds_distributed',
    canonicalName: 'Spot Welds Distributed',
    synonyms: ['spot welds distributed', 'spot welds'],
    description: 'Spot weld distribution status',
    expectedType: 'percentage',
    headerRegexes: [/spot\s*weld/i],
    importance: 'low'
  },
  {
    id: 'weld_gun_selected',
    canonicalName: 'Weld Gun Selected',
    synonyms: ['reference weld gun selected', 'weld gun selected'],
    description: 'Weld gun selection status',
    expectedType: 'percentage',
    headerRegexes: [/weld\s*gun\s*selected/i, /reference\s*weld\s*gun/i],
    importance: 'low'
  },
  {
    id: 'weld_gun_approved',
    canonicalName: 'Weld Gun Approved',
    synonyms: ['final weld gun approved', 'weld gun approved'],
    description: 'Weld gun approval status',
    expectedType: 'percentage',
    headerRegexes: [/weld\s*gun\s*approved/i, /final\s*weld\s*gun/i],
    importance: 'low'
  },
  {
    id: 'gripper_created',
    canonicalName: 'Gripper Created',
    synonyms: ['gripper equipment prototype created', 'gripper created'],
    description: 'Gripper creation status',
    expectedType: 'percentage',
    headerRegexes: [/gripper.*created/i, /gripper.*prototype/i],
    importance: 'low'
  },
  {
    id: 'fixture_created',
    canonicalName: 'Fixture Created',
    synonyms: ['fixture equipment prototype created', 'fixture created'],
    description: 'Fixture creation status',
    expectedType: 'percentage',
    headerRegexes: [/fixture.*created/i, /fixture.*prototype/i],
    importance: 'low'
  },
  {
    id: 'layout_check',
    canonicalName: 'Layout Check',
    synonyms: ['latest layout in simulation', 'layout check', 'layout'],
    description: 'Layout verification status',
    expectedType: 'percentage',
    headerRegexes: [/layout/i],
    importance: 'low'
  }
]
