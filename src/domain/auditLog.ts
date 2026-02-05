// Audit Log System
// Tracks all registry changes with timestamp, user, action, and reason

import { EntityUid, EntityType } from './uidTypes'

// ============================================================================
// AUDIT ENTRY TYPES
// ============================================================================

export type AuditAction =
  | 'activate'
  | 'deactivate'
  | 'add_alias'
  | 'override_label'
  | 'update_attributes'
  | 'create_entity'
  | 'delete_entity'

/**
 * AuditEntry: Single record of a registry change
 */
export interface AuditEntry {
  id: string // Unique ID
  timestamp: string // ISO timestamp
  user?: string // User ID/email if available
  entityType: EntityType
  entityUid: EntityUid
  entityKey: string // Canonical key at time of action (for readability)
  action: AuditAction
  oldValue?: any // Previous value (for updates)
  newValue?: any // New value (for updates)
  reason?: string // User-provided reason
  metadata?: Record<string, any> // Additional context
}

// ============================================================================
// AUDIT ENTRY CREATION
// ============================================================================

/**
 * Create an audit entry for entity activation
 */
export function createActivateAuditEntry(
  entityUid: EntityUid,
  entityType: EntityType,
  entityKey: string,
  reason?: string,
  user?: string,
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user,
    entityType,
    entityUid,
    entityKey,
    action: 'activate',
    oldValue: 'inactive',
    newValue: 'active',
    reason,
  }
}

/**
 * Create an audit entry for entity deactivation
 */
export function createDeactivateAuditEntry(
  entityUid: EntityUid,
  entityType: EntityType,
  entityKey: string,
  reason?: string,
  user?: string,
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user,
    entityType,
    entityUid,
    entityKey,
    action: 'deactivate',
    oldValue: 'active',
    newValue: 'inactive',
    reason,
  }
}

/**
 * Create an audit entry for adding an alias rule
 */
export function createAddAliasAuditEntry(
  entityUid: EntityUid,
  entityType: EntityType,
  entityKey: string,
  fromKey: string,
  reason?: string,
  user?: string,
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user,
    entityType,
    entityUid,
    entityKey,
    action: 'add_alias',
    oldValue: null,
    newValue: fromKey,
    reason,
    metadata: { fromKey },
  }
}

/**
 * Create an audit entry for label override
 */
export function createOverrideLabelAuditEntry(
  entityUid: EntityUid,
  entityType: EntityType,
  entityKey: string,
  field: string,
  oldLabel: string | undefined,
  newLabel: string,
  reason?: string,
  user?: string,
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user,
    entityType,
    entityUid,
    entityKey,
    action: 'override_label',
    oldValue: oldLabel,
    newValue: newLabel,
    reason,
    metadata: { field },
  }
}

/**
 * Create an audit entry for attribute update
 */
export function createUpdateAttributesAuditEntry(
  entityUid: EntityUid,
  entityType: EntityType,
  entityKey: string,
  changedFields: string[],
  oldAttributes: Record<string, any>,
  newAttributes: Record<string, any>,
  reason?: string,
  user?: string,
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user,
    entityType,
    entityUid,
    entityKey,
    action: 'update_attributes',
    oldValue: oldAttributes,
    newValue: newAttributes,
    reason,
    metadata: { changedFields },
  }
}

/**
 * Create an audit entry for entity creation
 */
export function createEntityCreationAuditEntry(
  entityUid: EntityUid,
  entityType: EntityType,
  entityKey: string,
  source: 'manual' | 'import',
  reason?: string,
  user?: string,
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user,
    entityType,
    entityUid,
    entityKey,
    action: 'create_entity',
    oldValue: null,
    newValue: source,
    reason,
    metadata: { source },
  }
}

/**
 * Create an audit entry for entity deletion
 */
export function createEntityDeletionAuditEntry(
  entityUid: EntityUid,
  entityType: EntityType,
  entityKey: string,
  reason?: string,
  user?: string,
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user,
    entityType,
    entityUid,
    entityKey,
    action: 'delete_entity',
    oldValue: 'active',
    newValue: 'deleted',
    reason,
  }
}

// ============================================================================
// AUDIT LOG FILTERING
// ============================================================================

export interface AuditLogFilter {
  entityType?: EntityType
  entityUid?: EntityUid
  action?: AuditAction
  user?: string
  fromDate?: string // ISO timestamp
  toDate?: string // ISO timestamp
}

/**
 * Filter audit log entries by criteria
 */
export function filterAuditLog(entries: AuditEntry[], filter: AuditLogFilter): AuditEntry[] {
  return entries.filter((entry) => {
    if (filter.entityType && entry.entityType !== filter.entityType) {
      return false
    }
    if (filter.entityUid && entry.entityUid !== filter.entityUid) {
      return false
    }
    if (filter.action && entry.action !== filter.action) {
      return false
    }
    if (filter.user && entry.user !== filter.user) {
      return false
    }
    if (filter.fromDate && entry.timestamp < filter.fromDate) {
      return false
    }
    if (filter.toDate && entry.timestamp > filter.toDate) {
      return false
    }
    return true
  })
}

// ============================================================================
// AUDIT LOG FORMATTING
// ============================================================================

/**
 * Format audit entry as human-readable string
 */
export function formatAuditEntry(entry: AuditEntry): string {
  const user = entry.user ? ` by ${entry.user}` : ''
  const reason = entry.reason ? ` (${entry.reason})` : ''

  switch (entry.action) {
    case 'activate':
      return `Activated ${entry.entityType} ${entry.entityKey}${user}${reason}`

    case 'deactivate':
      return `Deactivated ${entry.entityType} ${entry.entityKey}${user}${reason}`

    case 'add_alias':
      return `Added alias ${entry.newValue} → ${entry.entityKey}${user}${reason}`

    case 'override_label':
      return `Changed ${entry.metadata?.field || 'label'} from "${entry.oldValue}" to "${entry.newValue}"${user}${reason}`

    case 'update_attributes': {
      const fields = entry.metadata?.changedFields?.join(', ') || 'attributes'
      return `Updated ${fields} for ${entry.entityKey}${user}${reason}`
    }

    case 'create_entity':
      return `Created ${entry.entityType} ${entry.entityKey} (${entry.newValue})${user}${reason}`

    case 'delete_entity':
      return `Deleted ${entry.entityType} ${entry.entityKey}${user}${reason}`

    default:
      return `${entry.action} on ${entry.entityKey}${user}${reason}`
  }
}
