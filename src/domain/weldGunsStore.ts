import { WeldGun } from './types'
import { weldGuns } from './mockData'

export function getWeldGuns(): WeldGun[] {
    return weldGuns
}

export function getWeldGunById(id: string): WeldGun | undefined {
    if (!id) return
    return weldGuns.find(g => g.id === id)
}

export function getWeldGunsByIds(ids: string[]): WeldGun[] {
    if (!ids || ids.length === 0) return []
    return weldGuns.filter(g => ids.includes(g.id))
}
