import { useState, useEffect } from 'react'
import { Cell } from '../domain/types'
import { getCellById, getCellsByAreaId } from '../domain/cellsStore'

export function useCells(areaId: string | undefined) {
    const [cells, setCells] = useState<Cell[]>([])

    useEffect(() => {
        if (!areaId) {
            setCells([])
            return
        }
        setCells(getCellsByAreaId(areaId))
    }, [areaId])

    return cells
}

export function useCell(cellId: string | undefined) {
    const [cell, setCell] = useState<Cell | undefined>()

    useEffect(() => {
        if (!cellId) {
            setCell(undefined)
            return
        }
        setCell(getCellById(cellId))
    }, [cellId])

    return cell
}
