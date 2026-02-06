import { Cell, Robot, Tool } from '../../domain/core'
import { CellIndex, RobotIndex } from './indexes'
import { normalizeStation, normalizeArea, normalizeLine } from './normalizers'
import { LinkConfidence } from './types'

export interface MatchResult<T> {
  match: T | null
  confidence: LinkConfidence
  method: string
  key: string
  ambiguous: boolean
  candidateCount: number
}

export interface AssetLike {
  stationCode?: string
  areaName?: string
  lineCode?: string
  name?: string
}

export function buildMatchResult<T>(options: {
  match: T | null
  confidence: LinkConfidence
  method: string
  key: string
  ambiguous?: boolean
  candidateCount?: number
}): MatchResult<T> {
  return {
    match: options.match,
    confidence: options.confidence,
    method: options.method,
    key: options.key,
    ambiguous: options.ambiguous ?? false,
    candidateCount: options.candidateCount ?? 0,
  }
}

/**
 * Find the best matching cell for an asset (robot or tool)
 */
export function findCellForAsset(asset: AssetLike, index: CellIndex): MatchResult<Cell> {
  const normalizedStation = normalizeStation(asset.stationCode)

  if (normalizedStation === '') {
    return buildMatchResult<Cell>({ match: null, confidence: 'LOW', method: 'none', key: '' })
  }

  if (asset.areaName) {
    const areaKey = `${normalizeArea(asset.areaName)}:${normalizedStation}`
    const areaMatches = index.byAreaAndStation.get(areaKey) ?? []

    if (areaMatches.length === 1) {
      return buildMatchResult({
        match: areaMatches[0],
        confidence: 'HIGH',
        method: 'area+station',
        key: areaKey,
        candidateCount: 1,
      })
    }

    if (areaMatches.length > 1) {
      return buildMatchResult({
        match: areaMatches[0],
        confidence: 'MEDIUM',
        method: 'area+station',
        key: areaKey,
        ambiguous: true,
        candidateCount: areaMatches.length,
      })
    }
  }

  if (asset.lineCode) {
    const lineKey = `${normalizeLine(asset.lineCode)}:${normalizedStation}`
    const lineMatches = index.byLineAndStation.get(lineKey) ?? []

    if (lineMatches.length === 1) {
      return buildMatchResult({
        match: lineMatches[0],
        confidence: 'HIGH',
        method: 'line+station',
        key: lineKey,
        candidateCount: 1,
      })
    }

    if (lineMatches.length > 1) {
      return buildMatchResult({
        match: lineMatches[0],
        confidence: 'MEDIUM',
        method: 'line+station',
        key: lineKey,
        ambiguous: true,
        candidateCount: lineMatches.length,
      })
    }
  }

  const stationMatches = index.byStation.get(normalizedStation) ?? []

  if (stationMatches.length === 1) {
    return buildMatchResult({
      match: stationMatches[0],
      confidence: 'MEDIUM',
      method: 'station',
      key: normalizedStation,
      candidateCount: 1,
    })
  }

  if (stationMatches.length > 1) {
    return buildMatchResult({
      match: stationMatches[0],
      confidence: 'LOW',
      method: 'station',
      key: normalizedStation,
      ambiguous: true,
      candidateCount: stationMatches.length,
    })
  }

  return buildMatchResult<Cell>({
    match: null,
    confidence: 'LOW',
    method: 'none',
    key: normalizedStation,
  })
}

/**
 * Find a robot that might own this tool
 */
export function findRobotForTool(tool: Tool, index: RobotIndex): MatchResult<Robot> {
  const normalizedStation = normalizeStation(tool.stationCode)

  if (normalizedStation) {
    const stationRobots = index.byStation.get(normalizedStation) ?? []

    if (stationRobots.length === 1) {
      return buildMatchResult({
        match: stationRobots[0],
        confidence: 'MEDIUM',
        method: 'station',
        key: normalizedStation,
        candidateCount: 1,
      })
    }

    if (stationRobots.length > 1) {
      return buildMatchResult({
        match: stationRobots[0],
        confidence: 'LOW',
        method: 'station',
        key: normalizedStation,
        ambiguous: true,
        candidateCount: stationRobots.length,
      })
    }
  }

  return buildMatchResult<Robot>({ match: null, confidence: 'LOW', method: 'none', key: '' })
}

export function buildMatchKeyString(
  stationCode?: string,
  areaName?: string,
  lineCode?: string,
): string {
  const parts: string[] = [
    stationCode ? `station:${stationCode}` : undefined,
    areaName ? `area:${areaName}` : undefined,
    lineCode ? `line:${lineCode}` : undefined,
  ].filter(Boolean) as string[]

  return parts.length > 0 ? parts.join(', ') : 'no matching criteria'
}
