import { ChangeLogEntry } from './types'
import { changeLogEntries } from './mockData'

export function getChangeLogByCellId(cellId: string): ChangeLogEntry[] {
    if (!cellId) return []
    return changeLogEntries
        .filter(e => e.cellId === cellId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addChangeLogEntry(params: {
    cellId: string;
    userId: string;
    text: string
}): ChangeLogEntry | undefined {
    if (!params.cellId || !params.userId || !params.text) return

    const newEntry: ChangeLogEntry = {
        id: `le-${Date.now()}`,
        cellId: params.cellId,
        userId: params.userId,
        createdAt: new Date().toISOString(),
        text: params.text
    }

    changeLogEntries.push(newEntry)
    return newEntry
}
