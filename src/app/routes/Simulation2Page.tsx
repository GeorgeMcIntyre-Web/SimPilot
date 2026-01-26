import React from 'react'
import { PageHeader } from '../../ui/components/PageHeader'

function Simulation2Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulation-2"
        subtitle="Side-by-side workspace"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <section className="flex-1 lg:flex-none lg:basis-[30%] lg:max-w-[30%] bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Panel A</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Left area (30%). Add your content or controls here.
          </p>
        </section>

        <section className="flex-1 lg:flex-none lg:basis-[70%] lg:max-w-[70%] bg-white dark:bg-gray-800 rounded-xl shadow p-4">
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
