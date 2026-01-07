// Ambiguity Collector
// Collects ambiguous resolutions and converts them to DiffAmbiguous format

import { DiffAmbiguous, EntityType, PlantKey } from '../domain/uidTypes'
import type { StationResolution, ToolResolution, RobotResolution } from './uidResolver'

export interface AmbiguousResolutionInput {
  key: string
  resolution: StationResolution | ToolResolution | RobotResolution
  entityType: EntityType
  plantKey: PlantKey
  attributes: Record<string, any>
}

/**
 * Collect ambiguous resolutions and convert to DiffAmbiguous format
 */
export function collectAmbiguousItems(
  resolutions: AmbiguousResolutionInput[]
): DiffAmbiguous[] {
  const ambiguous: DiffAmbiguous[] = []

  for (const { key, resolution, entityType, plantKey, attributes } of resolutions) {
    if (resolution.matchedVia === 'ambiguous' && resolution.candidates) {
      ambiguous.push({
        newKey: key,
        plantKey,
        entityType,
        newAttributes: attributes,
        candidates: resolution.candidates.map(c => ({
          uid: c.uid,
          key: c.key,
          plantKey: c.plantKey,
          matchScore: c.matchScore,
          reasons: c.reasons
        })),
        action: 'resolve'
      })
    }
  }

  return ambiguous
}
