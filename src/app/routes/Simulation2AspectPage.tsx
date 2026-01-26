import { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'

const friendlyTitle = (aspect?: string): string => {
  if (!aspect) return 'Aspect'
  return aspect
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function Simulation2AspectPage() {
  const { aspect } = useParams<{ aspect: string }>()
  const [searchParams] = useSearchParams()
  const robot = searchParams.get('robot') || 'Unknown Robot'

  const title = useMemo(() => friendlyTitle(aspect), [aspect])

  const robotSimulationFields: { label: string; percent: number | null }[] = [
    { label: 'Robot Position - Stage 1', percent: null },
    { label: 'DCS Configured', percent: null },
    { label: 'DRESS PACK & FRYING PAN CONFIGURED - STAGE 1', percent: null },
    { label: 'ROBOT FLANGE PCD + ADAPTERS CHECKED', percent: null },
    { label: 'ALL EOAT PAYLOADS CHECKED', percent: null },
    { label: 'ROBOT TYPE CONFIRMED', percent: null },
    { label: 'ROBOT RISER CONFIRMED', percent: null },
    { label: 'TRACK LENGTH + CATRAC CONFIRMED', percent: null },
    { label: 'COLLISIONS CHECKED - STAGE 1', percent: null }
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Viewing aspect:
        </div>
        <div className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Robot: <span className="font-medium">{robot}</span>
        </div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {robotSimulationFields.map(({ label, percent }) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm"
            >
              <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
                <span className="truncate pr-3">{label}</span>
                <span className="text-gray-700 dark:text-gray-200">
                  {typeof percent === 'number' ? `${percent}%` : '—'}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: typeof percent === 'number' ? `${percent}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/simulation-2"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          &larr; Back to Simulation-2
        </Link>
      </div>
    </div>
  )
}

export default Simulation2AspectPage
