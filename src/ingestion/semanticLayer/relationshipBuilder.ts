import type { SemanticAmbiguity, SemanticEdge, SemanticLayerArtifact, SemanticNode } from './types'

export interface SemanticRelationshipRecord {
  area?: string | null
  station?: string | null
  robot?: string | null
  tool?: string | null
  rowIndex?: number
}

export interface EnrichSemanticRelationshipsInput {
  artifact: SemanticLayerArtifact
  relationships: SemanticRelationshipRecord[]
  requiredFields?: Array<'station' | 'robot' | 'tool'>
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeValue(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  if (normalized.length === 0) {
    return undefined
  }

  return normalized
}

function addNode(nodeMap: Map<string, SemanticNode>, node: SemanticNode): void {
  if (nodeMap.has(node.id)) {
    return
  }

  nodeMap.set(node.id, node)
}

function addEdge(edgeMap: Map<string, SemanticEdge>, edge: SemanticEdge): void {
  if (edgeMap.has(edge.id)) {
    return
  }

  edgeMap.set(edge.id, edge)
}

function buildMissingRequiredAmbiguity(
  artifact: SemanticLayerArtifact,
  field: 'station' | 'robot' | 'tool',
  relationshipIndex: number,
  rowIndex: number | undefined,
): SemanticAmbiguity {
  const rowLabel =
    typeof rowIndex === 'number' ? `row ${rowIndex}` : `record ${relationshipIndex + 1}`
  const fieldKey = `${artifact.domain}.${field}`

  return {
    id: `missing-required-${artifact.sheetName}-${field}-${relationshipIndex}`,
    kind: 'MISSING_REQUIRED_FIELD',
    domain: artifact.domain,
    fileName: artifact.fileName,
    sheetName: artifact.sheetName,
    fieldKey,
    message: `Required semantic field "${fieldKey}" is missing in ${rowLabel}`,
  }
}

export function enrichSemanticArtifactWithRelationships(
  input: EnrichSemanticRelationshipsInput,
): SemanticLayerArtifact {
  const { artifact, relationships } = input

  if (relationships.length === 0) {
    return artifact
  }

  const nodeMap = new Map<string, SemanticNode>(artifact.nodes.map((node) => [node.id, node]))
  const edgeMap = new Map<string, SemanticEdge>(artifact.edges.map((edge) => [edge.id, edge]))
  const ambiguities: SemanticAmbiguity[] = [...artifact.ambiguities]
  const requiredFields = new Set(input.requiredFields ?? [])
  let addedMissingRequired = 0

  for (let i = 0; i < relationships.length; i++) {
    const relationship = relationships[i]
    const area = normalizeValue(relationship.area)
    const station = normalizeValue(relationship.station)
    const robot = normalizeValue(relationship.robot)
    const tool = normalizeValue(relationship.tool)

    if (!area && !station && !robot && !tool) {
      continue
    }

    if (requiredFields.has('station') && !station) {
      ambiguities.push(buildMissingRequiredAmbiguity(artifact, 'station', i, relationship.rowIndex))
      addedMissingRequired += 1
    }

    if (requiredFields.has('robot') && !robot) {
      ambiguities.push(buildMissingRequiredAmbiguity(artifact, 'robot', i, relationship.rowIndex))
      addedMissingRequired += 1
    }

    if (requiredFields.has('tool') && !tool) {
      ambiguities.push(buildMissingRequiredAmbiguity(artifact, 'tool', i, relationship.rowIndex))
      addedMissingRequired += 1
    }

    let areaNodeId = ''
    if (area) {
      areaNodeId = `area:${artifact.domain}:${slugify(area)}`
      addNode(nodeMap, {
        id: areaNodeId,
        type: 'area',
        label: area,
        domain: artifact.domain,
      })
    }

    let stationNodeId = ''
    if (station) {
      stationNodeId = `station:${artifact.domain}:${slugify(station)}`
      addNode(nodeMap, {
        id: stationNodeId,
        type: 'station',
        label: station,
        domain: artifact.domain,
      })
    }

    if (areaNodeId && stationNodeId) {
      addEdge(edgeMap, {
        id: `edge:${areaNodeId}->${stationNodeId}:area_groups_station`,
        type: 'AREA_GROUPS_STATION',
        from: areaNodeId,
        to: stationNodeId,
      })
    }

    if (robot) {
      const robotNodeId = `robot:${artifact.domain}:${slugify(robot)}`
      addNode(nodeMap, {
        id: robotNodeId,
        type: 'robot',
        label: robot,
        domain: artifact.domain,
      })

      if (stationNodeId) {
        addEdge(edgeMap, {
          id: `edge:${stationNodeId}->${robotNodeId}:station_to_robot`,
          type: 'STATION_TO_ROBOT',
          from: stationNodeId,
          to: robotNodeId,
        })
      }
    }

    if (tool) {
      const toolNodeId = `tool:${artifact.domain}:${slugify(tool)}`
      addNode(nodeMap, {
        id: toolNodeId,
        type: 'tool',
        label: tool,
        domain: artifact.domain,
      })

      if (stationNodeId) {
        addEdge(edgeMap, {
          id: `edge:${stationNodeId}->${toolNodeId}:station_to_tool`,
          type: 'STATION_TO_TOOL',
          from: stationNodeId,
          to: toolNodeId,
        })
      }
    }
  }

  return {
    ...artifact,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    ambiguities,
    report: {
      ...artifact.report,
      missingRequiredFields: artifact.report.missingRequiredFields + addedMissingRequired,
      totalAmbiguities:
        artifact.report.totalAmbiguities + ambiguities.length - artifact.ambiguities.length,
    },
  }
}
