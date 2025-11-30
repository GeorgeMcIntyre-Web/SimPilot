import { useState, useEffect } from 'react'
import {
    Robot, WeldGun, RobotGunAssignment, GunCheckStatus, Stand, SpotWeldRef
} from '../domain/types'
import { getRobotsByCellId } from '../domain/robotsStore'
import { getAssignmentsByCellId, getGunCheckStatusByAssignmentId } from '../domain/robotGunAssignmentsStore'
import { getWeldGunById } from '../domain/weldGunsStore'
import { getStandsByAreaId } from '../domain/standsStore'
import { getSpotWeldRefsByCellId } from '../domain/spotWeldsStore'
import { getCellById } from '../domain/cellsStore'

export type CellEquipment = {
    robots: Robot[]
    robotGunAssignments: RobotGunAssignment[]
    weldGuns: WeldGun[]
    gunStatuses: GunCheckStatus[]
    stands: Stand[]
    spotWeldRefs: SpotWeldRef[]
}

export function useEquipmentByCellId(cellId: string | undefined): CellEquipment {
    const [data, setData] = useState<CellEquipment>({
        robots: [],
        robotGunAssignments: [],
        weldGuns: [],
        gunStatuses: [],
        stands: [],
        spotWeldRefs: []
    })

    useEffect(() => {
        if (!cellId) {
            setData({
                robots: [], robotGunAssignments: [], weldGuns: [],
                gunStatuses: [], stands: [], spotWeldRefs: []
            })
            return
        }

        const cell = getCellById(cellId)
        if (!cell) return

        const robots = getRobotsByCellId(cellId)
        const assignments = getAssignmentsByCellId(cellId)

        // Resolve guns from assignments
        const guns: WeldGun[] = []
        const statuses: GunCheckStatus[] = []

        assignments.forEach(a => {
            const gun = getWeldGunById(a.weldGunId)
            if (gun) guns.push(gun)

            const status = getGunCheckStatusByAssignmentId(a.id)
            if (status) statuses.push(status)
        })

        // Stands are by Area
        const stands = getStandsByAreaId(cell.areaId)

        const spotWeldRefs = getSpotWeldRefsByCellId(cellId)

        setData({
            robots,
            robotGunAssignments: assignments,
            weldGuns: guns,
            gunStatuses: statuses,
            stands,
            spotWeldRefs
        })
    }, [cellId])

    return data
}
