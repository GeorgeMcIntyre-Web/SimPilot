import { useState, useEffect } from 'react'
import { Project, Cell, User } from '../domain/types'
import { getProjects, getAreasByProjectId } from '../domain/projectsStore'
import { getCellsByAreaId } from '../domain/cellsStore'
import { getSimulationEngineers } from '../domain/usersStore'
import { getChecklistsByCellId } from '../domain/checklistsStore'

export type ProjectHealth = {
    project: Project
    totalCells: number
    blockedCells: number
    approvedCells: number
}

export type AtRiskCell = {
    project: Project
    areaName: string
    cell: Cell
    reason: string
}

export type EngineerWorkload = {
    engineer: User
    totalCells: number
    statusBreakdown: Record<string, number>
}

export function useSimManagerDashboard() {
    const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([])
    const [atRiskCells, setAtRiskCells] = useState<AtRiskCell[]>([])
    const [engineerWorkload, setEngineerWorkload] = useState<EngineerWorkload[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const projects = getProjects()
        const health: ProjectHealth[] = []
        const risks: AtRiskCell[] = []
        const engineers = getSimulationEngineers()
        const workloadMap = new Map<string, EngineerWorkload>()

        // Init workload map
        engineers.forEach(eng => {
            workloadMap.set(eng.id, { engineer: eng, totalCells: 0, statusBreakdown: {} })
        })

        projects.forEach(p => {
            const areas = getAreasByProjectId(p.id)
            let pTotal = 0
            let pBlocked = 0
            let pApproved = 0

            areas.forEach(a => {
                const cells = getCellsByAreaId(a.id)
                cells.forEach(c => {
                    pTotal++
                    if (c.status === 'BLOCKED') pBlocked++
                    if (c.status === 'APPROVED') pApproved++

                    // Check Risk
                    if (c.status === 'BLOCKED') {
                        risks.push({ project: p, areaName: a.name, cell: c, reason: 'Status is BLOCKED' })
                    } else if (c.status === 'IN_PROGRESS') {
                        const checklists = getChecklistsByCellId(c.id)
                        if (checklists.length === 0) {
                            risks.push({ project: p, areaName: a.name, cell: c, reason: 'In Progress but no Checklist' })
                        }
                    }

                    // Workload
                    if (c.responsibleUserId && workloadMap.has(c.responsibleUserId)) {
                        const wl = workloadMap.get(c.responsibleUserId)!
                        wl.totalCells++
                        wl.statusBreakdown[c.status] = (wl.statusBreakdown[c.status] || 0) + 1
                    }
                })
            })

            health.push({ project: p, totalCells: pTotal, blockedCells: pBlocked, approvedCells: pApproved })
        })

        setProjectHealth(health)
        setAtRiskCells(risks)
        setEngineerWorkload(Array.from(workloadMap.values()))
        setLoading(false)
    }, [])

    return { projectHealth, atRiskCells, engineerWorkload, loading }
}
