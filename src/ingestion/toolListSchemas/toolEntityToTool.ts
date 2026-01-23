/**
 * Tool Entity to Tool Converter
 *
 * Converts ToolEntity (schema adapter output) to Tool (domain model).
 */

import { Tool, ToolType, ToolMountType, AssetKind, EquipmentSourcing, generateId } from '../../domain/core'
import { ToolEntity, ProjectHint } from './normalizeToolListRow'
import { buildStationId } from '../normalizers'

// ============================================================================
// CONVERTER
// ============================================================================

/**
 * Convert ToolEntity to Tool domain object
 */
export function toolEntityToTool(entity: ToolEntity, projectHint: ProjectHint): Tool {
  const defaultToolType = detectToolTypeFromProject(projectHint)
  const kind = detectKindFromToolType(defaultToolType)

  const tool: Tool = {
    id: generateId('tool', entity.canonicalKey),
    kind,
    name: entity.displayCode,
    toolType: defaultToolType,
    mountType: 'UNKNOWN' as ToolMountType,
    areaName: entity.areaName || undefined,
    stationCode: entity.stationAtomic || undefined,
    stationNumber: entity.stationAtomic || undefined,
    stationId: buildStationId(entity.areaName, entity.stationAtomic),
    toolId: entity.canonicalKey,
    canonicalKey: entity.canonicalKey,
    toolNo: entity.displayCode,
    sourcing: 'UNKNOWN' as EquipmentSourcing,
    isActive: true,
    metadata: {
      ...entity.raw,
      stationGroup: entity.stationGroup,
      aliases: entity.aliases.join(',')
    },
    sourceFile: entity.source.file,
    sheetName: entity.source.sheet,
    rowIndex: entity.source.row
  }

  return tool
}

// ============================================================================
// HELPERS
// ============================================================================

function detectToolTypeFromProject(_projectHint: ProjectHint): ToolType {
  // Most automotive tool lists are weld guns
  return 'SPOT_WELD'
}

function detectKindFromToolType(toolType: ToolType): AssetKind {
  switch (toolType) {
    case 'SPOT_WELD':
      return 'GUN'
    case 'SEALER':
    case 'STUD_WELD':
    case 'GRIPPER':
      return 'TOOL'
    default:
      return 'OTHER'
  }
}
