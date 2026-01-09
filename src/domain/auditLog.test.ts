// Audit Log Tests
import { describe, it, expect } from 'vitest'
import {
  createActivateAuditEntry,
  createDeactivateAuditEntry,
  createAddAliasAuditEntry,
  createOverrideLabelAuditEntry,
  createUpdateAttributesAuditEntry,
  createEntityCreationAuditEntry,
  createEntityDeletionAuditEntry,
  filterAuditLog,
  formatAuditEntry,
  type AuditEntry,
  type AuditLogFilter
} from './auditLog'

describe('Audit Log - Entry Creation', () => {
  it('should create activate audit entry', () => {
    const entry = createActivateAuditEntry(
      'st_123',
      'station',
      'AL_010-010',
      'Reinstalled after maintenance',
      'user@example.com'
    )

    expect(entry.id).toBeTruthy()
    expect(entry.timestamp).toBeTruthy()
    expect(entry.user).toBe('user@example.com')
    expect(entry.entityType).toBe('station')
    expect(entry.entityUid).toBe('st_123')
    expect(entry.entityKey).toBe('AL_010-010')
    expect(entry.action).toBe('activate')
    expect(entry.oldValue).toBe('inactive')
    expect(entry.newValue).toBe('active')
    expect(entry.reason).toBe('Reinstalled after maintenance')
  })

  it('should create deactivate audit entry', () => {
    const entry = createDeactivateAuditEntry(
      'st_123',
      'station',
      'AL_010-010',
      'Scrapped 2024-11-03'
    )

    expect(entry.action).toBe('deactivate')
    expect(entry.oldValue).toBe('active')
    expect(entry.newValue).toBe('inactive')
    expect(entry.reason).toBe('Scrapped 2024-11-03')
  })

  it('should create add alias audit entry', () => {
    const entry = createAddAliasAuditEntry(
      'st_123',
      'station',
      'AL_010-010',
      'AL_010-010A',
      'Station renumbered during commissioning'
    )

    expect(entry.action).toBe('add_alias')
    expect(entry.newValue).toBe('AL_010-010A')
    expect(entry.metadata?.fromKey).toBe('AL_010-010A')
  })

  it('should create override label audit entry', () => {
    const entry = createOverrideLabelAuditEntry(
      'tl_456',
      'tool',
      'AL_010-010::GJR 10',
      'toolName',
      'Gun 10',
      'Welding Station 10 Gun',
      'Standardized naming'
    )

    expect(entry.action).toBe('override_label')
    expect(entry.oldValue).toBe('Gun 10')
    expect(entry.newValue).toBe('Welding Station 10 Gun')
    expect(entry.metadata?.field).toBe('toolName')
  })

  it('should create update attributes audit entry', () => {
    const entry = createUpdateAttributesAuditEntry(
      'st_123',
      'station',
      'AL_010-010',
      ['oemModel', 'supplier'],
      { oemModel: 'ModelA', supplier: 'Comau' },
      { oemModel: 'ModelB', supplier: 'ABB' },
      'Updated from latest datasheet'
    )

    expect(entry.action).toBe('update_attributes')
    expect(entry.metadata?.changedFields).toEqual(['oemModel', 'supplier'])
    expect(entry.oldValue).toEqual({ oemModel: 'ModelA', supplier: 'Comau' })
    expect(entry.newValue).toEqual({ oemModel: 'ModelB', supplier: 'ABB' })
  })

  it('should create entity creation audit entry', () => {
    const entry = createEntityCreationAuditEntry(
      'st_new',
      'station',
      'BN_012-020',
      'manual',
      'Added missing station'
    )

    expect(entry.action).toBe('create_entity')
    expect(entry.oldValue).toBe(null)
    expect(entry.newValue).toBe('manual')
    expect(entry.metadata?.source).toBe('manual')
  })

  it('should create entity deletion audit entry', () => {
    const entry = createEntityDeletionAuditEntry(
      'st_old',
      'station',
      'CA_008-005',
      'Duplicate entry'
    )

    expect(entry.action).toBe('delete_entity')
    expect(entry.oldValue).toBe('active')
    expect(entry.newValue).toBe('deleted')
  })
})

describe('Audit Log - Filtering', () => {
  const sampleEntries: AuditEntry[] = [
    createActivateAuditEntry('st_1', 'station', 'ST001', undefined, 'alice'),
    createDeactivateAuditEntry('st_2', 'station', 'ST002', undefined, 'bob'),
    createAddAliasAuditEntry('tl_1', 'tool', 'TOOL001', 'OLD_TOOL001', undefined, 'alice'),
    createOverrideLabelAuditEntry('tl_2', 'tool', 'TOOL002', 'name', 'Old Name', 'New Name', undefined, 'charlie')
  ]

  it('should filter by entity type', () => {
    const filter: AuditLogFilter = { entityType: 'station' }
    const filtered = filterAuditLog(sampleEntries, filter)

    expect(filtered).toHaveLength(2)
    expect(filtered.every(e => e.entityType === 'station')).toBe(true)
  })

  it('should filter by entity UID', () => {
    const filter: AuditLogFilter = { entityUid: 'st_1' }
    const filtered = filterAuditLog(sampleEntries, filter)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].entityUid).toBe('st_1')
  })

  it('should filter by action', () => {
    const filter: AuditLogFilter = { action: 'add_alias' }
    const filtered = filterAuditLog(sampleEntries, filter)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].action).toBe('add_alias')
  })

  it('should filter by user', () => {
    const filter: AuditLogFilter = { user: 'alice' }
    const filtered = filterAuditLog(sampleEntries, filter)

    expect(filtered).toHaveLength(2)
    expect(filtered.every(e => e.user === 'alice')).toBe(true)
  })

  it('should filter by date range', () => {
    const now = new Date().toISOString()
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago

    const filter: AuditLogFilter = {
      fromDate: past,
      toDate: now
    }
    const filtered = filterAuditLog(sampleEntries, filter)

    expect(filtered).toHaveLength(4) // All entries are recent
  })

  it('should combine multiple filters', () => {
    const filter: AuditLogFilter = {
      entityType: 'station',
      user: 'alice'
    }
    const filtered = filterAuditLog(sampleEntries, filter)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].entityUid).toBe('st_1')
  })

  it('should return empty array when no matches', () => {
    const filter: AuditLogFilter = { user: 'nonexistent' }
    const filtered = filterAuditLog(sampleEntries, filter)

    expect(filtered).toHaveLength(0)
  })
})

describe('Audit Log - Formatting', () => {
  it('should format activate entry', () => {
    const entry = createActivateAuditEntry(
      'st_123',
      'station',
      'AL_010-010',
      'Reinstalled',
      'alice'
    )
    const formatted = formatAuditEntry(entry)

    expect(formatted).toContain('Activated')
    expect(formatted).toContain('station')
    expect(formatted).toContain('AL_010-010')
    expect(formatted).toContain('by alice')
    expect(formatted).toContain('Reinstalled')
  })

  it('should format deactivate entry', () => {
    const entry = createDeactivateAuditEntry(
      'st_123',
      'station',
      'AL_010-010',
      'Scrapped'
    )
    const formatted = formatAuditEntry(entry)

    expect(formatted).toContain('Deactivated')
    expect(formatted).toContain('Scrapped')
  })

  it('should format add alias entry', () => {
    const entry = createAddAliasAuditEntry(
      'st_123',
      'station',
      'AL_010-010',
      'AL_010-010A'
    )
    const formatted = formatAuditEntry(entry)

    expect(formatted).toContain('Added alias')
    expect(formatted).toContain('AL_010-010A')
    expect(formatted).toContain('AL_010-010')
  })

  it('should format override label entry', () => {
    const entry = createOverrideLabelAuditEntry(
      'tl_456',
      'tool',
      'TOOL001',
      'toolName',
      'Old Name',
      'New Name'
    )
    const formatted = formatAuditEntry(entry)

    expect(formatted).toContain('Changed')
    expect(formatted).toContain('toolName')
    expect(formatted).toContain('Old Name')
    expect(formatted).toContain('New Name')
  })

  it('should format update attributes entry', () => {
    const entry = createUpdateAttributesAuditEntry(
      'st_123',
      'station',
      'ST001',
      ['model', 'supplier'],
      { model: 'A', supplier: 'X' },
      { model: 'B', supplier: 'Y' }
    )
    const formatted = formatAuditEntry(entry)

    expect(formatted).toContain('Updated')
    expect(formatted).toContain('model, supplier')
    expect(formatted).toContain('ST001')
  })

  it('should format entry without user', () => {
    const entry = createActivateAuditEntry('st_123', 'station', 'ST001')
    const formatted = formatAuditEntry(entry)

    expect(formatted).not.toContain('by ')
  })

  it('should format entry without reason', () => {
    const entry = createActivateAuditEntry('st_123', 'station', 'ST001', undefined, 'alice')
    const formatted = formatAuditEntry(entry)

    expect(formatted).toContain('by alice')
    expect(formatted).not.toMatch(/\(.*\)$/)
  })
})
