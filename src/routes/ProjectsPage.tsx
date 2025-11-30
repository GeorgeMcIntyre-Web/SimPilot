import { useProjects } from '../hooks/useProjects'
import ProjectList from '../components/projects/ProjectList'

export default function ProjectsPage() {
    const { projects, loading } = useProjects()

    if (loading) return <div className="p-8 text-gray-500">Loading projects...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    New Project
                </button>
            </div>
            <ProjectList projects={projects} />
        </div>
    )
}
