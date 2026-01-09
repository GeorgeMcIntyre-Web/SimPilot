import { useEffect, useState } from 'react';
import { ImportHistoryEntry } from '../components/dataLoader/tabs/ImportHistoryTab';
import { getImportHistory } from '../features/importHistory/importHistoryStore';

export function useImportHistory() {
  const [entries, setEntries] = useState<ImportHistoryEntry[]>(() => getImportHistory());

  useEffect(() => {
    const handler = () => setEntries(getImportHistory());
    window.addEventListener('simpilot-import-history-update', handler);
    return () => window.removeEventListener('simpilot-import-history-update', handler);
  }, []);

  return { entries };
}
