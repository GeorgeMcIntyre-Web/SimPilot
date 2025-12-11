import { Activity, Package } from 'lucide-react';
import { BarChartRow } from './BarChartRow';
import type { ReuseSummary } from '../../../domain/dataHealthStore';

interface ReuseSummarySectionProps {
  reuseSummary: ReuseSummary;
}

const getStatusColor = (
  status: string
): 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' => {
  const statusColors: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'> = {
    AVAILABLE: 'green',
    ALLOCATED: 'blue',
    IN_USE: 'purple',
    RESERVED: 'yellow',
    UNKNOWN: 'gray',
  };
  return statusColors[status] ?? 'gray';
};

const getTypeColor = (type: string): 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' => {
  const typeColors: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'> = {
    Riser: 'blue',
    TipDresser: 'purple',
    TMSGun: 'yellow',
  };
  return typeColors[type] ?? 'gray';
};

export function ReuseSummarySection({ reuseSummary }: ReuseSummarySectionProps) {
  const maxStatusValue = Math.max(...Object.values(reuseSummary.byStatus), 1);
  const maxTypeValue = Math.max(...Object.values(reuseSummary.byType), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* By Status */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Reuse by Status
        </h3>
        {reuseSummary.total === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No reuse records loaded.</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(reuseSummary.byStatus).map(([status, count]) => (
              <BarChartRow
                key={status}
                label={status}
                value={count}
                maxValue={maxStatusValue}
                color={getStatusColor(status)}
              />
            ))}
          </div>
        )}
      </div>

      {/* By Type */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-500" />
          Reuse by Type
        </h3>
        {Object.keys(reuseSummary.byType).length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No reuse records loaded.</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(reuseSummary.byType).map(([type, count]) => (
              <BarChartRow
                key={type}
                label={type}
                value={count}
                maxValue={maxTypeValue}
                color={getTypeColor(type)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
