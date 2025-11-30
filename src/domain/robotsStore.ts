import { Robot } from './types'
import { robots } from './mockData'

export function getRobots(): Robot[] {
    return robots
}

export function getRobotById(id: string): Robot | undefined {
    if (!id) return
    return robots.find(r => r.id === id)
}

export function getRobotsByAreaId(areaId: string): Robot[] {
    if (!areaId) return []
    return robots.filter(r => r.areaId === areaId)
}

export function getRobotsByCellId(cellId: string): Robot[] {
    if (!cellId) return []
    return robots.filter(r => r.cellId === cellId)
}
