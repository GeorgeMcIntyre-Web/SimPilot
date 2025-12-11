import { ReactNode, useMemo, useState } from 'react';
import { cn } from '../lib/utils';

export interface Column<T> {
    header: ReactNode;
    accessor: (item: T) => ReactNode;
    className?: string;
    sortValue?: (item: T) => string | number | null | undefined;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    enableSorting?: boolean;
    defaultSortIndex?: number;
    defaultSortDirection?: 'asc' | 'desc';
}

export function DataTable<T>({
    data,
    columns,
    onRowClick,
    emptyMessage = "No data available",
    enableSorting = false,
    defaultSortIndex,
    defaultSortDirection = 'asc'
}: DataTableProps<T>) {
    const [sortIndex, setSortIndex] = useState<number | null>(enableSorting ? defaultSortIndex ?? null : null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

    const sortedData = useMemo(() => {
        if (!enableSorting || sortIndex === null || !columns[sortIndex]?.sortValue) {
            return data;
        }
        const sorter = columns[sortIndex].sortValue;
        return [...data].sort((a, b) => {
            const va = sorter!(a);
            const vb = sorter!(b);

            // Normalize values for comparison
            const normalize = (v: any) => {
                if (v === null || v === undefined) return '';
                if (typeof v === 'string') return v.toLowerCase();
                return v;
            };

            const na = normalize(va);
            const nb = normalize(vb);

            if (na < nb) return sortDirection === 'asc' ? -1 : 1;
            if (na > nb) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, columns, enableSorting, sortDirection, sortIndex]);

    const handleSortClick = (idx: number) => {
        if (!enableSorting) return;
        if (sortIndex === idx) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortIndex(idx);
            setSortDirection('asc');
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg h-full">
            <div className="overflow-y-auto h-full custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className={cn(
                                        "py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6",
                                        col.className
                                    )}
                                >
                                    {enableSorting && col.sortValue ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSortClick(idx)}
                                            className="inline-flex items-center gap-1 text-left hover:text-blue-600 focus:outline-none"
                                        >
                                            <span>{col.header}</span>
                                            <span className="text-[11px] text-gray-400">
                                                {sortIndex === idx ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                            </span>
                                        </button>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                        {sortedData.map((item, rowIdx) => (
                            <tr
                                key={rowIdx}
                                onClick={() => onRowClick?.(item)}
                                className={cn(
                                    onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" : ""
                                )}
                            >
                                {columns.map((col, colIdx) => (
                                    <td
                                        key={colIdx}
                                        className={cn(
                                            "whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 dark:text-gray-300 sm:pl-6",
                                            col.className
                                        )}
                                    >
                                        {col.accessor(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
