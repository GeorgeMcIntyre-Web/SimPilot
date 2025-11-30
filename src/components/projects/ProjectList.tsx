import { useNavigate } from 'react-router-dom'
import { Project } from '../../domain/types'

export default function ProjectList({ projects }: { projects: Project[] }) {
    const navigate = useNavigate()

    if (projects.length === 0) {
        return <div className="text-gray-500">No projects found.</div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
                <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {project.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{project.OEM} • {project.model}</p>
                    <div className="text-xs text-gray-400">
                        Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                </div>
            ))}
        </div>
    )
}
