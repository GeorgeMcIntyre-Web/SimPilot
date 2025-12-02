// Field Registry
// Canonical field definitions for SimPilot's domain views.
// Provides a single source of truth for field identifiers, synonyms, and expected types.

// ============================================================================
// FIELD ID
// ============================================================================

/**
 * Canonical field identifiers for SimPilot domain.
 * Each FieldId corresponds to a semantic concept used across the application.
 */
export type FieldId =
  // Hierarchy / Location
  | 'project_id'
  | 'area_name'
  | 'cell_id'
  | 'assembly_line'
  | 'station_name'
  | 'zone'
  | 'sector'
  // Robot Identity
  | 'robot_name'
  | 'robot_id'
  | 'robot_number'
  | 'robot_caption'
  | 'robot_type'
  | 'robot_order_code'
  // Robot Specs
  | 'payload_kg'
  | 'reach_mm'
  | 'track_length'
  // Tool / Gun Identity
  | 'tool_id'
  | 'gun_id'
  | 'gun_number'
  | 'device_name'
  | 'serial_number'
  // Gun Specs
  | 'gun_force_kn'
  | 'gun_force_n'
  | 'transformer_kva'
  // Application / Technology
  | 'application_code'
  | 'application_name'
  | 'technology_code'
  // Simulation Status
  | 'simulation_status'
  | 'stage_completion'
  | 'stage_1_completion'
  | 'final_deliverables'
  // Personnel
  | 'person_responsible'
  | 'engineer'
  | 'sim_leader'
  | 'team_leader'
  // Equipment Sourcing / Lifecycle
  | 'sourcing'
  | 'reuse_status'
  | 'lifecycle_status'
  // Reuse Allocation
  | 'old_project'
  | 'old_line'
  | 'old_station'
  | 'old_area'
  | 'target_project'
  | 'target_line'
  | 'target_station'
  | 'target_sector'
  // Equipment Details
  | 'supplier'
  | 'brand'
  | 'model'
  | 'oem_model'
  | 'height_mm'
  | 'riser_height'
  | 'standard'
  // Quantities
  | 'quantity'
  | 'reserve'
  // Dates
  | 'due_date'
  | 'install_date'
  | 'delivery_date'
  // Comments / Notes
  | 'comment'
  | 'notes'
  | 'description'
  // Process Stage Columns (Simulation Status sheets)
  | 'dcs_configured'
  | 'dress_pack_configured'
  | 'robot_position'
  | 'collisions_checked'
  | 'spot_welds_distributed'
  | 'weld_gun_selected'
  | 'weld_gun_approved'
  | 'gripper_created'
  | 'fixture_created'
  | 'layout_check'

// ============================================================================
// FIELD EXPECTED TYPE
// ============================================================================

/**
 * Expected data type for a field's values.
 */
export type FieldExpectedType =
  | 'string'
  | 'number'
  | 'integer'
  | 'date'
  | 'boolean'
  | 'percentage'
  | 'mixed'

// ============================================================================
// FIELD IMPORTANCE
// ============================================================================

/**
 * Importance level for matching prioritization.
 * High importance fields get preferential treatment when headers are ambiguous.
 */
export type FieldImportance = 'high' | 'medium' | 'low'

// ============================================================================
// FIELD DESCRIPTOR
// ============================================================================

/**
 * Complete descriptor for a canonical field.
 * Contains all metadata needed for column-to-field matching.
 */
export interface FieldDescriptor {
  /** Unique identifier for the field */
  id: FieldId
  /** Human-readable canonical name */
  canonicalName: string
  /** Alternative names/synonyms that map to this field (lowercase) */
  synonyms: string[]
  /** Description of what this field represents */
  description: string
  /** Expected data type for values */
  expectedType: FieldExpectedType
  /** Expected unit (e.g., 'kg', 'mm', 'kN') */
  expectedUnit?: string
  /** Regex patterns to match header text */
  headerRegexes?: RegExp[]
  /** Regex patterns to validate/match cell values */
  valueRegexes?: RegExp[]
  /** Importance level for matching priority */
  importance: FieldImportance
}

// ============================================================================
// FIELD REGISTRY DATA
// ============================================================================

/**
 * All canonical field descriptors for SimPilot.
 * This is the single source of truth for field definitions.
 */
const FIELD_DESCRIPTORS: FieldDescriptor[] = [
  // -------------------------------------------------------------------------
  // Hierarchy / Location Fields
  // -------------------------------------------------------------------------
  {
    id: 'project_id',
    canonicalName: 'Project',
    synonyms: ['project', 'project name', 'project code', 'proyect', 'program'],
    description: 'Project identifier or name',
    expectedType: 'string',
    headerRegexes: [/proyect/i, /project\s*(code|name|id)?/i, /program/i],
    importance: 'high'
  },
  {
    id: 'area_name',
    canonicalName: 'Area',
    synonyms: ['area', 'area name', 'area code', 'sector', 'gewerk'],
    description: 'Work area or sector within the project',
    expectedType: 'string',
    headerRegexes: [/^area$/i, /area\s*(name|code)?/i, /gewerk/i],
    importance: 'high'
  },
  {
    id: 'cell_id',
    canonicalName: 'Cell',
    synonyms: ['cell', 'cell id', 'cell code', 'cell name', 'vc cell'],
    description: 'Work cell identifier',
    expectedType: 'string',
    headerRegexes: [/cell\s*(id|code|name)?/i, /vc\s*cell/i],
    importance: 'high'
  },
  {
    id: 'assembly_line',
    canonicalName: 'Assembly Line',
    synonyms: ['assembly line', 'line', 'line code', 'assembly'],
    description: 'Assembly line identifier',
    expectedType: 'string',
    headerRegexes: [/assembly\s*line/i, /^line$/i, /line\s*(code)?/i],
    importance: 'high'
  },
  {
    id: 'station_name',
    canonicalName: 'Station',
    synonyms: ['station', 'station number', 'station code', 'station no'],
    description: 'Work station identifier',
    expectedType: 'string',
    headerRegexes: [/^station$/i, /station\s*(number|code|no|#)/i],
    importance: 'high'
  },
  {
    id: 'zone',
    canonicalName: 'Zone',
    synonyms: ['zone', 'location', 'position', 'zone/subzone'],
    description: 'Zone or location within area',
    expectedType: 'string',
    headerRegexes: [/zone/i, /location/i, /position/i],
    importance: 'medium'
  },
  {
    id: 'sector',
    canonicalName: 'Sector',
    synonyms: ['sector', 'sub-sector', 'sous-secteur', 'new sector'],
    description: 'Sector within project',
    expectedType: 'string',
    headerRegexes: [/secteur?/i, /sub.?sector/i],
    importance: 'medium'
  },

  // -------------------------------------------------------------------------
  // Robot Identity Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Robot Specs Fields
  // -------------------------------------------------------------------------
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
  },

  // -------------------------------------------------------------------------
  // Tool / Gun Identity Fields
  // -------------------------------------------------------------------------
  {
    id: 'tool_id',
    canonicalName: 'Tool ID',
    synonyms: ['tool id', 'tool-id', 'tool name', 'tool number', 'tool no', 'equipment id'],
    description: 'Tool or equipment identifier',
    expectedType: 'string',
    headerRegexes: [/tool[\s\-]*(id|name|number|no|#)/i, /equipment\s*id/i],
    importance: 'high'
  },
  {
    id: 'gun_id',
    canonicalName: 'Gun ID',
    synonyms: ['gun id', 'wg id', 'welding gun id'],
    description: 'Weld gun identifier',
    expectedType: 'string',
    headerRegexes: [/gun\s*id/i, /wg\s*id/i],
    importance: 'high'
  },
  {
    id: 'gun_number',
    canonicalName: 'Gun Number',
    synonyms: ['gun number', 'gun no', 'gun #', 'wg number', 'zangennummer'],
    description: 'Weld gun number',
    expectedType: 'string',
    headerRegexes: [/gun\s*(number|no|#)/i, /wg\s*(number|no|#)/i, /zangennummer/i],
    importance: 'high'
  },
  {
    id: 'device_name',
    canonicalName: 'Device Name',
    synonyms: ['device name', 'device', 'asset description', 'equipment name'],
    description: 'Device or equipment name',
    expectedType: 'string',
    headerRegexes: [/device\s*(name)?/i, /asset\s*description/i, /equipment\s*name/i],
    importance: 'high'
  },
  {
    id: 'serial_number',
    canonicalName: 'Serial Number',
    synonyms: ['serial number', 'serial no', 's/n', 'body serial number'],
    description: 'Equipment serial number',
    expectedType: 'string',
    headerRegexes: [/serial\s*(number|no|#)?/i, /s\/n/i, /body\s*serial/i],
    importance: 'medium'
  },

  // -------------------------------------------------------------------------
  // Gun Specs Fields
  // -------------------------------------------------------------------------
  {
    id: 'gun_force_kn',
    canonicalName: 'Gun Force (kN)',
    synonyms: ['gun force', 'force kn', 'weld force'],
    description: 'Weld gun force in kN',
    expectedType: 'number',
    expectedUnit: 'kN',
    headerRegexes: [/gun\s*force/i, /force.*kn/i, /weld\s*force/i],
    importance: 'high'
  },
  {
    id: 'gun_force_n',
    canonicalName: 'Gun Force (N)',
    synonyms: ['force [n]', 'force n', 'required force'],
    description: 'Weld gun force in Newtons',
    expectedType: 'number',
    expectedUnit: 'N',
    headerRegexes: [/force\s*\[?n\]?/i, /required\s*force/i],
    importance: 'high'
  },
  {
    id: 'transformer_kva',
    canonicalName: 'Transformer (kVA)',
    synonyms: ['transformer', 'transformer kva', 'trafo'],
    description: 'Transformer capacity in kVA',
    expectedType: 'number',
    expectedUnit: 'kVA',
    headerRegexes: [/transformer/i, /trafo/i],
    importance: 'low'
  },

  // -------------------------------------------------------------------------
  // Application / Technology Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Simulation Status Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Personnel Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Equipment Sourcing / Lifecycle Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Reuse Allocation Fields
  // -------------------------------------------------------------------------
  {
    id: 'old_project',
    canonicalName: 'Old Project',
    synonyms: ['old project', 'from project', 'source project', 'proyect'],
    description: 'Source project for reused equipment',
    expectedType: 'string',
    headerRegexes: [/old\s*project/i, /from\s*project/i, /source\s*project/i],
    importance: 'medium'
  },
  {
    id: 'old_line',
    canonicalName: 'Old Line',
    synonyms: ['old line', 'from line', 'source line'],
    description: 'Source assembly line for reused equipment',
    expectedType: 'string',
    headerRegexes: [/^old\s*line$/i, /from\s*line/i, /source\s*line/i],
    importance: 'high'
  },
  {
    id: 'old_station',
    canonicalName: 'Old Station',
    synonyms: ['old station', 'from station', 'source station'],
    description: 'Source station for reused equipment',
    expectedType: 'string',
    headerRegexes: [/^old\s*station$/i, /from\s*station/i, /source\s*station/i],
    importance: 'high'
  },
  {
    id: 'old_area',
    canonicalName: 'Old Area',
    synonyms: ['old area', 'from area', 'source area'],
    description: 'Source area for reused equipment',
    expectedType: 'string',
    headerRegexes: [/old\s*area/i, /from\s*area/i],
    importance: 'low'
  },
  {
    id: 'target_project',
    canonicalName: 'Target Project',
    synonyms: ['target project', 'new project', 'to project', 'stla/p1h/o1h/lpm'],
    description: 'Target project for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/target\s*project/i, /new\s*project/i, /stla.*p1h.*o1h/i],
    importance: 'medium'
  },
  {
    id: 'target_line',
    canonicalName: 'Target Line',
    synonyms: ['target line', 'new line', 'to line'],
    description: 'Target assembly line for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/^new\s*line$/i, /target\s*line/i, /to\s*line/i],
    importance: 'high'
  },
  {
    id: 'target_station',
    canonicalName: 'Target Station',
    synonyms: ['target station', 'new station', 'to station'],
    description: 'Target station for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/^new\s*station$/i, /target\s*station/i, /to\s*station/i],
    importance: 'high'
  },
  {
    id: 'target_sector',
    canonicalName: 'Target Sector',
    synonyms: ['target sector', 'new sector', 'to sector'],
    description: 'Target sector for equipment allocation',
    expectedType: 'string',
    headerRegexes: [/target\s*sector/i, /new\s*sector/i, /to\s*sector/i],
    importance: 'low'
  },

  // -------------------------------------------------------------------------
  // Equipment Details Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Quantity Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Date Fields
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Comments / Notes Fields
  // -------------------------------------------------------------------------
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
  },

  // -------------------------------------------------------------------------
  // Process Stage Columns (Simulation Status)
  // -------------------------------------------------------------------------
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

// ============================================================================
// REGISTRY ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all field descriptors.
 * @returns Array of all field descriptors
 */
export function getAllFieldDescriptors(): FieldDescriptor[] {
  return [...FIELD_DESCRIPTORS]
}

/**
 * Get a field descriptor by its ID.
 * @param id - The field ID to look up
 * @returns The field descriptor if found, undefined otherwise
 */
export function getFieldDescriptorById(id: FieldId): FieldDescriptor | undefined {
  return FIELD_DESCRIPTORS.find(descriptor => descriptor.id === id)
}

/**
 * Get field descriptors by importance level.
 * @param importance - The importance level to filter by
 * @returns Array of matching field descriptors
 */
export function getFieldDescriptorsByImportance(importance: FieldImportance): FieldDescriptor[] {
  return FIELD_DESCRIPTORS.filter(descriptor => descriptor.importance === importance)
}

/**
 * Get field descriptors by expected type.
 * @param expectedType - The expected type to filter by
 * @returns Array of matching field descriptors
 */
export function getFieldDescriptorsByType(expectedType: FieldExpectedType): FieldDescriptor[] {
  return FIELD_DESCRIPTORS.filter(descriptor => descriptor.expectedType === expectedType)
}

/**
 * Search field descriptors by synonym.
 * @param synonym - The synonym to search for (case-insensitive)
 * @returns Array of matching field descriptors
 */
export function findFieldDescriptorsBySynonym(synonym: string): FieldDescriptor[] {
  const normalizedSynonym = synonym.toLowerCase().trim()

  return FIELD_DESCRIPTORS.filter(descriptor => {
    // Check canonical name
    if (descriptor.canonicalName.toLowerCase() === normalizedSynonym) {
      return true
    }

    // Check synonyms
    return descriptor.synonyms.some(s => s.toLowerCase() === normalizedSynonym)
  })
}

/**
 * Get all unique field IDs.
 * @returns Array of all field IDs
 */
export function getAllFieldIds(): FieldId[] {
  return FIELD_DESCRIPTORS.map(descriptor => descriptor.id)
}

/**
 * Check if a string is a valid FieldId.
 * @param value - The value to check
 * @returns True if the value is a valid FieldId
 */
export function isValidFieldId(value: string): value is FieldId {
  return FIELD_DESCRIPTORS.some(descriptor => descriptor.id === value)
}
