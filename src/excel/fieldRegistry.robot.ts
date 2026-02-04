import { FieldDescriptor } from './fieldRegistry.types'

export const robotFieldDescriptors: FieldDescriptor[] = [
  {
    id: 'robot_name',
    canonicalName: 'Robot Name',
    synonyms: ['robot', 'robot name'],
    description: 'Robot name or identifier',
    expectedType: 'string',
    headerRegexes: [/^robot$/i, /robot\s*name/i],
    importance: 'high'
  },
  {
    id: 'robot_id',
    canonicalName: 'Robot ID',
    synonyms: ['robot id', 'robot identifier', 'robotnumber', 'e-number'],
    description: 'Unique robot identifier',
    expectedType: 'string',
    headerRegexes: [/robot\s*(id|identifier)/i, /robotnumber/i, /e.?number/i],
    importance: 'high'
  },
  {
    id: 'robot_number',
    canonicalName: 'Robot Number',
    synonyms: ['robot number', 'robot no', 'robot #', 'no de robot'],
    description: 'Robot sequential number',
    expectedType: 'string',
    headerRegexes: [/robot\s*(number|no|#)/i, /n[°o]\s*de\s*robot/i],
    importance: 'high'
  },
  {
    id: 'robot_caption',
    canonicalName: 'Robot Caption',
    synonyms: ['robot caption', 'caption'],
    description: 'Robot display caption (e.g., R01, R02)',
    expectedType: 'string',
    headerRegexes: [/robot\s*caption/i, /^caption$/i],
    importance: 'medium'
  },
  {
    id: 'robot_type',
    canonicalName: 'Robot Type',
    synonyms: ['robot type', 'type robot', 'type', 'model'],
    description: 'Robot model/type classification',
    expectedType: 'string',
    headerRegexes: [/robot\s*type/i, /type\s*robot/i],
    importance: 'medium'
  },
  {
    id: 'robot_order_code',
    canonicalName: 'Robot Order Code',
    synonyms: ['order code', 'fanuc order code', 'dress pack order code'],
    description: 'Robot order/configuration code',
    expectedType: 'string',
    headerRegexes: [/order\s*code/i, /fanuc\s*order/i, /dress\s*pack.*order/i],
    importance: 'medium'
  },
  {
    id: 'payload_kg',
    canonicalName: 'Payload',
    synonyms: ['payload', 'payload kg', 'capacity', 'load', 'payload ok'],
    description: 'Robot payload capacity in kg',
    expectedType: 'number',
    expectedUnit: 'kg',
    headerRegexes: [/payload/i, /capacity/i, /^load$/i],
    importance: 'medium'
  },
  {
    id: 'reach_mm',
    canonicalName: 'Reach',
    synonyms: ['reach', 'reach mm', 'arm length', 'reach status'],
    description: 'Robot reach in mm',
    expectedType: 'number',
    expectedUnit: 'mm',
    headerRegexes: [/reach/i, /arm\s*length/i],
    importance: 'medium'
  },
  {
    id: 'track_length',
    canonicalName: 'Track Length',
    synonyms: ['track length', 'track', 'linear axis length', 'catrac'],
    description: 'Robot track/linear axis length',
    expectedType: 'number',
    expectedUnit: 'mm',
    headerRegexes: [/track\s*length/i, /linear\s*axis/i, /catrac/i],
    importance: 'low'
  }
]
