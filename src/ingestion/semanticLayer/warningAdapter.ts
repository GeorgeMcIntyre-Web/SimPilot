import type { IngestionWarning, IngestionWarningKind } from '../../domain/core'
import type { SemanticAmbiguity, SemanticLayerArtifact } from './types'

const KIND_BY_AMBIGUITY: Record<SemanticAmbiguity['kind'], IngestionWarningKind> = {
  AMBIGUOUS_HEADER: 'SEMANTIC_AMBIGUOUS_HEADER',
  UNMAPPED_HEADER: 'SEMANTIC_UNMAPPED_HEADER',
  MISSING_REQUIRED_FIELD: 'SEMANTIC_MISSING_REQUIRED_FIELD',
}

function ambiguityToWarning(
  ambiguity: SemanticAmbiguity,
  index: number,
  ingestionRunId?: string,
): IngestionWarning {
  const idSuffix = ingestionRunId ?? 'no-run-id'
  return {
    id: `semantic-${idSuffix}-${ambiguity.kind.toLowerCase()}-${index}`,
    kind: KIND_BY_AMBIGUITY[ambiguity.kind],
    fileName: ambiguity.fileName,
    sheetName: ambiguity.sheetName,
    message: `[Semantic] ${ambiguity.message}`,
    details: {
      semanticKind: ambiguity.kind,
      semanticDomain: ambiguity.domain,
      semanticHeader: ambiguity.header ?? '',
      semanticField: ambiguity.fieldKey ?? '',
      semanticCandidates: ambiguity.candidates?.join(', ') ?? '',
      ...(ingestionRunId ? { ingestionRunId } : {}),
    },
    createdAt: new Date().toISOString(),
  }
}

export function semanticLayersToWarnings(
  semanticLayers: SemanticLayerArtifact[] | undefined,
  ingestionRunId?: string,
): IngestionWarning[] {
  if (!semanticLayers || semanticLayers.length === 0) {
    return []
  }

  const warnings: IngestionWarning[] = []
  let cursor = 0

  for (const semanticLayer of semanticLayers) {
    for (const ambiguity of semanticLayer.ambiguities) {
      warnings.push(ambiguityToWarning(ambiguity, cursor, ingestionRunId))
      cursor += 1
    }
  }

  return warnings
}
