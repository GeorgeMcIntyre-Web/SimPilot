import { GunCheckStatus, RobotGunAssignment } from './types'
import { gunCheckStatuses, robotGunAssignments } from './mockData'

export function getRobotGunAssignments(): RobotGunAssignment[] {
    return robotGunAssignments
}

export function getAssignmentsByRobotId(robotId: string): RobotGunAssignment[] {
    if (!robotId) return []
    return robotGunAssignments.filter(a => a.robotId === robotId && a.isActive)
}

export function getAssignmentsByCellId(cellId: string): RobotGunAssignment[] {
    if (!cellId) return []
    return robotGunAssignments.filter(a => a.cellId === cellId && a.isActive)
}

export function getAssignmentsByAreaId(areaId: string): RobotGunAssignment[] {
    if (!areaId) return []
    return robotGunAssignments.filter(a => a.areaId === areaId && a.isActive)
}

export function getGunCheckStatusByAssignmentId(
    robotGunAssignmentId: string
): GunCheckStatus | undefined {
    if (!robotGunAssignmentId) return
    return gunCheckStatuses.find(s => s.robotGunAssignmentId === robotGunAssignmentId)
}
