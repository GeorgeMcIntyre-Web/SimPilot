import { useState, useEffect } from 'react'
import { Robot, WeldGun, Stand } from '../domain/types'
import { getRobots } from '../domain/robotsStore'
import { getWeldGuns } from '../domain/weldGunsStore'
import { getStands } from '../domain/standsStore'

export type EquipmentLibraryData = {
    robots: Robot[]
    weldGuns: WeldGun[]
    stands: Stand[]
}

export function useEquipmentLibrary(): EquipmentLibraryData {
    const [data, setData] = useState<EquipmentLibraryData>({
        robots: [],
        weldGuns: [],
        stands: []
    })

    useEffect(() => {
        setData({
            robots: getRobots(),
            weldGuns: getWeldGuns(),
            stands: getStands()
        })
    }, [])

    return data
}
