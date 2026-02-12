export {
  SEMANTIC_MAPPING_REGISTRY,
  SEMANTIC_PROFILE_NAME_BY_DOMAIN,
  normalizeHeaderLabel,
  resolveHeaderMappings,
} from './mappingRegistry'
export { validateSemanticMappings } from './semanticValidator'
export { buildSemanticLayerArtifact, mergeSemanticLayerArtifacts } from './artifactBuilder'
export {
  enrichSemanticArtifactWithRelationships,
  type EnrichSemanticRelationshipsInput,
  type SemanticRelationshipRecord,
} from './relationshipBuilder'
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
