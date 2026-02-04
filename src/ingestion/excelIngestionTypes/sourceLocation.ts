// Excel Ingestion Types - Source Location
// Simulation source and site location type definitions

/**
 * Classification of simulation work ownership
 */
export type SimulationSourceKind =
  | 'InternalSimulation'   // Work done by internal team (Durban/PE)
  | 'OutsourceSimulation'  // Work done by DesignOS

/**
 * Physical site location
 */
export type SiteLocation =
  | 'Durban'
  | 'PortElizabeth'
  | 'Unknown'
