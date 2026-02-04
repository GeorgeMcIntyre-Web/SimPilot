// Field Registry Types
// Canonical field identifiers and metadata contracts used across SimPilot's Excel ingestion pipeline.

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

export type FieldExpectedType =
  | 'string'
  | 'number'
  | 'integer'
  | 'date'
  | 'boolean'
  | 'percentage'
  | 'mixed'

export type FieldImportance = 'high' | 'medium' | 'low'

export interface FieldDescriptor {
  id: FieldId
  canonicalName: string
  synonyms: string[]
  description: string
  expectedType: FieldExpectedType
  expectedUnit?: string
  headerRegexes?: RegExp[]
  valueRegexes?: RegExp[]
  importance: FieldImportance
}
