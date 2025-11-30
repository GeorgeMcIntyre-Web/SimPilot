import { useNavigate } from 'react-router-dom'
import { AtRiskCell } from '../../hooks/useSimManagerDashboard'

export default function AtRiskCellsTable({ cells }: { cells: AtRiskCell[] }) {
    const navigate = useNavigate()

    if (cells.length === 0) {
        return <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-500 italic">No cells at risk. Great job!</div>
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cell</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {cells.map((item, idx) => (
                        <tr key={`${item.cell.id}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.project.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="font-medium text-gray-900">{item.cell.name}</div>
                                <div className="text-xs">{item.areaName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{item.reason}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                                onClick={() => navigate(`/projects/${item.project.id}`)}>
                                View
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
