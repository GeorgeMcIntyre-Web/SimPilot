import { Cell, Robot } from '../../domain/core'
import { normalizeStation, normalizeArea, normalizeLine, normalizeAssetName } from './normalizers'

export interface CellIndex {
  byStation: Map<string, Cell[]>
  byAreaAndStation: Map<string, Cell[]>
  byLineAndStation: Map<string, Cell[]>
  all: Cell[]
}

export interface RobotIndex {
  byStation: Map<string, Robot[]>
  byName: Map<string, Robot>
  all: Robot[]
}

export function buildCellIndex(cells: Cell[]): CellIndex {
  const byStation = new Map<string, Cell[]>()
  const byAreaAndStation = new Map<string, Cell[]>()
  const byLineAndStation = new Map<string, Cell[]>()

  for (const cell of cells) {
    const normalizedStation = normalizeStation(cell.code)

    if (normalizedStation) {
      const existing = byStation.get(normalizedStation) ?? []
      existing.push(cell)
      byStation.set(normalizedStation, existing)
    }

    const areaKey = `${normalizeArea(cell.name?.split(' - ')[0])}:${normalizedStation}`
    if (areaKey !== ':') {
      const existing = byAreaAndStation.get(areaKey) ?? []
      existing.push(cell)
      byAreaAndStation.set(areaKey, existing)
    }

    const lineKey = `${normalizeLine(cell.lineCode)}:${normalizedStation}`
    if (lineKey !== ':') {
      const existing = byLineAndStation.get(lineKey) ?? []
      existing.push(cell)
      byLineAndStation.set(lineKey, existing)
    }
  }

  return { byStation, byAreaAndStation, byLineAndStation, all: cells }
}

export function buildRobotIndex(robots: Robot[]): RobotIndex {
  const byStation = new Map<string, Robot[]>()
  const byName = new Map<string, Robot>()

  for (const robot of robots) {
    const normalizedStation = normalizeStation(robot.stationCode)
    if (normalizedStation) {
      const existing = byStation.get(normalizedStation) ?? []
      existing.push(robot)
      byStation.set(normalizedStation, existing)
    }

    const normalizedName = normalizeAssetName(robot.name)
    if (normalizedName) {
      byName.set(normalizedName, robot)
    }
  }

  return { byStation, byName, all: robots }
}
