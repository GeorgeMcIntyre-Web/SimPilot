// Excel Ingestion Types - Asset Classification
// Detailed asset kind classification and mapping functions

import type { AssetKind } from '../../domain/UnifiedModel'

/**
 * Detailed asset kind for Excel-level semantics.
 * Maps to existing AssetKind for compatibility:
 * - Robot → ROBOT
 * - WeldGun, TMSGun → GUN
 * - Gripper, Fixture, Riser, TipDresser, Measurement → TOOL
 * - Other → OTHER
 */
export type DetailedAssetKind =
  | 'Robot'
  | 'WeldGun'
  | 'Gripper'
  | 'Fixture'
  | 'Riser'
  | 'TipDresser'
  | 'TMSGun'
  | 'Measurement'
  | 'Other'

/**
 * Map DetailedAssetKind to existing AssetKind
 */
export function mapDetailedKindToAssetKind(detailedKind: DetailedAssetKind): AssetKind {
  switch (detailedKind) {
    case 'Robot':
      return 'ROBOT'
    case 'WeldGun':
    case 'TMSGun':
      return 'GUN'
    case 'Gripper':
    case 'Fixture':
    case 'Riser':
    case 'TipDresser':
    case 'Measurement':
      return 'TOOL'
    case 'Other':
      return 'OTHER'
  }
}

/**
 * Infer DetailedAssetKind from application code and context
 */
export function inferDetailedKind(input: {
  applicationCode?: string | null
  sheetCategory?: string | null
  assetName?: string | null
}): DetailedAssetKind {
  const app = (input.applicationCode ?? '').toUpperCase().trim()
  const sheet = (input.sheetCategory ?? '').toUpperCase().trim()
  const name = (input.assetName ?? '').toLowerCase().trim()

  // Sheet-based classification (highest priority)
  if (sheet.includes('RISER') || sheet.includes('RAISER')) {
    return 'Riser'
  }

  if (sheet.includes('TIP') && sheet.includes('DRESS')) {
    return 'TipDresser'
  }

  if (sheet.includes('TMS') && sheet.includes('WG')) {
    return 'TMSGun'
  }

  if (sheet.includes('WELD') && sheet.includes('GUN')) {
    return 'WeldGun'
  }

  // Application code classification
  if (app.includes('SW') || app.includes('SPOT') || app.includes('WELD')) {
    return 'WeldGun'
  }

  if (app.includes('MH') || app.includes('MATERIAL')) {
    return 'Gripper'
  }

  if (app.includes('IM') || app.includes('INSPECTION') || app.includes('MEASURE')) {
    return 'Measurement'
  }

  // Name-based hints
  if (name.includes('gun')) {
    return 'WeldGun'
  }

  if (name.includes('grip')) {
    return 'Gripper'
  }

  if (name.includes('riser') || name.includes('raiser')) {
    return 'Riser'
  }

  if (name.includes('fixture') || name.includes('jig')) {
    return 'Fixture'
  }

  if (name.includes('robot')) {
    return 'Robot'
  }

  return 'Other'
}
