import { IngestionWarning, Robot, Tool } from '../domain/core'
import { createLinkingAmbiguousWarning, createLinkingMissingTargetWarning } from '../warningUtils'
import { EntityKind } from './types'

export const pushMissingTarget = (
  warnings: IngestionWarning[],
  kind: EntityKind,
  entity: Robot | Tool,
  matchKey: string,
  reason: string
): void => {
  warnings.push(createLinkingMissingTargetWarning({
    entityType: kind,
    entityId: entity.id,
    entityName: entity.name,
    fileName: entity.sourceFile ?? '',
    matchKey,
    reason
  }))
}

export const pushAmbiguous = (
  warnings: IngestionWarning[],
  kind: EntityKind,
  entity: Robot | Tool,
  candidateCount: number,
  matchKey: string
): void => {
  warnings.push(createLinkingAmbiguousWarning({
    entityType: kind,
    entityId: entity.id,
    fileName: entity.sourceFile ?? '',
    candidatesCount: candidateCount,
    matchKey
  }))
}
