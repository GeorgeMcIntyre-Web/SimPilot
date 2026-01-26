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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Detailed content for this aspect will appear here.
        </p>
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
