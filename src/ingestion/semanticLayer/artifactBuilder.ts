import { resolveHeaderMappings } from './mappingRegistry'
import { validateSemanticMappings } from './semanticValidator'
import type {
  SemanticArtifactBundle,
  SemanticDomain,
  SemanticEdge,
  SemanticLayerArtifact,
  SemanticNode,
  SemanticReport,
} from './types'

export interface BuildSemanticLayerInput {
  domain: SemanticDomain
  fileName: string
  sheetName: string
  headers: string[]
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function addNode(nodes: Map<string, SemanticNode>, node: SemanticNode): void {
  if (nodes.has(node.id)) {
    return
  }

  nodes.set(node.id, node)
}

function addEdge(edges: Map<string, SemanticEdge>, edge: SemanticEdge): void {
  if (edges.has(edge.id)) {
    return
  }

  edges.set(edge.id, edge)
}

function aggregateReports(reports: SemanticReport[]): SemanticReport {
  const totals = reports.reduce(
    (acc, report) => ({
      totalHeaders: acc.totalHeaders + report.totalHeaders,
      mappedHeaders: acc.mappedHeaders + report.mappedHeaders,
      unmappedHeaders: acc.unmappedHeaders + report.unmappedHeaders,
      ambiguousHeaders: acc.ambiguousHeaders + report.ambiguousHeaders,
      missingRequiredFields: acc.missingRequiredFields + report.missingRequiredFields,
      totalAmbiguities: acc.totalAmbiguities + report.totalAmbiguities,
    }),
    {
      totalHeaders: 0,
      mappedHeaders: 0,
      unmappedHeaders: 0,
      ambiguousHeaders: 0,
      missingRequiredFields: 0,
      totalAmbiguities: 0,
    },
  )

  const coveragePercent =
    totals.totalHeaders === 0 ? 0 : Math.round((totals.mappedHeaders / totals.totalHeaders) * 100)

  return {
    ...totals,
    coveragePercent,
    sourceSheets: reports.length,
  }
}

export function buildSemanticLayerArtifact(input: BuildSemanticLayerInput): SemanticLayerArtifact {
  const resolution = resolveHeaderMappings(input.headers, input.domain)
  const { report, ambiguities } = validateSemanticMappings({
    fileName: input.fileName,
    sheetName: input.sheetName,
    resolution,
  })

  const nodeMap = new Map<string, SemanticNode>()
  const edgeMap = new Map<string, SemanticEdge>()

  const fileNodeId = `file:${slugify(input.fileName)}`
  const sheetNodeId = `sheet:${slugify(input.fileName)}:${slugify(input.sheetName)}`

  addNode(nodeMap, {
    id: fileNodeId,
    type: 'file',
    label: input.fileName,
    domain: input.domain,
  })
  addNode(nodeMap, {
    id: sheetNodeId,
    type: 'sheet',
    label: input.sheetName,
    domain: input.domain,
  })
  addEdge(edgeMap, {
    id: `edge:${fileNodeId}->${sheetNodeId}:contains`,
    type: 'CONTAINS',
    from: fileNodeId,
    to: sheetNodeId,
  })

  for (const mapping of resolution.mappings) {
    const headerNodeId = `header:${slugify(input.fileName)}:${slugify(input.sheetName)}:${mapping.columnIndex}`
    const headerLabel = mapping.header || `Column ${mapping.columnIndex + 1}`

    addNode(nodeMap, {
      id: headerNodeId,
      type: 'header',
      label: headerLabel,
      domain: input.domain,
    })

    addEdge(edgeMap, {
      id: `edge:${sheetNodeId}->${headerNodeId}:contains`,
      type: 'CONTAINS',
      from: sheetNodeId,
      to: headerNodeId,
    })

    if (mapping.status === 'mapped' && mapping.matchedField) {
      const fieldNodeId = `field:${input.domain}:${slugify(mapping.matchedField)}`
      addNode(nodeMap, {
        id: fieldNodeId,
        type: 'field',
        label: mapping.matchedField,
        domain: input.domain,
      })
      addEdge(edgeMap, {
        id: `edge:${headerNodeId}->${fieldNodeId}:maps_to`,
        type: 'MAPS_TO',
        from: headerNodeId,
        to: fieldNodeId,
        confidence: mapping.confidence,
      })
    }

    if (mapping.status === 'ambiguous') {
      for (const candidate of mapping.candidates) {
        const fieldNodeId = `field:${input.domain}:${slugify(candidate)}`
        addNode(nodeMap, {
          id: fieldNodeId,
          type: 'field',
          label: candidate,
          domain: input.domain,
        })
        addEdge(edgeMap, {
          id: `edge:${headerNodeId}->${fieldNodeId}:maps_to_ambiguous`,
          type: 'MAPS_TO',
          from: headerNodeId,
          to: fieldNodeId,
          confidence: mapping.confidence,
        })
      }
    }
  }

  return {
    domain: input.domain,
    fileName: input.fileName,
    sheetName: input.sheetName,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    report,
    ambiguities,
  }
}

export function mergeSemanticLayerArtifacts(
  fileName: string,
  artifacts: SemanticLayerArtifact[],
  sheetName = '*',
): SemanticLayerArtifact | undefined {
  if (artifacts.length === 0) {
    return undefined
  }

  const domain = artifacts[0].domain
  const nodeMap = new Map<string, SemanticNode>()
  const edgeMap = new Map<string, SemanticEdge>()
  const reports: SemanticReport[] = []
  const ambiguities = []

  for (const artifact of artifacts) {
    reports.push(artifact.report)
    ambiguities.push(...artifact.ambiguities)
    for (const node of artifact.nodes) {
      addNode(nodeMap, node)
    }
    for (const edge of artifact.edges) {
      addEdge(edgeMap, edge)
    }
  }

  return {
    domain,
    fileName,
    sheetName,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    report: aggregateReports(reports),
    ambiguities,
  }
}

export function buildSemanticArtifactBundle(
  runId: string,
  artifacts: SemanticLayerArtifact[] | undefined,
): SemanticArtifactBundle | undefined {
  if (!artifacts || artifacts.length === 0) {
    return undefined
  }

  const nodeMap = new Map<string, SemanticNode>()
  const edgeMap = new Map<string, SemanticEdge>()
  const reports: SemanticReport[] = []
  const ambiguities = []

  for (const artifact of artifacts) {
    reports.push(artifact.report)
    ambiguities.push(...artifact.ambiguities)
    for (const node of artifact.nodes) {
      addNode(nodeMap, node)
    }
    for (const edge of artifact.edges) {
      addEdge(edgeMap, edge)
    }
  }

  return {
    runId,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    report: aggregateReports(reports),
    ambiguities,
  }
}
