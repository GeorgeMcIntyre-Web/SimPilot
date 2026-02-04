// Field Registry
// Canonical field definitions for SimPilot's domain views.
// Provides a single source of truth for field identifiers, synonyms, and expected types.

import { FIELD_DESCRIPTORS } from './fieldRegistry.descriptors'
import type { FieldDescriptor, FieldExpectedType, FieldId, FieldImportance } from './fieldRegistry.types'

export type { FieldDescriptor, FieldExpectedType, FieldId, FieldImportance }

// Registry accessors ---------------------------------------------------------

/** Get all field descriptors. */
export function getAllFieldDescriptors(): FieldDescriptor[] {
  return [...FIELD_DESCRIPTORS]
}

/** Get a field descriptor by its ID. */
export function getFieldDescriptorById(id: FieldId): FieldDescriptor | undefined {
  return FIELD_DESCRIPTORS.find(descriptor => descriptor.id === id)
}

/** Get field descriptors by importance level. */
export function getFieldDescriptorsByImportance(importance: FieldImportance): FieldDescriptor[] {
  return FIELD_DESCRIPTORS.filter(descriptor => descriptor.importance === importance)
}

/** Get field descriptors by expected type. */
export function getFieldDescriptorsByType(expectedType: FieldExpectedType): FieldDescriptor[] {
  return FIELD_DESCRIPTORS.filter(descriptor => descriptor.expectedType === expectedType)
}

/** Search field descriptors by synonym (case-insensitive). */
export function findFieldDescriptorsBySynonym(synonym: string): FieldDescriptor[] {
  const normalizedSynonym = synonym.toLowerCase().trim()

  return FIELD_DESCRIPTORS.filter(descriptor => {
    if (descriptor.canonicalName.toLowerCase() === normalizedSynonym) {
      return true
    }

    return descriptor.synonyms.some(s => s.toLowerCase() === normalizedSynonym)
  })
}

/** Get all unique field IDs. */
export function getAllFieldIds(): FieldId[] {
  return FIELD_DESCRIPTORS.map(descriptor => descriptor.id)
}

/** Check if a string is a valid FieldId. */
export function isValidFieldId(value: string): value is FieldId {
  return FIELD_DESCRIPTORS.some(descriptor => descriptor.id === value)
}
