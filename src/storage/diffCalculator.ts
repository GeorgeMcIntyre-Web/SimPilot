/**
 * Diff Calculator
 *
 * Calculates differences between two CoreStoreState snapshots.
 * Used for version comparison UI to show what changed between imports.
 */

import { CoreStoreState } from '../domain/coreStore';
import { UnifiedAsset, Project, Area, Cell } from '../domain/core';
import { log } from '../lib/log';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Summary counts for each entity type
 */
export interface EntityCounts {
  tools: number;
  robots: number;
  cells: number;
  projects: number;
  areas: number;
}

/**
 * Item change detail
 */
export interface ItemChange {
  id: string;
  name: string;
  kind: string;
  displayName: string; // User-friendly name
}

/**
 * Modified item with field-level changes
 */
export interface ModifiedItem extends ItemChange {
  changes: FieldChange[];
}

/**
 * Field-level change
 */
export interface FieldChange {
  field: string;
  fieldLabel: string; // User-friendly field name
  oldValue: unknown;
  newValue: unknown;
  oldValueDisplay: string; // Formatted for display
  newValueDisplay: string; // Formatted for display
}

/**
 * Complete diff result
 */
export interface DiffResult {
  fromTimestamp: string;
  toTimestamp: string;
  added: EntityCounts;
  removed: EntityCounts;
  modified: EntityCounts;
  addedItems: ItemChange[];
  removedItems: ItemChange[];
  modifiedItems: ModifiedItem[];
  summary: string; // Human-readable summary
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a value for display
 */
function formatValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }

  if (typeof value === 'string') {
    return value || '(empty)';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    // For objects, show a short representation
    return JSON.stringify(value).substring(0, 50) + '...';
  }

  return String(value);
}

/**
 * Get user-friendly field label
 */
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    id: 'ID',
    name: 'Name',
    displayName: 'Display Name',
    cellId: 'Cell',
    projectId: 'Project',
    areaId: 'Area',
    kind: 'Type',
    status: 'Status',
    assignedEngineer: 'Engineer',
    simulationLeader: 'Sim Leader',
    percentComplete: '% Complete',
    toolingNumber: 'Tooling #',
    supplier: 'Supplier',
    metadata: 'Metadata'
  };

  return labels[field] || field;
}

/**
 * Get display name for an item
 */
function getDisplayName(item: UnifiedAsset | Project | Area | Cell): string {
  if ('displayName' in item && item.displayName) {
    return String(item.displayName);
  }

  if ('name' in item && item.name) {
    return String(item.name);
  }

  if ('id' in item) {
    return String(item.id);
  }

  return '(unnamed)';
}

/**
 * Compare two arrays by ID and find added/removed/modified items
 */
function compareArrays<T extends { id: string }>(
  oldArray: T[],
  newArray: T[]
): {
  added: T[];
  removed: T[];
  modified: Array<{ old: T; new: T }>;
} {
  const oldById = new Map(oldArray.map(item => [item.id, item]));
  const newById = new Map(newArray.map(item => [item.id, item]));

  const added: T[] = [];
  const removed: T[] = [];
  const modified: Array<{ old: T; new: T }> = [];

  // Find added and modified
  for (const [id, newItem] of newById) {
    const oldItem = oldById.get(id);

    if (!oldItem) {
      added.push(newItem);
    } else {
      // Check if modified
      if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        modified.push({ old: oldItem, new: newItem });
      }
    }
  }

  // Find removed
  for (const [id, oldItem] of oldById) {
    if (!newById.has(id)) {
      removed.push(oldItem);
    }
  }

  return { added, removed, modified };
}

/**
 * Find field-level changes between two objects
 */
function findFieldChanges(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  // Fields to ignore in diff
  const ignoreFields = new Set(['lastUpdated', 'createdAt', 'updatedAt']);

  for (const key of allKeys) {
    if (ignoreFields.has(key)) continue;

    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // Deep comparison for complex values
    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);

    if (oldStr !== newStr) {
      changes.push({
        field: key,
        fieldLabel: getFieldLabel(key),
        oldValue,
        newValue,
        oldValueDisplay: formatValueForDisplay(oldValue),
        newValueDisplay: formatValueForDisplay(newValue)
      });
    }
  }

  return changes;
}

// ============================================================================
// MAIN DIFF CALCULATION
// ============================================================================

/**
 * Calculate diff between two CoreStoreState snapshots
 *
 * @param oldState - Previous state
 * @param newState - Current state
 * @param fromTimestamp - Timestamp of old state
 * @param toTimestamp - Timestamp of new state
 * @returns Complete diff result
 */
export function calculateDiff(
  oldState: CoreStoreState,
  newState: CoreStoreState,
  fromTimestamp: string,
  toTimestamp: string
): DiffResult {
  try {
    log.info('DiffCalculator: Starting diff calculation', {
      fromTimestamp,
      toTimestamp
    });

    // Separate tools and robots
    const oldTools = oldState.assets.filter(a => a.kind !== 'ROBOT');
    const newTools = newState.assets.filter(a => a.kind !== 'ROBOT');
    const oldRobots = oldState.assets.filter(a => a.kind === 'ROBOT');
    const newRobots = newState.assets.filter(a => a.kind === 'ROBOT');

    // Compare each entity type
    const toolsDiff = compareArrays(oldTools, newTools);
    const robotsDiff = compareArrays(oldRobots, newRobots);
    const cellsDiff = compareArrays(oldState.cells, newState.cells);
    const projectsDiff = compareArrays(oldState.projects, newState.projects);
    const areasDiff = compareArrays(oldState.areas, newState.areas);

    // Build item change lists
    const addedItems: ItemChange[] = [
      ...toolsDiff.added.map(t => ({
        id: t.id,
        name: t.name || t.id,
        kind: t.kind,
        displayName: getDisplayName(t)
      })),
      ...robotsDiff.added.map(r => ({
        id: r.id,
        name: r.name || r.id,
        kind: 'ROBOT',
        displayName: getDisplayName(r)
      })),
      ...cellsDiff.added.map(c => ({
        id: c.id,
        name: c.name || c.id,
        kind: 'CELL',
        displayName: getDisplayName(c)
      })),
      ...projectsDiff.added.map(p => ({
        id: p.id,
        name: p.name || p.id,
        kind: 'PROJECT',
        displayName: getDisplayName(p)
      })),
      ...areasDiff.added.map(a => ({
        id: a.id,
        name: a.name || a.id,
        kind: 'AREA',
        displayName: getDisplayName(a)
      }))
    ];

    const removedItems: ItemChange[] = [
      ...toolsDiff.removed.map(t => ({
        id: t.id,
        name: t.name || t.id,
        kind: t.kind,
        displayName: getDisplayName(t)
      })),
      ...robotsDiff.removed.map(r => ({
        id: r.id,
        name: r.name || r.id,
        kind: 'ROBOT',
        displayName: getDisplayName(r)
      })),
      ...cellsDiff.removed.map(c => ({
        id: c.id,
        name: c.name || c.id,
        kind: 'CELL',
        displayName: getDisplayName(c)
      })),
      ...projectsDiff.removed.map(p => ({
        id: p.id,
        name: p.name || p.id,
        kind: 'PROJECT',
        displayName: getDisplayName(p)
      })),
      ...areasDiff.removed.map(a => ({
        id: a.id,
        name: a.name || a.id,
        kind: 'AREA',
        displayName: getDisplayName(a)
      }))
    ];

    const modifiedItems: ModifiedItem[] = [
      ...toolsDiff.modified.map(({ old, new: newItem }) => ({
        id: newItem.id,
        name: newItem.name || newItem.id,
        kind: newItem.kind,
        displayName: getDisplayName(newItem),
        changes: findFieldChanges(old as unknown as Record<string, unknown>, newItem as unknown as Record<string, unknown>)
      })),
      ...robotsDiff.modified.map(({ old, new: newItem }) => ({
        id: newItem.id,
        name: newItem.name || newItem.id,
        kind: 'ROBOT',
        displayName: getDisplayName(newItem),
        changes: findFieldChanges(old as unknown as Record<string, unknown>, newItem as unknown as Record<string, unknown>)
      })),
      ...cellsDiff.modified.map(({ old, new: newItem }) => ({
        id: newItem.id,
        name: newItem.name || newItem.id,
        kind: 'CELL',
        displayName: getDisplayName(newItem),
        changes: findFieldChanges(old as unknown as Record<string, unknown>, newItem as unknown as Record<string, unknown>)
      })),
      ...projectsDiff.modified.map(({ old, new: newItem }) => ({
        id: newItem.id,
        name: newItem.name || newItem.id,
        kind: 'PROJECT',
        displayName: getDisplayName(newItem),
        changes: findFieldChanges(old as unknown as Record<string, unknown>, newItem as unknown as Record<string, unknown>)
      })),
      ...areasDiff.modified.map(({ old, new: newItem }) => ({
        id: newItem.id,
        name: newItem.name || newItem.id,
        kind: 'AREA',
        displayName: getDisplayName(newItem),
        changes: findFieldChanges(old as unknown as Record<string, unknown>, newItem as unknown as Record<string, unknown>)
      }))
    ];

    // Build summary counts
    const added: EntityCounts = {
      tools: toolsDiff.added.length,
      robots: robotsDiff.added.length,
      cells: cellsDiff.added.length,
      projects: projectsDiff.added.length,
      areas: areasDiff.added.length
    };

    const removed: EntityCounts = {
      tools: toolsDiff.removed.length,
      robots: robotsDiff.removed.length,
      cells: cellsDiff.removed.length,
      projects: projectsDiff.removed.length,
      areas: areasDiff.removed.length
    };

    const modified: EntityCounts = {
      tools: toolsDiff.modified.length,
      robots: robotsDiff.modified.length,
      cells: cellsDiff.modified.length,
      projects: projectsDiff.modified.length,
      areas: areasDiff.modified.length
    };

    // Build summary text
    const totalAdded = addedItems.length;
    const totalRemoved = removedItems.length;
    const totalModified = modifiedItems.length;

    const summaryParts: string[] = [];
    if (totalAdded > 0) summaryParts.push(`${totalAdded} added`);
    if (totalRemoved > 0) summaryParts.push(`${totalRemoved} removed`);
    if (totalModified > 0) summaryParts.push(`${totalModified} modified`);

    const summary = summaryParts.length > 0
      ? summaryParts.join(', ')
      : 'No changes detected';

    log.info('DiffCalculator: Diff calculation complete', {
      totalAdded,
      totalRemoved,
      totalModified
    });

    return {
      fromTimestamp,
      toTimestamp,
      added,
      removed,
      modified,
      addedItems,
      removedItems,
      modifiedItems,
      summary
    };
  } catch (error) {
    log.error('DiffCalculator: Failed to calculate diff', error);
    throw new Error('Failed to calculate diff');
  }
}

/**
 * Check if a diff has any changes
 */
export function hasChanges(diff: DiffResult): boolean {
  return (
    diff.addedItems.length > 0 ||
    diff.removedItems.length > 0 ||
    diff.modifiedItems.length > 0
  );
}

/**
 * Get total change count
 */
export function getTotalChanges(diff: DiffResult): number {
  return (
    diff.addedItems.length +
    diff.removedItems.length +
    diff.modifiedItems.length
  );
}
