/**
 * Station matching and tooling linkage helpers.
 */
import { normalizeAreaName, normalizeStationCode } from '../normalizers'
import { SimulationStatusEntity } from './simulationStatusTypes'

export function stationMatches(simStation: string, toolStation: string): boolean {
  const normSim = normalizeStationCode(simStation)
  const normTool = normalizeStationCode(toolStation)

  if (!normSim || !normTool) return false
  if (normSim === normTool) return true

  if (toolStation.includes('-')) {
    const parts = toolStation.split('-')
    if (parts.length === 2) {
      const start = parseInt(normalizeStationCode(parts[0]) || '', 10)
      const end = parseInt(normalizeStationCode(parts[1]) || '', 10)
      const simNum = parseInt(normSim, 10)

      if (!isNaN(start) && !isNaN(end) && !isNaN(simNum)) {
        return simNum >= start && simNum <= end
      }
    }
  }

  return false
}

export function linkSimulationToTooling(
  simEntities: SimulationStatusEntity[],
  toolEntities: Array<{ canonicalKey: string; areaName: string; stationGroup: string }>
): void {
  for (const simEntity of simEntities) {
    const linkedKeys: string[] = []

    for (const toolEntity of toolEntities) {
      const normToolArea = normalizeAreaName(toolEntity.areaName)
      const normSimArea = normalizeAreaName(simEntity.area)

      if (normToolArea && normSimArea && normToolArea !== normSimArea) continue
      if (!stationMatches(simEntity.station, toolEntity.stationGroup)) continue

      linkedKeys.push(toolEntity.canonicalKey)
    }

    simEntity.linkedToolingEntityKeys = linkedKeys
  }
}
