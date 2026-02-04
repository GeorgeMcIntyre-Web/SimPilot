// Field Matcher - Column Profiles
// Functions for building column profiles from data

import type { ColumnProfile } from './types'

/**
 * Build column profiles from a header row and sample data
 */
export function buildColumnProfiles(
  headers: Array<string | null | undefined>,
  sampleRows: Array<Array<unknown>>,
  sheetCategory?: string
): ColumnProfile[] {
  const profiles: ColumnProfile[] = []

  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] ?? '').trim()

    if (header === '') {
      continue
    }

    // Collect values from this column
    const values: unknown[] = []
    for (const row of sampleRows) {
      if (row[i] !== null && row[i] !== undefined) {
        values.push(row[i])
      }
    }

    // Detect types
    const types = new Set<string>()
    for (const val of values) {
      types.add(typeof val)
    }

    // Get sample strings
    const samples = values
      .slice(0, 10)
      .map(v => String(v).trim())
      .filter(s => s.length > 0 && s.length < 100)

    // Calculate empty ratio
    const emptyCount = sampleRows.length - values.length
    const emptyRatio = sampleRows.length > 0 ? emptyCount / sampleRows.length : 0

    // Calculate unique ratio
    const uniqueValues = new Set(samples)
    const uniqueRatio = samples.length > 0 ? uniqueValues.size / samples.length : 0

    profiles.push({
      columnIndex: i,
      header,
      normalizedHeader: header.toLowerCase().trim(),
      detectedTypes: Array.from(types),
      sampleValues: samples,
      emptyRatio,
      uniqueRatio,
      sheetCategory
    })
  }

  return profiles
}
