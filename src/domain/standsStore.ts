import { Stand } from './types'
import { stands } from './mockData'

export function getStands(): Stand[] {
    return stands
}

export function getStandsByAreaId(areaId: string): Stand[] {
    if (!areaId) return []
    return stands.filter(s => s.areaId === areaId)
}

export function getStandsByStationNumber(stationNumber: string): Stand[] {
    if (!stationNumber) return []
    return stands.filter(s => s.stationNumber === stationNumber)
}
