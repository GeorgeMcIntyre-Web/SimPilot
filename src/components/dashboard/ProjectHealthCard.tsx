import { useNavigate } from 'react-router-dom'
import { ProjectHealth } from '../../hooks/useSimManagerDashboard'

export default function ProjectHealthCard({ data }: { data: ProjectHealth }) {
    const navigate = useNavigate()
    const { project, totalCells, blockedCells, approvedCells } = data

    return (
        <div
            onClick={() => navigate(`/projects/${project.id}`)}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.OEM} • {project.model}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {project.status}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xl font-bold text-gray-900">{totalCells}</div>
                    <div className="text-xs text-gray-500">Total Cells</div>
                </div>
                <div className="bg-red-50 p-2 rounded">
                    <div className="text-xl font-bold text-red-700">{blockedCells}</div>
                    <div className="text-xs text-red-600">Blocked</div>
                </div>
                <div className="bg-green-50 p-2 rounded">
                    <div className="text-xl font-bold text-green-700">{approvedCells}</div>
                    <div className="text-xs text-green-600">Approved</div>
                </div>
            </div>
        </div>
    )
}
