import React from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { StationsTable } from '../../features/dashboard/StationsTable'

function Simulation2Page() {
  const { cells, loading, hasData } = useCrossRefData()
  const tableCells = hasData ? cells : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulation-2"
        subtitle="Side-by-side workspace"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <section className="flex-1 lg:flex-none lg:basis-[40%] lg:max-w-[40%] bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Panel A</h2>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading stations...</div>
            ) : (
              <div className="h-full overflow-auto">
                <StationsTable
                  cells={tableCells}
                  selectedArea={null}
                  onSelectStation={() => {}}
                  variant="plain"
                />
              </div>
            )}
          </div>
        </section>

        <section className="flex-1 lg:flex-none lg:basis-[60%] lg:max-w-[60%] bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Panel B</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Right area (70%). Add primary simulation details or visualizations here.
          </p>
        </section>
      </div>
    </div>
  )
}

export default Simulation2Page
