import { SpotWeldRef } from './types'
import { spotWeldRefs } from './mockData'

export function getSpotWeldRefs(): SpotWeldRef[] {
    return spotWeldRefs
}

export function getSpotWeldRefsByCellId(cellId: string): SpotWeldRef[] {
    if (!cellId) return []
    return spotWeldRefs.filter(w => w.cellId === cellId)
}

export function getSpotWeldRefsByRobotId(robotId: string): SpotWeldRef[] {
    if (!robotId) return []
    return spotWeldRefs.filter(w => w.robotId === robotId)
}
