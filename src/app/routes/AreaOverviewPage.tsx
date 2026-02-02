import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'

export function AreaOverviewPage() {
    const { areaKey } = useParams<{ areaKey: string }>()
    const title = areaKey ? decodeURIComponent(areaKey) : 'Area'

    return (
        <div className="space-y-4">
            <PageHeader
                title={`Area Overview — ${title}`}
                subtitle={
                    <PageHint
                        standardText="Area-level overview"
                        flowerText="Timeline and readiness context per area."
                    />
                }
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: title, href: '#' }
                ]}
            />

            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-sm text-gray-600 dark:text-gray-300">
                This area overview page is ready for metrics. Hook in per-area readiness and schedule details here.
            </div>

            <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
                ← Back to Dashboard
            </Link>
        </div>
    )
}

export default AreaOverviewPage
