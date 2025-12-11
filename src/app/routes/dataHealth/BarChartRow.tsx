interface BarChartRowProps {
  label: string;
  value: number;
  maxValue: number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
};

export function BarChartRow({ label, value, maxValue, color }: BarChartRowProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-28 text-sm text-gray-600 dark:text-gray-400 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color]} transition-all duration-300`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
        {value}
      </span>
    </div>
  );
}
