import { coreStore } from '../../../domain/coreStore';
import type { IngestFilesInput, IngestFilesResult } from '../../../ingestion/ingestionCoordinator';
import type { VersionComparisonResult, EntityChange } from '../../../ingestion/versionComparison';
import type { IngestionWarning } from '../../../domain/core';
import type { DiffResult } from '../../../domain/uidTypes';
import type {
  ImportHistoryEntry,
  ImportDiff,
  DiffItem,
  RenameItem,
  AmbiguityItem,
  ImportStatus,
  UnlinkedItem,
} from '../../components/dataLoader/tabs/ImportHistoryTab';

const STORAGE_KEY = 'simpilot.importHistory.v1';

function loadHistory(): ImportHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveHistory(entries: ImportHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent('simpilot-import-history-update'));
}

export function getImportHistory(): ImportHistoryEntry[] {
  return loadHistory();
}

export function addImportHistoryEntry(entry: ImportHistoryEntry) {
  const current = loadHistory();
  const merged = [entry, ...current].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  saveHistory(merged.slice(0, 100)); // keep latest 100
}

export function clearImportHistory() {
  saveHistory([]);
}

export function buildImportHistoryEntry(
  input: IngestFilesInput,
  result: IngestFilesResult,
  sourceType: ImportHistoryEntry['sourceType']
): ImportHistoryEntry {
  const timestamp = new Date().toISOString();
  const filename = input.simulationFiles.map(f => f.name).join(', ') || input.equipmentFiles[0]?.name || 'Import';

  const versionComparison = result.versionComparison;
  const diffResult = result.diffResult;
  const diff: ImportDiff = diffResult
    ? buildDiffFromDiffResult(diffResult)
    : versionComparison
      ? buildDiffFromVersionComparison(versionComparison)
      : {
          created: [],
          updated: [],
          deleted: [],
          renamed: [],
          ambiguities: [],
        };

  const counts = diffResult
    ? {
        created: diffResult.summary.created,
        updated: diffResult.summary.updated,
        deleted: diffResult.summary.deleted,
        renamed: diffResult.summary.renamed,
        ambiguous: diffResult.summary.ambiguous,
      }
    : versionComparison
      ? {
          created: countChanges(versionComparison, 'ADDED'),
          updated: countChanges(versionComparison, 'MODIFIED'),
          deleted: countChanges(versionComparison, 'REMOVED'),
          renamed: diff.renamed.length,
          ambiguous: diff.ambiguities.length,
        }
      : {
          created: 0,
          updated: 0,
          deleted: 0,
          renamed: 0,
          ambiguous: 0,
        };

  const warningsDetailed: IngestionWarning[] = result.warnings || [];
  const warnings = warningsDetailed.map(w => w.message);
  const unlinked = warningsDetailed
    .filter(w => w.kind === 'LINKING_MISSING_TARGET')
    .map<UnlinkedItem>(w => ({
      item: w.details?.targetId ? String(w.details.targetId) : (w.fileName || 'Unknown'),
      type: inferTypeFromMessage(w.message),
      reason: w.message,
    }));

  const status: ImportStatus = (warnings.length > 0 || counts.ambiguous > 0) ? 'needs resolution' : 'clean';

  const plant = resolvePlantName();

  return {
    id: result.importRunId || `IMP-${timestamp}`,
    timestamp,
    filename,
    plant,
    sourceType,
    status,
    counts,
    diff,
    warnings,
    warningsDetailed,
    unlinked,
  };
}

function buildDiffFromVersionComparison(vc: VersionComparisonResult): ImportDiff {
  const created: DiffItem[] = [];
  const updated: DiffItem[] = [];
  const deleted: DiffItem[] = [];
  const renamed: RenameItem[] = [];
  const ambiguities: AmbiguityItem[] = [];

  const process = <T extends { id: string; name?: string }>(
    label: string,
    changes: EntityChange<T>[]
  ) => {
    changes.forEach((change) => {
      const name = change.entity.name || change.entity.id;
      if (change.type === 'ADDED') {
        created.push({ item: `${label} ${name}` });
      } else if (change.type === 'MODIFIED') {
        const nameChange = change.conflicts?.find(c => c.field === 'name');
        if (nameChange && change.oldEntity) {
          renamed.push({
            from: `${label} ${change.oldEntity.name || change.oldEntity.id}`,
            to: `${label} ${name}`,
            reason: 'Name changed during import',
          });
        }

        const detail = (change.conflicts || [])
          .map(c => `${c.field}: ${String(c.oldValue)} → ${String(c.newValue)}`)
          .join(', ');
        updated.push({ item: `${label} ${name}`, detail: detail || undefined });
      } else if (change.type === 'REMOVED') {
        deleted.push({ item: `${label} ${name}` });
      }
    });
  };

  process('Project', vc.projects);
  process('Area', vc.areas);
  process('Cell', vc.cells);
  process('Robot', vc.robots);
  process('Tool', vc.tools);

  // Ambiguities derived from conflicts if present
  vc.tools.concat(vc.robots).forEach(change => {
    if (change.conflicts && change.conflicts.length > 0) {
      ambiguities.push({
        item: `${change.entity.name || change.entity.id}`,
        candidates: change.conflicts.map(c => ({
          name: String(c.newValue ?? c.field),
          score: 0.5,
          reason: `${c.field} differs`,
        })),
      });
    }
  });

  return { created, updated, deleted, renamed, ambiguities };
}

function buildDiffFromDiffResult(diff: DiffResult): ImportDiff {
  const created: DiffItem[] = diff.creates.map(item => ({
    item: `${capitalize(item.entityType)} ${item.key}`,
    detail: `Plant ${item.plantKey}`,
  }))

  const updated: DiffItem[] = diff.updates.map(item => ({
    item: `${capitalize(item.entityType)} ${item.key}`,
    detail: item.changedFields.length ? `Changed: ${item.changedFields.join(', ')}` : undefined,
  }))

  const deleted: DiffItem[] = diff.deletes.map(item => ({
    item: `${capitalize(item.entityType)} ${item.key}`,
    detail: item.lastSeen ? `Last seen ${item.lastSeen}` : undefined,
  }))

  const renamed: RenameItem[] = diff.renamesOrMoves.map(item => ({
    from: item.oldKey || 'unknown',
    to: item.newKey,
    reason: item.matchReasons?.join(', ') || undefined,
  }))

  const ambiguities: AmbiguityItem[] = diff.ambiguous.map(item => ({
    item: `${capitalize(item.entityType)} ${item.newKey}`,
    candidates: item.candidates.map(c => ({
      name: c.key,
      score: c.matchScore / 100,
      reason: c.reasons.join(', '),
    })),
  }))

  return { created, updated, deleted, renamed, ambiguities }
}

function countChanges(vc: VersionComparisonResult, type: EntityChange<any>['type']): number {
  const sum = (arr: EntityChange<any>[]) => arr.filter(c => c.type === type).length;
  return sum(vc.projects) + sum(vc.areas) + sum(vc.cells) + sum(vc.robots) + sum(vc.tools);
}

function resolvePlantName(): string {
  const state = coreStore.getState();
  const plantNames = new Set<string>();
  state.projects.forEach(p => {
    if (p.plantId) plantNames.add(p.plantId);
  });
  if (plantNames.size === 0) return 'Unknown';
  return Array.from(plantNames).join(', ');
}

function inferTypeFromMessage(message: string): UnlinkedItem['type'] {
  const lower = message.toLowerCase();
  if (lower.includes('robot')) return 'Robot';
  return 'Tool';
}

function capitalize(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}
