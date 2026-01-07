// Linking Diagnostics
// Helper to diagnose why robots/tools cannot be linked to cells

import { Cell, Robot, Tool } from '../domain/core'
import { normalizeAreaName, normalizeStationCode, buildStationId } from './normalizers'

/**
 * Diagnostic report for a failed link
 */
export interface LinkingDiagnostic {
  assetId: string
  assetName: string
  assetType: 'ROBOT' | 'TOOL'
  searchKey: {
    lineCode?: string
    stationCode?: string
    areaName?: string
  }
  possibleMatches: {
    cell: Cell
    matchScore: number
    matchReasons: string[]
    differences: string[]
  }[]
  recommendations: string[]
}

/**
 * Analyze why an asset couldn't be linked
 */
export function diagnoseFailedLink(
  asset: Robot | Tool,
  cells: Cell[]
): LinkingDiagnostic {
  const assetType = (asset as Robot).kind === 'ROBOT' ? 'ROBOT' : 'TOOL'

  const searchKey = {
    lineCode: asset.lineCode,
    stationCode: asset.stationNumber,
    areaName: asset.areaName
  }

  // Find potential matches with scoring
  const possibleMatches: LinkingDiagnostic['possibleMatches'] = []

  for (const cell of cells) {
    const matchReasons: string[] = []
    const differences: string[] = []
    let matchScore = 0

    // Check line code match
    if (asset.lineCode && cell.lineCode) {
      if (asset.lineCode === cell.lineCode) {
        matchReasons.push(`Line code matches: "${asset.lineCode}"`)
        matchScore += 3
      } else if (asset.lineCode.replace(/[_-]/g, '') === cell.lineCode.replace(/[_-]/g, '')) {
        matchReasons.push(`Line code similar (ignoring punctuation): "${asset.lineCode}" ≈ "${cell.lineCode}"`)
        matchScore += 2
      } else {
        differences.push(`Line code differs: asset="${asset.lineCode}" vs cell="${cell.lineCode}"`)
      }
    }

    // Check station code match
    if (asset.stationNumber && cell.code) {
      const normalizedAssetStation = normalizeStationCode(asset.stationNumber)
      const normalizedCellStation = normalizeStationCode(cell.code)

      if (normalizedAssetStation === normalizedCellStation) {
        matchReasons.push(`Station code matches (normalized): "${asset.stationNumber}" → "${normalizedAssetStation}"`)
        matchScore += 3
      } else if (asset.stationNumber === cell.code) {
        matchReasons.push(`Station code matches exactly: "${asset.stationNumber}"`)
        matchScore += 3
      } else {
        differences.push(`Station code differs: asset="${asset.stationNumber}" (normalized: "${normalizedAssetStation}") vs cell="${cell.code}" (normalized: "${normalizedCellStation}")`)
      }
    }

    // Check area name match
    if (asset.areaName && cell.areaId) {
      const normalizedAssetArea = normalizeAreaName(asset.areaName)
      // We need the cell's area name, not ID - this is a limitation
      // In practice, areaId should contain the area name
      const cellAreaParts = cell.areaId.split('|')
      const cellAreaName = cellAreaParts[cellAreaParts.length - 1]
      const normalizedCellArea = normalizeAreaName(cellAreaName)

      if (normalizedAssetArea === normalizedCellArea) {
        matchReasons.push(`Area matches (normalized): "${asset.areaName}" → "${normalizedAssetArea}"`)
        matchScore += 3
      } else {
        differences.push(`Area differs: asset="${asset.areaName}" (normalized: "${normalizedAssetArea}") vs cell area="${cellAreaName}" (normalized: "${normalizedCellArea}")`)
      }
    }

    // Include cells with at least 1 match
    if (matchScore > 0) {
      possibleMatches.push({
        cell,
        matchScore,
        matchReasons,
        differences
      })
    }
  }

  // Sort by match score (highest first)
  possibleMatches.sort((a, b) => b.matchScore - a.matchScore)

  // Generate recommendations
  const recommendations: string[] = []

  if (possibleMatches.length === 0) {
    recommendations.push('No similar cells found. Check if Simulation Status file contains this station.')
    recommendations.push(`Looking for: Line="${searchKey.lineCode}", Station="${searchKey.stationCode}", Area="${searchKey.areaName}"`)
  } else if (possibleMatches[0].matchScore < 5) {
    recommendations.push('Weak matches found. Check for typos or formatting differences in Excel files.')
    if (possibleMatches[0].differences.length > 0) {
      recommendations.push('Key differences: ' + possibleMatches[0].differences[0])
    }
  } else {
    recommendations.push('Close match found but not linked. This may be a bug in the linking logic.')
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    assetType,
    searchKey,
    possibleMatches: possibleMatches.slice(0, 5), // Top 5 matches
    recommendations
  }
}

/**
 * Diagnose all orphaned assets
 */
export function diagnoseOrphanedAssets(
  orphanedAssets: (Robot | Tool)[],
  cells: Cell[]
): LinkingDiagnostic[] {
  return orphanedAssets.map(asset => diagnoseFailedLink(asset, cells))
}

/**
 * Generate a detailed linking report
 */
export function generateLinkingReport(
  diagnostics: LinkingDiagnostic[]
): string {
  let report = '=== LINKING DIAGNOSTICS REPORT ===\n\n'
  report += `Total orphaned assets: ${diagnostics.length}\n\n`

  // Group by issue type
  const noMatchesFound = diagnostics.filter(d => d.possibleMatches.length === 0)
  const weakMatches = diagnostics.filter(d => d.possibleMatches.length > 0 && d.possibleMatches[0].matchScore < 5)
  const strongMatches = diagnostics.filter(d => d.possibleMatches.length > 0 && d.possibleMatches[0].matchScore >= 5)

  report += `Breakdown:\n`
  report += `  - No matches found: ${noMatchesFound.length}\n`
  report += `  - Weak matches (possible typos): ${weakMatches.length}\n`
  report += `  - Strong matches (linking bug?): ${strongMatches.length}\n\n`

  // Show details for first few of each category
  if (noMatchesFound.length > 0) {
    report += `\n--- NO MATCHES FOUND (${noMatchesFound.length} assets) ---\n`
    for (const diagnostic of noMatchesFound.slice(0, 3)) {
      report += `\n${diagnostic.assetType} "${diagnostic.assetName}" (${diagnostic.assetId})\n`
      report += `  Searching for:\n`
      report += `    Line: ${diagnostic.searchKey.lineCode || 'N/A'}\n`
      report += `    Station: ${diagnostic.searchKey.stationCode || 'N/A'}\n`
      report += `    Area: ${diagnostic.searchKey.areaName || 'N/A'}\n`
      report += `  ${diagnostic.recommendations[0]}\n`
    }
    if (noMatchesFound.length > 3) {
      report += `  ... and ${noMatchesFound.length - 3} more\n`
    }
  }

  if (weakMatches.length > 0) {
    report += `\n--- WEAK MATCHES (${weakMatches.length} assets) ---\n`
    for (const diagnostic of weakMatches.slice(0, 3)) {
      report += `\n${diagnostic.assetType} "${diagnostic.assetName}" (${diagnostic.assetId})\n`
      const topMatch = diagnostic.possibleMatches[0]
      report += `  Best match: Cell "${topMatch.cell.name}" (score: ${topMatch.matchScore}/9)\n`
      report += `  Reasons: ${topMatch.matchReasons.join(', ')}\n`
      report += `  Differences: ${topMatch.differences.join(', ')}\n`
    }
    if (weakMatches.length > 3) {
      report += `  ... and ${weakMatches.length - 3} more\n`
    }
  }

  if (strongMatches.length > 0) {
    report += `\n--- STRONG MATCHES NOT LINKED (${strongMatches.length} assets) ---\n`
    report += `These should have been linked. Possible bug in linking logic.\n`
    for (const diagnostic of strongMatches.slice(0, 3)) {
      report += `\n${diagnostic.assetType} "${diagnostic.assetName}" (${diagnostic.assetId})\n`
      const topMatch = diagnostic.possibleMatches[0]
      report += `  Should link to: Cell "${topMatch.cell.name}" (score: ${topMatch.matchScore}/9)\n`
      report += `  Reasons: ${topMatch.matchReasons.join(', ')}\n`
    }
  }

  return report
}

/**
 * Print linking report to console
 */
export function logLinkingReport(diagnostics: LinkingDiagnostic[]): void {
  const report = generateLinkingReport(diagnostics)
  console.log(report)
}
