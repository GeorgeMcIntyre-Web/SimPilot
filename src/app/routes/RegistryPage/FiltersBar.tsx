type FiltersBarProps = {
  searchTerm: string
  plantFilter: string
  statusFilter: 'all' | 'active' | 'inactive'
  staleFilter: boolean
  allPlants: string[]
  onSearchChange: (value: string) => void
  onPlantChange: (value: string) => void
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void
  onStaleToggle: (value: boolean) => void
}

export function FiltersBar({
  searchTerm,
  plantFilter,
  statusFilter,
  staleFilter,
  allPlants,
  onSearchChange,
  onPlantChange,
  onStatusChange,
  onStaleToggle,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <input
        type="text"
        placeholder="Search by UID, key, label, or code..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
      <select
        value={plantFilter}
        onChange={(e) => onPlantChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        <option value="all">All Plants</option>
        {allPlants.map((plant) => (
          <option key={plant} value={plant}>
            {plant}
          </option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as 'all' | 'active' | 'inactive')}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer">
        <input
          type="checkbox"
          checked={staleFilter}
          onChange={(e) => onStaleToggle(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm">Stale only (30+ days)</span>
      </label>
    </div>
  )
}
