import { Area, Project } from './types'
import { areas, projects } from './mockData'

export function getProjects(): Project[] {
    if (projects.length === 0) return []
    return projects
}

export function getProjectById(id: string): Project | undefined {
    if (!id) return
    const project = projects.find(p => p.id === id)
    if (!project) return
    return project
}

export function getAreasByProjectId(projectId: string): Area[] {
    if (!projectId) return []
    const result = areas.filter(a => a.projectId === projectId)
    if (result.length === 0) return []
    return result.sort((a, b) => a.sortOrder - b.sortOrder)
}
