import { CanonicalIdDisplay } from '../../components/registry/CanonicalIdDisplay'
import { LastSeenBadge } from '../../components/registry/LastSeenBadge'
import { RobotRecord } from '../../domain/uidTypes'

type RobotRegistryTableProps = {
  robots: RobotRecord[]
  searchTerm: string
}

export function RobotRegistryTable({ robots, searchTerm }: RobotRegistryTableProps) {
  if (robots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm
            ? 'No robots match your search.'
            : 'No robots yet. Import an Excel file to populate the registry.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              UID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Canonical Key
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Plant
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Labels
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Seen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {robots.map((robot) => (
            <tr key={robot.uid} className={robot.status === 'inactive' ? 'opacity-50' : ''}>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full
                  ${
                    robot.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}
                >
                  {robot.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <code className="text-xs text-gray-600 dark:text-gray-400">{robot.uid}</code>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <CanonicalIdDisplay
                  plantKey={robot.plantKey}
                  uid={robot.uid}
                  entityKey={robot.key}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {robot.plantKey}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {robot.labels.robotName || robot.labels.robotCaption || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <LastSeenBadge
                  lastSeenImportRunId={robot.lastSeenImportRunId}
                  status={robot.status}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
