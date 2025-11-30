import { EngineerWorkload } from '../../hooks/useSimManagerDashboard'

export default function EngineerWorkloadList({ workload }: { workload: EngineerWorkload[] }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {workload.map(w => (
                <div key={w.engineer.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            {w.engineer.name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900">{w.engineer.name}</div>
                            <div className="text-xs text-gray-500">{w.totalCells} cells assigned</div>
                        </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        {Object.entries(w.statusBreakdown).map(([status, count]) => (
                            <div key={status}>{status}: {count}</div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
