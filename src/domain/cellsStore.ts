import { Cell } from './types'
import { cells } from './mockData'

export function getCellsByAreaId(areaId: string): Cell[] {
    if (!areaId) return []
    const result = cells.filter(c => c.areaId === areaId)
    if (result.length === 0) return []
    return result
}

export function getCellById(id: string): Cell | undefined {
    if (!id) return
    const cell = cells.find(c => c.id === id)
    if (!cell) return
    return cell
}
