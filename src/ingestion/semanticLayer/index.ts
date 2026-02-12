export {
  SEMANTIC_MAPPING_REGISTRY,
  normalizeHeaderLabel,
  resolveHeaderMappings,
} from './mappingRegistry'
export { validateSemanticMappings } from './semanticValidator'
export { buildSemanticLayerArtifact, mergeSemanticLayerArtifacts } from './artifactBuilder'
export { semanticLayersToWarnings } from './warningAdapter'
export type {
  SemanticAmbiguity,
  SemanticAmbiguityKind,
  SemanticDomain,
  SemanticEdge,
  SemanticEdgeType,
  SemanticFieldDefinition,
  SemanticHeaderMapping,
  SemanticLayerArtifact,
  SemanticMappingResolution,
  SemanticMappingStatus,
  SemanticNode,
  SemanticNodeType,
  SemanticReport,
} from './types'
