import type { CellValue } from '../excelUtils'
import type { SimulationMetric } from './types'

/**
 * Parse a cell value into a percentage.
 * - Number 0-100 → percent = value
 * - String like "95%" → strip % and parse
 * - Otherwise → null
 */
export function parsePercent(value: CellValue): number | null {
  if (value === null || value === undefined) {
    return null
  }

  // Already a number
  if (typeof value === 'number') {
    // Assume values > 1 are percentages already
    if (value >= 0 && value <= 100) {
      return value
    }

    // If value is decimal like 0.95, convert to 95
    if (value >= 0 && value <= 1) {
      return Math.round(value * 100)
    }

    return null
  }

  // String parsing
  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed === '') {
      return null
    }

    // Handle percentage strings like "95%" or "95 %"
    const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%?$/)

    if (percentMatch) {
      const num = parseFloat(percentMatch[1])

      if (!isNaN(num) && num >= 0 && num <= 100) {
        return Math.round(num)
      }
    }

    // Handle decimal strings like "0.95"
    const decimalMatch = trimmed.match(/^0\.(\d+)$/)

    if (decimalMatch) {
      const num = parseFloat(trimmed)

      if (!isNaN(num) && num >= 0 && num <= 1) {
        return Math.round(num * 100)
      }
    }
  }

  return null
}

/**
 * Create a SimulationMetric from a header and cell value.
 */
export function createMetric(label: string, rawValue: CellValue): SimulationMetric {
  const percent = parsePercent(rawValue)

  // Normalize rawValue to string | number | null (handle boolean case)
  let normalizedRawValue: string | number | null
  if (typeof rawValue === 'boolean') {
    normalizedRawValue = rawValue ? 'true' : 'false'
  } else {
    normalizedRawValue = rawValue
  }

  return {
    label,
    percent,
    rawValue: normalizedRawValue
  }
}
