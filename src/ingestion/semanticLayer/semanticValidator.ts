import type { SemanticAmbiguity, SemanticMappingResolution, SemanticReport } from './types'

export interface ValidateSemanticMappingsInput {
  fileName: string
  sheetName: string
  resolution: SemanticMappingResolution
}

export interface ValidateSemanticMappingsResult {
  report: SemanticReport
  ambiguities: SemanticAmbiguity[]
}

function buildCoveragePercent(mappedHeaders: number, totalHeaders: number): number {
  if (totalHeaders === 0) {
    return 0
  }

  return Math.round((mappedHeaders / totalHeaders) * 100)
}

export function validateSemanticMappings(
  input: ValidateSemanticMappingsInput,
): ValidateSemanticMappingsResult {
  const { fileName, sheetName, resolution } = input
  const mappedHeaders = resolution.mappings.filter((mapping) => mapping.status === 'mapped').length
  const unmappedHeaders = resolution.mappings.filter(
    (mapping) => mapping.status === 'unmapped',
  ).length
  const ambiguousHeaders = resolution.mappings.filter(
    (mapping) => mapping.status === 'ambiguous',
  ).length
  const mappedFields = new Set(
    resolution.mappings
      .filter((mapping) => mapping.status === 'mapped')
      .map((mapping) => mapping.matchedField)
      .filter((field): field is string => Boolean(field)),
  )
  const missingRequired = resolution.requiredFields.filter((field) => !mappedFields.has(field))

  const ambiguities: SemanticAmbiguity[] = []

  for (const mapping of resolution.mappings) {
    if (mapping.status === 'ambiguous') {
      ambiguities.push({
        id: `ambiguous-header-${sheetName}-${mapping.columnIndex}`,
        kind: 'AMBIGUOUS_HEADER',
        domain: resolution.domain,
        fileName,
        sheetName,
        header: mapping.header,
        candidates: mapping.candidates,
        message: `Header "${mapping.header}" matches multiple semantic fields: ${mapping.candidates.join(', ')}`,
      })
    }

    if (mapping.status === 'unmapped' && mapping.normalizedHeader !== '') {
      ambiguities.push({
        id: `unmapped-header-${sheetName}-${mapping.columnIndex}`,
        kind: 'UNMAPPED_HEADER',
        domain: resolution.domain,
        fileName,
        sheetName,
        header: mapping.header,
        message: `Header "${mapping.header}" has no semantic mapping`,
      })
    }
  }

  for (const missingField of missingRequired) {
    ambiguities.push({
      id: `missing-required-${sheetName}-${missingField}`,
      kind: 'MISSING_REQUIRED_FIELD',
      domain: resolution.domain,
      fileName,
      sheetName,
      fieldKey: missingField,
      message: `Required semantic field "${missingField}" is missing from headers`,
    })
  }

  const report: SemanticReport = {
    totalHeaders: resolution.mappings.length,
    mappedHeaders,
    unmappedHeaders,
    ambiguousHeaders,
    missingRequiredFields: missingRequired.length,
    totalAmbiguities: ambiguities.length,
    coveragePercent: buildCoveragePercent(mappedHeaders, resolution.mappings.length),
  }

  return {
    report,
    ambiguities,
  }
}
