import type { FieldDescriptor } from './fieldRegistry.types'

export const peopleAndLogisticsFieldDescriptors: FieldDescriptor[] = [
  {
    id: 'person_responsible',
    canonicalName: 'Person Responsible',
    synonyms: ['persons responsible', 'person responsible', 'responsible', 'person resp.', 'pers. responsible'],
    description: 'Person responsible for the work',
    expectedType: 'string',
    headerRegexes: [/persons?\s*resp/i, /responsible/i, /assigned\s*to/i],
    importance: 'medium'
  },
  {
    id: 'engineer',
    canonicalName: 'Engineer',
    synonyms: ['engineer', 'sim. employee', 'simulation employee'],
    description: 'Assigned engineer',
    expectedType: 'string',
    headerRegexes: [/engineer/i, /sim\.?\s*employee/i],
    importance: 'medium'
  },
  {
    id: 'sim_leader',
    canonicalName: 'Simulation Leader',
    synonyms: ['sim. leader', 'sim leader', 'simulation leader'],
    description: 'Simulation team leader',
    expectedType: 'string',
    headerRegexes: [/sim\.?\s*leader/i, /simulation\s*leader/i],
    importance: 'medium'
  },
  {
    id: 'team_leader',
    canonicalName: 'Team Leader',
    synonyms: ['team leader', 'lead', 'manager'],
    description: 'Team leader or manager',
    expectedType: 'string',
    headerRegexes: [/team\s*leader/i, /^lead$/i, /^manager$/i],
    importance: 'low'
  },
  {
    id: 'sourcing',
    canonicalName: 'Sourcing',
    synonyms: ['sourcing', 'supply', 'procurement', 'source'],
    description: 'Equipment sourcing method',
    expectedType: 'string',
    headerRegexes: [/sourcing/i, /supply/i, /procurement/i],
    importance: 'medium'
  },
  {
    id: 'reuse_status',
    canonicalName: 'Reuse Status',
    synonyms: ['reuse status', 'reuse', 'refresment ok', 'refreshment ok', 'carry over'],
    description: 'Equipment reuse/carryover status',
    expectedType: 'string',
    headerRegexes: [/reuse\s*(status)?/i, /refre[s]?ment/i, /carry\s*over/i],
    importance: 'high'
  },
  {
    id: 'lifecycle_status',
    canonicalName: 'Lifecycle Status',
    synonyms: ['lifecycle', 'status', 'equipment status'],
    description: 'Equipment lifecycle status',
    expectedType: 'string',
    headerRegexes: [/lifecycle/i, /equipment\s*status/i],
    importance: 'low'
  },
  {
    id: 'supplier',
    canonicalName: 'Supplier',
    synonyms: ['supplier', 'vendor', 'manufacturer', 'constructeur', 'fournisseur'],
    description: 'Equipment supplier or manufacturer',
    expectedType: 'string',
    headerRegexes: [/supplier/i, /vendor/i, /manufacturer/i, /constructeur/i, /fournisseur/i],
    importance: 'medium'
  },
  {
    id: 'brand',
    canonicalName: 'Brand',
    synonyms: ['brand', 'make'],
    description: 'Equipment brand',
    expectedType: 'string',
    headerRegexes: [/^brand$/i, /^make$/i],
    importance: 'low'
  },
  {
    id: 'model',
    canonicalName: 'Model',
    synonyms: ['model', 'model number'],
    description: 'Equipment model',
    expectedType: 'string',
    headerRegexes: [/^model$/i, /model\s*(number|no|#)?/i],
    importance: 'medium'
  },
  {
    id: 'oem_model',
    canonicalName: 'OEM Model',
    synonyms: ['oem model', 'oem', 'original model'],
    description: 'OEM equipment model designation',
    expectedType: 'string',
    headerRegexes: [/oem\s*(model)?/i],
    importance: 'low'
  },
  {
    id: 'height_mm',
    canonicalName: 'Height',
    synonyms: ['height', 'height mm', 'stand height'],
    description: 'Equipment height in mm',
    expectedType: 'number',
    expectedUnit: 'mm',
    headerRegexes: [/height/i, /stand\s*height/i],
    importance: 'low'
  },
  {
    id: 'riser_height',
    canonicalName: 'Riser Height',
    synonyms: ['riser height', 'robotriser', 'plinth'],
    description: 'Robot riser/plinth height',
    expectedType: 'number',
    expectedUnit: 'mm',
    headerRegexes: [/riser\s*height/i, /robotriser/i, /plinth/i],
    importance: 'medium'
  },
  {
    id: 'standard',
    canonicalName: 'Standard',
    synonyms: ['standard', 'standard equipment', 'dresspack specification'],
    description: 'Equipment standard/specification',
    expectedType: 'string',
    headerRegexes: [/^standard$/i, /standard\s*equip/i, /dresspack\s*spec/i],
    importance: 'low'
  },
  {
    id: 'quantity',
    canonicalName: 'Quantity',
    synonyms: ['quantity', 'qty', 'count', 'amount', 'number of pieces'],
    description: 'Equipment quantity',
    expectedType: 'integer',
    headerRegexes: [/quantity/i, /^qty$/i, /^count$/i, /^amount$/i, /number\s*of\s*pieces/i],
    importance: 'medium'
  },
  {
    id: 'reserve',
    canonicalName: 'Reserve',
    synonyms: ['reserve', 'spare', 'backup', 'additional'],
    description: 'Reserve/spare quantity',
    expectedType: 'integer',
    headerRegexes: [/reserve/i, /spare/i, /backup/i, /additional/i],
    importance: 'low'
  },
  {
    id: 'due_date',
    canonicalName: 'Due Date',
    synonyms: ['due date', 'deadline', 'target date', 'sim. due date'],
    description: 'Target completion date',
    expectedType: 'date',
    headerRegexes: [/due\s*date/i, /deadline/i, /target\s*date/i],
    importance: 'medium'
  },
  {
    id: 'install_date',
    canonicalName: 'Install Date',
    synonyms: ['install date', 'installation date', 'installed'],
    description: 'Equipment installation date',
    expectedType: 'date',
    headerRegexes: [/install(ation)?\s*date/i],
    importance: 'low'
  },
  {
    id: 'delivery_date',
    canonicalName: 'Delivery Date',
    synonyms: ['delivery date', 'date de besoin', 'lieferung'],
    description: 'Equipment delivery date',
    expectedType: 'date',
    headerRegexes: [/delivery\s*date/i, /date\s*de\s*besoin/i, /lieferung/i],
    importance: 'low'
  },
  {
    id: 'comment',
    canonicalName: 'Comments',
    synonyms: ['comments', 'comment', 'coments', 'remarques', 'bemerkungen'],
    description: 'General comments or notes',
    expectedType: 'string',
    headerRegexes: [/comments?/i, /coments/i, /remarques/i, /bemerkungen/i],
    importance: 'low'
  },
  {
    id: 'notes',
    canonicalName: 'Notes',
    synonyms: ['notes', 'remarks'],
    description: 'Additional notes',
    expectedType: 'string',
    headerRegexes: [/^notes$/i, /^remarks$/i],
    importance: 'low'
  },
  {
    id: 'description',
    canonicalName: 'Description',
    synonyms: ['description', 'desc'],
    description: 'Item description',
    expectedType: 'string',
    headerRegexes: [/description/i, /^desc$/i],
    importance: 'low'
  }
]
