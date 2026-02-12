import type {
  SemanticDomain,
  SemanticFieldDefinition,
  SemanticHeaderMapping,
  SemanticMappingResolution,
} from './types'

export const SEMANTIC_PROFILE_NAME_BY_DOMAIN: Record<SemanticDomain, string> = {
  toolList: 'TOOL_LIST',
  simulationStatus: 'SIMULATION_STATUS',
  robotEquipmentList: 'ROBOT_EQUIPMENT_LIST',
  reuseList: 'REUSE_LIST',
}

export const SEMANTIC_MAPPING_REGISTRY: Record<SemanticDomain, SemanticFieldDefinition[]> = {
  toolList: [
    {
      domain: 'toolList',
      key: 'tool.areaName',
      aliases: ['AREA NAME', 'AREA', 'SUB AREA NAME', 'SHOP'],
      required: true,
    },
    {
      domain: 'toolList',
      key: 'tool.station',
      aliases: ['STATION', 'WORK CELL / STATION GROUP', 'STATION CODE', 'STATION NO. NEW'],
      required: true,
    },
    {
      domain: 'toolList',
      key: 'tool.equipmentType',
      aliases: ['EQUIPMENT TYPE', 'TYPE', 'TOOL TYPE', 'GUN TYPE'],
      required: false,
    },
    {
      domain: 'toolList',
      key: 'tool.equipmentNumber',
      aliases: ['EQUIPMENT NO', 'EQUIPMENT NO SHOWN', 'EQUIPMENT NO OPPOSITE'],
      required: false,
    },
    {
      domain: 'toolList',
      key: 'tool.toolingNumber',
      aliases: [
        'TOOL',
        'TOOLING NUMBER RH',
        'TOOLING NUMBER LH',
        'TOOLING NUMBER RH (OPPOSITE)',
        'TOOLING NUMBER LH (OPPOSITE)',
      ],
      required: false,
    },
  ],
  robotEquipmentList: [
    {
      domain: 'robotEquipmentList',
      key: 'robotEquipment.area',
      aliases: ['AREA', 'AREA NAME', 'INDEX', 'SUB AREA NAME', 'SHOP'],
      required: false,
    },
    {
      domain: 'robotEquipmentList',
      key: 'robotEquipment.station',
      aliases: ['STATION', 'STATION CODE', 'STATION NUMBER', 'STATION NO.', 'STATION NO. NEW'],
      required: true,
    },
    {
      domain: 'robotEquipmentList',
      key: 'robotEquipment.robot',
      aliases: [
        'ROBOT',
        'ROBOT ID',
        'ROBOT CAPTION',
        'ROBOTNUMBER',
        'ROBOTNUMBER (E-NUMBER)',
        'ROBOTS TOTAL',
        'ROBO NO. NEW',
      ],
      required: true,
    },
    {
      domain: 'robotEquipmentList',
      key: 'robotEquipment.installStatus',
      aliases: ['INSTALL STATUS', 'STATUS'],
      required: false,
    },
  ],
  reuseList: [
    {
      domain: 'reuseList',
      key: 'reuse.area',
      aliases: ['AREA', 'OLD AREA', 'SUB AREA NAME'],
      required: false,
    },
    {
      domain: 'reuseList',
      key: 'reuse.station',
      aliases: ['NEW STATION', 'NEW STATION ', 'STATION', 'STATION3', 'LOCATION'],
      required: true,
    },
    {
      domain: 'reuseList',
      key: 'reuse.tool',
      aliases: ['DEVICE NAME', 'TIP DRESSER', 'BRAND', 'PART NUMBER', 'SERIAL NUMBER COMPLETE WG'],
      required: true,
    },
    {
      domain: 'reuseList',
      key: 'reuse.robot',
      aliases: ['ROBOT', 'APPLICATION ROBOT', 'ROBOT STANDARD (CONFIRM)'],
      required: false,
    },
  ],
  simulationStatus: [
    {
      domain: 'simulationStatus',
      key: 'simulation.areaCode',
      aliases: ['AREA', 'AREA CODE', 'ZONE', 'SHORT NAME'],
      required: false,
    },
    {
      domain: 'simulationStatus',
      key: 'simulation.areaName',
      aliases: ['AREA NAME', 'AREA DESCRIPTION', 'FULL NAME'],
      required: false,
    },
    {
      domain: 'simulationStatus',
      key: 'simulation.assemblyLine',
      aliases: ['ASSEMBLY LINE', 'LINE', 'LINE CODE'],
      required: false,
    },
    {
      domain: 'simulationStatus',
      key: 'simulation.station',
      aliases: ['STATION NO. NEW', 'STATION', 'STATION CODE', 'STATION KEY', 'STATION NO.'],
      required: true,
    },
    {
      domain: 'simulationStatus',
      key: 'simulation.robot',
      aliases: ['ROBOT', 'ROBOT CAPTION', 'ROBOT NAME'],
      required: true,
    },
    {
      domain: 'simulationStatus',
      key: 'simulation.application',
      aliases: ['APPLICATION', 'APP'],
      required: false,
    },
    {
      domain: 'simulationStatus',
      key: 'simulation.personResponsible',
      aliases: [
        'PERSONS RESPONSIBLE',
        'PERSON RESPONSIBLE',
        'PERS. RESPONSIBLE',
        'PERS RESPONSIBLE',
        'ENGINEER',
        'RESPONSIBLE',
      ],
      required: false,
    },
  ],
}

export interface ResolveHeaderMappingsOptions {
  definitions?: SemanticFieldDefinition[]
}

export function normalizeHeaderLabel(header: string): string {
  return header.trim().toUpperCase().replace(/\s+/g, ' ')
}

function scoreAliasMatch(normalizedHeader: string, normalizedAlias: string): number {
  if (!normalizedHeader || !normalizedAlias) {
    return 0
  }

  if (normalizedHeader === normalizedAlias) {
    return 100
  }

  if (normalizedHeader.length < 3 || normalizedAlias.length < 3) {
    return 0
  }

  if (normalizedHeader.includes(normalizedAlias)) {
    return 60
  }

  if (normalizedAlias.includes(normalizedHeader)) {
    return 50
  }

  return 0
}

function mapHeader(
  header: string,
  columnIndex: number,
  definitions: SemanticFieldDefinition[],
): SemanticHeaderMapping {
  const normalizedHeader = normalizeHeaderLabel(header)

  if (!normalizedHeader) {
    return {
      header,
      normalizedHeader,
      columnIndex,
      status: 'unmapped',
      candidates: [],
      confidence: 0,
    }
  }

  const scores: Array<{ field: string; score: number }> = []
  for (const definition of definitions) {
    let bestScore = 0
    for (const alias of definition.aliases) {
      const normalizedAlias = normalizeHeaderLabel(alias)
      const score = scoreAliasMatch(normalizedHeader, normalizedAlias)
      if (score > bestScore) {
        bestScore = score
      }
    }
    if (bestScore === 0) {
      continue
    }
    scores.push({ field: definition.key, score: bestScore })
  }

  if (scores.length === 0) {
    return {
      header,
      normalizedHeader,
      columnIndex,
      status: 'unmapped',
      candidates: [],
      confidence: 0,
    }
  }

  const bestScore = Math.max(...scores.map((entry) => entry.score))
  const topCandidates = scores
    .filter((entry) => entry.score === bestScore)
    .map((entry) => entry.field)

  if (topCandidates.length === 1) {
    return {
      header,
      normalizedHeader,
      columnIndex,
      status: 'mapped',
      matchedField: topCandidates[0],
      candidates: topCandidates,
      confidence: bestScore,
    }
  }

  return {
    header,
    normalizedHeader,
    columnIndex,
    status: 'ambiguous',
    candidates: topCandidates,
    confidence: bestScore,
  }
}

export function resolveHeaderMappings(
  headers: string[],
  domain: SemanticDomain,
  options?: ResolveHeaderMappingsOptions,
): SemanticMappingResolution {
  const definitions = options?.definitions ?? SEMANTIC_MAPPING_REGISTRY[domain]
  const mappings = headers.map((header, index) => mapHeader(header, index, definitions))
  const requiredFields = definitions
    .filter((definition) => definition.required)
    .map((definition) => definition.key)

  return {
    domain,
    mappings,
    requiredFields,
  }
}
