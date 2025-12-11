interface ClearDataDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearDataDialog({ onConfirm, onCancel }: ClearDataDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clear all data?</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This will remove loaded simulation, equipment, tool list, and assemblies data. This action cannot be undone.
          </p>
        </div>
        <div className="px-6 pb-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition-colors"
          >
            Yes, clear data
          </button>
        </div>
      </div>
    </div>
  );
}
