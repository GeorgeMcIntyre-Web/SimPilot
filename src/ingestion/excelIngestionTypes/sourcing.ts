// Excel Ingestion Types - Sourcing Classification
// Equipment sourcing inference logic

import type { EquipmentSourcing } from '../../domain/UnifiedModel'

/**
 * Infer EquipmentSourcing from various signals.
 * Aligns with existing EquipmentSourcing type from UnifiedModel.
 *
 * Priority:
 * 1. Explicit "FREE ISSUE" markers → REUSE (free issue means reused from another project)
 * 2. Present in reuse list → REUSE
 * 3. Explicit "NEW" markers → NEW_BUY
 * 4. Explicit "MAKE" markers → MAKE
 * 5. Other REUSE patterns → REUSE
 * 6. Default → UNKNOWN
 */
export function inferSourcing(input: {
  isOnReuseList: boolean
  cellText?: string | null
  rawTags: string[]
  lifecycleHint?: string | null
}): EquipmentSourcing {
  // Normalize: join, lowercase, collapse whitespace
  const allText = [
    input.cellText ?? '',
    input.lifecycleHint ?? '',
    ...input.rawTags
  ].join(' ').toLowerCase().replace(/\s+/g, ' ').trim()

  // Explicit free issue → REUSE (check longer patterns first)
  if (
    allText.includes('free issue') ||
    allText.includes('free-issue') ||
    allText.includes('freeissue') ||
    allText.includes('f.i.') ||
    allText.includes('f/i') ||
    allText.includes(' fi ') ||
    allText.startsWith('fi ') ||
    allText.endsWith(' fi')
  ) {
    return 'REUSE'
  }

  // On reuse list → REUSE
  if (input.isOnReuseList) {
    return 'REUSE'
  }

  // Explicit new → NEW_BUY
  if (
    allText.includes(' new ') ||
    allText.startsWith('new ') ||
    allText.endsWith(' new') ||
    allText.includes('new buy') ||
    allText.includes('newbuy') ||
    allText.includes('new-buy') ||
    allText.includes('purchase') ||
    allText.includes('procure')
  ) {
    return 'NEW_BUY'
  }

  // Explicit make/custom → MAKE
  if (
    allText.includes('make') ||
    allText.includes('custom') ||
    allText.includes('fabricate') ||
    allText.includes('in-house') ||
    allText.includes('inhouse')
  ) {
    return 'MAKE'
  }

  // Explicit reuse hints
  if (
    allText.includes('reuse') ||
    allText.includes('re-use') ||
    allText.includes('carry over') ||
    allText.includes('carryover') ||
    allText.includes('carry-over') ||
    allText.includes('existing') ||
    allText.includes('retain') ||
    allText.includes('kept')
  ) {
    return 'REUSE'
  }

  return 'UNKNOWN'
}
