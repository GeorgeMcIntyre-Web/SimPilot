import { useSimManagerDashboard } from '../hooks/useSimManagerDashboard'
import ProjectHealthCard from '../components/dashboard/ProjectHealthCard'
import AtRiskCellsTable from '../components/dashboard/AtRiskCellsTable'
import EngineerWorkloadList from '../components/dashboard/EngineerWorkloadList'

export default function DashboardPage() {
    const { projectHealth, atRiskCells, engineerWorkload, loading } = useSimManagerDashboard()

    if (loading) return <div className="p-8 text-gray-500">Loading dashboard...</div>

    return (
        <div className="space-y-8">
            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Project Health</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectHealth.map(p => (
                        <ProjectHealthCard key={p.project.id} data={p} />
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">At-Risk Cells</h2>
                    <AtRiskCellsTable cells={atRiskCells} />
                </section>

                <section>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Engineer Workload</h2>
                    <EngineerWorkloadList workload={engineerWorkload} />
                </section>
            </div>
        </div>
    )
}
