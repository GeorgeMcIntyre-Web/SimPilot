import { useState, useEffect } from 'react'
import { Project } from '../domain/types'
import { getProjects } from '../domain/projectsStore'

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Simulate async fetch
        const data = getProjects()
        setProjects(data)
        setLoading(false)
    }, [])

    return { projects, loading }
}
