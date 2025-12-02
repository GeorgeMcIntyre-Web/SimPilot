import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { useAllProjectMetrics } from '../../ui/hooks/useDomainData';
import { ArrowUpDown } from 'lucide-react';

type SortKey = 'name' | 'avgCompletion' | 'atRiskCellsCount';
type SortDirection = 'asc' | 'desc';

export function ProjectsPage() {
    const projects = useAllProjectMetrics();
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');

    if (projects.length === 0) {
        return (
            <div className="space-y-8">
                <PageHeader title="Projects" subtitle="Manage all simulation projects" />
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">No Projects Found</h3>
                    <p className="text-blue-700 dark:text-blue-300 mb-4">
                        Please go to the Data Loader to import your simulation files.
                    </p>
                    <Link to="/data-loader" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Go to Data Loader
                    </Link>
                </div>
            </div>
        );
    }

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    const getSortedProjects = () => {
        return [...projects].sort((a, b) => {
            const getValue = (project: ProjectWithMetrics, key: SortKey): any => {
                if (key === 'name') return project.name;
                if (key === 'avgCompletion') return project.avgCompletion;
                if (key === 'atRiskCellsCount') return project.atRiskCellsCount;
                return '';
            };

            const valA = getValue(a, sortKey);
            const valB = getValue(b, sortKey);

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const SortHeader = ({ label, keyName }: { label: string, keyName: SortKey }) => (
        <button
            onClick={() => handleSort(keyName)}
            className="flex items-center space-x-1 hover:text-blue-600 font-medium"
        >
            <span>{label}</span>
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    // We need to define the type of the item in the table, which includes metrics
    type ProjectWithMetrics = typeof projects[0];

    const columns: Column<ProjectWithMetrics>[] = [
        { header: <SortHeader label="Project Name" keyName="name" />, accessor: (p) => <Link to={`/projects/${p.id}`} className="text-blue-600 hover:underline font-medium">{p.name}</Link> },
        { header: 'Customer', accessor: (p) => p.customer },
        { header: 'Station Count', accessor: (p) => p.cellCount },
        { header: <SortHeader label="Avg % Complete" keyName="avgCompletion" />, accessor: (p) => `${p.avgCompletion}%` },
        {
            header: <SortHeader label="At Risk" keyName="atRiskCellsCount" />,
            accessor: (p) => p.atRiskCellsCount > 0
                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{p.atRiskCellsCount} Stations</span>
                : <span className="text-gray-400">-</span>
        },
        { header: 'Status', accessor: (p) => <StatusPill status={p.status} /> },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Projects" subtitle="Manage all simulation projects" />
            <DataTable data={getSortedProjects()} columns={columns} />
        </div>
    );
}
