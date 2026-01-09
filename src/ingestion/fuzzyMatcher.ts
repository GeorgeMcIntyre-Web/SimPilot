// Fuzzy Matching for Ambiguity Detection
// Returns scored candidates when exact match not found

import {
  StationRecord,
  ToolRecord,
  RobotRecord,
  StationLabels,
  ToolLabels,
  RobotLabels,
  EntityUid,
  PlantKey
} from '../domain/uidTypes'

export interface FuzzyCandidate {
  uid: EntityUid
  key: string
  plantKey: PlantKey
  matchScore: number
  reasons: string[]
}

/**
 * Find fuzzy match candidates for a station
 * Never auto-resolves - returns scored candidates for user decision
 */
export function findStationCandidates(
  key: string,
  labels: StationLabels,
  plantKey: PlantKey,
  existingRecords: StationRecord[]
): FuzzyCandidate[] {
  const candidates: FuzzyCandidate[] = []

  for (const record of existingRecords) {
    if (record.key === key) continue // Exact match handled elsewhere
    if (record.plantKey !== plantKey) continue // Plant-scoped only

    const reasons: string[] = []
    let score = 0

    // Partial key match
    if (record.key.includes(key) || key.includes(record.key)) {
      score += 40
      reasons.push('Partial key match')
    }

    // Line match
    if (labels.line && record.labels.line) {
      const lineMatch = labels.line.toUpperCase() === record.labels.line.toUpperCase()
      if (lineMatch) {
        score += 20
        reasons.push(`Same line: ${labels.line}`)
      }
    }

    // Bay match
    if (labels.bay && record.labels.bay && labels.bay === record.labels.bay) {
      score += 20
      reasons.push(`Same bay: ${labels.bay}`)
    }

    // Station number match
    if (labels.stationNo && record.labels.stationNo) {
      if (labels.stationNo === record.labels.stationNo) {
        score += 30
        reasons.push(`Same station number: ${labels.stationNo}`)
      }
    }

    // Penalty for inactive
    if (record.status === 'inactive') {
      score -= 10
      reasons.push('Inactive')
    }

    if (score > 0) {
      candidates.push({
        uid: record.uid,
        key: record.key,
        plantKey: record.plantKey,
        matchScore: score,
        reasons
      })
    }
  }

  return candidates.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Find fuzzy match candidates for a tool
 */
export function findToolCandidates(
  key: string,
  labels: ToolLabels,
  plantKey: PlantKey,
  existingRecords: ToolRecord[]
): FuzzyCandidate[] {
  const candidates: FuzzyCandidate[] = []

  // TEMP DEBUG: Log when searching for collision-mutated tools
  const isCollisionKey = key.includes('COL')
  let debugChecked = 0
  let debugMatched = 0

  for (const record of existingRecords) {
    if (record.key === key) continue
    if (record.plantKey !== plantKey) continue

    const reasons: string[] = []
    let score = 0

    debugChecked++

    // Partial key match
    if (record.key.includes(key) || key.includes(record.key)) {
      score += 40
      reasons.push('Partial key match')
    }

    // Tool code match
    if (labels.toolCode && record.labels.toolCode) {
      const codeMatch = labels.toolCode.toUpperCase() === record.labels.toolCode.toUpperCase()
      if (codeMatch) {
        score += 30
        reasons.push(`Same tool code: ${labels.toolCode}`)
        if (isCollisionKey) {
          debugMatched++
        }
      }
    }

    // Gun number match
    if (labels.gunNumber && record.labels.gunNumber) {
      const gunMatch = labels.gunNumber.toUpperCase() === record.labels.gunNumber.toUpperCase()
      if (gunMatch) {
        score += 25
        reasons.push(`Same gun: ${labels.gunNumber}`)
      }
    }

    // Tool name match (normalized)
    if (labels.toolName && record.labels.toolName) {
      const normA = labels.toolName.toUpperCase().replace(/\s+/g, '')
      const normB = record.labels.toolName.toUpperCase().replace(/\s+/g, '')
      if (normA === normB) {
        score += 20
        reasons.push('Same tool name')
      }
    }

    if (record.status === 'inactive') {
      score -= 10
      reasons.push('Inactive')
    }

    if (score > 0) {
      candidates.push({
        uid: record.uid,
        key: record.key,
        plantKey: record.plantKey,
        matchScore: score,
        reasons
      })
    }
  }

  // TEMP DEBUG: Log collision key matching
  if (isCollisionKey) {
    console.log(`[FuzzyMatcher] Collision key "${key}" (toolCode="${labels.toolCode}"): checked ${debugChecked} existing records, matched ${debugMatched} by toolCode, found ${candidates.length} total candidates`)
    if (candidates.length > 0) {
      console.log(`  Top candidate: ${candidates[0].key} (score=${candidates[0].matchScore}, reasons: ${candidates[0].reasons.join(', ')})`)
    }
  }

  return candidates.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Find fuzzy match candidates for a robot
 */
export function findRobotCandidates(
  key: string,
  labels: RobotLabels,
  plantKey: PlantKey,
  existingRecords: RobotRecord[]
): FuzzyCandidate[] {
  const candidates: FuzzyCandidate[] = []

  for (const record of existingRecords) {
    if (record.key === key) continue
    if (record.plantKey !== plantKey) continue

    const reasons: string[] = []
    let score = 0

    // E-number is strongest match
    if (labels.eNumber && record.labels.eNumber) {
      const eMatch = labels.eNumber.toUpperCase() === record.labels.eNumber.toUpperCase()
      if (eMatch) {
        score += 50
        reasons.push(`Same E-number: ${labels.eNumber}`)
      }
    }

    // Robot caption match
    if (labels.robotCaption && record.labels.robotCaption) {
      const captionMatch = labels.robotCaption.toUpperCase() === record.labels.robotCaption.toUpperCase()
      if (captionMatch) {
        score += 30
        reasons.push(`Same robot: ${labels.robotCaption}`)
      }
    }

    // Robot name match
    if (labels.robotName && record.labels.robotName) {
      const normA = labels.robotName.toUpperCase().replace(/\s+/g, '')
      const normB = record.labels.robotName.toUpperCase().replace(/\s+/g, '')
      if (normA === normB) {
        score += 20
        reasons.push('Same robot name')
      }
    }

    // Partial key match
    if (record.key.includes(key) || key.includes(record.key)) {
      score += 40
      reasons.push('Partial key match')
    }

    if (record.status === 'inactive') {
      score -= 10
      reasons.push('Inactive')
    }

    if (score > 0) {
      candidates.push({
        uid: record.uid,
        key: record.key,
        plantKey: record.plantKey,
        matchScore: score,
        reasons
      })
    }
  }

  return candidates.sort((a, b) => b.matchScore - a.matchScore)
}
