import { useState, useEffect, useCallback } from 'react'
import { ChangeLogEntry } from '../domain/types'
import { getChangeLogByCellId, addChangeLogEntry as storeAddEntry } from '../domain/changeLogStore'

export function useChangeLog(cellId: string | undefined) {
    const [entries, setEntries] = useState<ChangeLogEntry[]>([])

    const refresh = useCallback(() => {
        if (!cellId) return
        setEntries(getChangeLogByCellId(cellId))
    }, [cellId])

    useEffect(() => {
        refresh()
    }, [cellId, refresh])

    const addEntry = (userId: string, text: string) => {
        if (!cellId) return
        storeAddEntry({ cellId, userId, text })
        refresh()
    }

    return { entries, addEntry }
}
