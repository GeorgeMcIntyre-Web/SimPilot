export type SemanticDomain = 'toolList' | 'simulationStatus'

export type SemanticNodeType = 'file' | 'sheet' | 'header' | 'field'
export type SemanticEdgeType = 'CONTAINS' | 'MAPS_TO'
export type SemanticMappingStatus = 'mapped' | 'unmapped' | 'ambiguous'
export type SemanticAmbiguityKind =
  | 'AMBIGUOUS_HEADER'
  | 'UNMAPPED_HEADER'
  | 'MISSING_REQUIRED_FIELD'

export interface SemanticFieldDefinition {
  domain: SemanticDomain
  key: string
  aliases: string[]
  required: boolean
}

export interface SemanticHeaderMapping {
  header: string
  normalizedHeader: string
  columnIndex: number
  status: SemanticMappingStatus
  matchedField?: string
  candidates: string[]
  confidence: number
}

export interface SemanticMappingResolution {
  domain: SemanticDomain
  mappings: SemanticHeaderMapping[]
  requiredFields: string[]
}

export interface SemanticAmbiguity {
  id: string
  kind: SemanticAmbiguityKind
  domain: SemanticDomain
  fileName: string
  sheetName: string
  header?: string
  fieldKey?: string
  candidates?: string[]
  message: string
}

export interface SemanticReport {
  totalHeaders: number
  mappedHeaders: number
  unmappedHeaders: number
  ambiguousHeaders: number
  missingRequiredFields: number
  totalAmbiguities: number
  coveragePercent: number
  sourceSheets?: number
}

export interface SemanticNode {
  id: string
  type: SemanticNodeType
  label: string
  domain: SemanticDomain
}

export interface SemanticEdge {
  id: string
  type: SemanticEdgeType
  from: string
  to: string
  confidence?: number
}

export interface SemanticLayerArtifact {
  domain: SemanticDomain
  fileName: string
  sheetName: string
  nodes: SemanticNode[]
  edges: SemanticEdge[]
  report: SemanticReport
  ambiguities: SemanticAmbiguity[]
}
