import { useState, useEffect } from 'react'
import { Project, Area, Cell } from '../domain/types'
import { getProjectById, getAreasByProjectId } from '../domain/projectsStore'
import { getCellsByAreaId } from '../domain/cellsStore'

export type ProjectData = {
    project: Project | undefined
    areas: Area[]
    cellsByArea: Record<string, Cell[]>
}

export function useProject(projectId: string | undefined) {
    const [data, setData] = useState<ProjectData>({
        project: undefined,
        areas: [],
        cellsByArea: {}
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projectId) {
            setLoading(false)
            return
        }

        const project = getProjectById(projectId)
        const areas = getAreasByProjectId(projectId)
        const cellsByArea: Record<string, Cell[]> = {}

        areas.forEach(area => {
            cellsByArea[area.id] = getCellsByAreaId(area.id)
        })

        setData({ project, areas, cellsByArea })
        setLoading(false)
    }, [projectId])

    return { ...data, loading }
}
