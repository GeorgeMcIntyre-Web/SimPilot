import type { IngestionWarning, IngestionWarningKind } from '../../domain/core'
import type { SemanticAmbiguity, SemanticLayerArtifact } from './types'

const KIND_BY_AMBIGUITY: Record<SemanticAmbiguity['kind'], IngestionWarningKind> = {
  AMBIGUOUS_HEADER: 'HEADER_MISMATCH',
  UNMAPPED_HEADER: 'HEADER_MISMATCH',
  MISSING_REQUIRED_FIELD: 'HEADER_MISMATCH',
}

const SEMANTIC_KIND_BY_AMBIGUITY: Record<SemanticAmbiguity['kind'], string> = {
  AMBIGUOUS_HEADER: 'SEMANTIC_AMBIGUOUS_HEADER',
  UNMAPPED_HEADER: 'SEMANTIC_UNMAPPED_HEADER',
  MISSING_REQUIRED_FIELD: 'SEMANTIC_MISSING_REQUIRED_FIELD',
}

function ambiguityToWarning(
  ambiguity: SemanticAmbiguity,
  index: number,
  semanticLayer: SemanticLayerArtifact,
): IngestionWarning {
  return {
    id: `semantic-${ambiguity.kind.toLowerCase()}-${index}`,
    kind: KIND_BY_AMBIGUITY[ambiguity.kind],
    fileName: ambiguity.fileName,
    sheetName: ambiguity.sheetName,
    message: `[Semantic] ${ambiguity.message}`,
    details: {
      semanticKind: SEMANTIC_KIND_BY_AMBIGUITY[ambiguity.kind],
      semanticKindLegacy: ambiguity.kind,
      semanticDomain: ambiguity.domain,
      semanticHeader: ambiguity.header ?? '',
      semanticField: ambiguity.fieldKey ?? '',
      semanticCandidates: ambiguity.candidates?.join(', ') ?? '',
      semanticArtifact: semanticLayer.semanticArtifact ?? '',
      runId: semanticLayer.runId ?? '',
    },
    createdAt: new Date().toISOString(),
  }
}

export function semanticLayersToWarnings(
  semanticLayers: SemanticLayerArtifact[] | undefined,
): IngestionWarning[] {
  if (!semanticLayers || semanticLayers.length === 0) {
    return []
  }

  const warnings: IngestionWarning[] = []
  let cursor = 0

  for (const semanticLayer of semanticLayers) {
    for (const ambiguity of semanticLayer.ambiguities) {
      warnings.push(ambiguityToWarning(ambiguity, cursor, semanticLayer))
      cursor += 1
    }
  }

  return warnings
}
