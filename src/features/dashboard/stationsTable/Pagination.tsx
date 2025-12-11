interface PaginationProps {
  currentPage: number;
  totalPages: number;
  displayedCount: number;
  totalCount: number;
  onPageChange: (direction: 'prev' | 'next') => void;
}

export function Pagination({
  currentPage,
  totalPages,
  displayedCount,
  totalCount,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
      <span>
        Page {currentPage} of {totalPages} • Showing {displayedCount} of {totalCount} rows
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange('prev')}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange('next')}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
