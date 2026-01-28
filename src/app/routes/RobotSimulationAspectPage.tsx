import { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'

type AspectField = { label: string; percent: number | null }

const ASPECT_FIELDS: Record<string, AspectField[]> = {
  'robot-simulation': [
    { label: 'Robot Position - Stage 1', percent: null },
    { label: 'DCS Configured', percent: null },
    { label: 'DRESS PACK & FRYING PAN CONFIGURED - STAGE 1', percent: null },
    { label: 'ROBOT FLANGE PCD + ADAPTERS CHECKED', percent: null },
    { label: 'ALL EOAT PAYLOADS CHECKED', percent: null },
    { label: 'ROBOT TYPE CONFIRMED', percent: null },
    { label: 'ROBOT RISER CONFIRMED', percent: null },
    { label: 'TRACK LENGTH + CATRAC CONFIRMED', percent: null },
    { label: 'COLLISIONS CHECKED - STAGE 1', percent: null }
  ],
  'spot-welding': [
    { label: 'SPOT Welds Distributed + Projected', percent: null },
    { label: 'Reference Weld Gun Collision Check', percent: null },
    { label: 'Reference Weld Gun Force Checked in WIS7', percent: null },
    { label: 'Weld Gun Proposal Created', percent: null },
    { label: 'Final Weld Gun Collision Check', percent: null },
    { label: 'Final Weld Gun Approved', percent: null },
    { label: 'Weld Gun Equipment placed and confirmed', percent: null }
  ],
  'sealer': [
    { label: 'SEALING DATA IMPORTED AND CHECKED', percent: null },
    { label: 'SEALER PROPOSAL CREATED AND SENT', percent: null },
    { label: 'SEALER GUN APPROVED', percent: null },
    { label: 'SEALER EQUIPMENT PLACED AND CONFIRMED', percent: null }
  ],
  'alternative-joining-applications': [
    { label: 'JOINING DATA DISTRIBUTED', percent: null },
    { label: 'REFERENCE EQUIPMENT SELECTED', percent: null },
    { label: 'EQUIPMENT COLLISION CHECK', percent: null },
    { label: 'EQUIPMENT PEDESTAL / ROBOT MOUNT ADAPTOR APPROVED', percent: null },
    { label: 'EQUIPMENT PLACED AND CONFIRMED', percent: null }
  ],
  'gripper': [
    { label: 'GRIPPER EQUIPMENT PROTOTYPE CREATED', percent: null },
    { label: 'FINAL GRIPPER COLLISION CHECK', percent: null },
    { label: 'GRIPPER DESIGN FINAL APPROVAL', percent: null },
    { label: 'TOOL CHANGE STANDS PLACED', percent: null }
  ],
  'fixture': [
    { label: 'FIXTURE EQUIPMENT PROTOTYPE CREATED', percent: null },
    { label: 'FINAL FIXTURE COLLISION CHECK', percent: null },
    { label: 'FIXTURE DESIGN FINAL APPROVAL', percent: null }
  ],
  'mrs': [
    { label: 'FULL ROBOT PATHS CREATED WITH AUX DATA SET', percent: null },
    { label: 'FINAL ROBOT POSITION', percent: null },
    { label: 'COLLISION CHECKS DONE WITH RCS MODULE', percent: null },
    { label: 'MACHINE OPERATION CHECKED AND MATCHES SIM', percent: null },
    { label: 'CYCLETIME CHART SEQUECNE AND COUNTS UPDATED', percent: null },
    { label: 'RCS MULTI RESOURCE SIMULATION RUNNING IN CYCLETIME', percent: null },
    { label: 'RCS MULTI  RESOURCE VIDEO RECORDED', percent: null }
  ],
  'olp': [
    { label: 'OLP DONE TO PROGRAMMING GUIDELINE', percent: null },
    { label: 'UTILITIES PATHS CRTEATED', percent: null }
  ],
  'documentation': [
    { label: 'INTERLOCK ZONING DOCUMENTATION CREATED', percent: null },
    { label: 'WIS7 SPOT LIST UPDATED', percent: null },
    { label: 'DCS DOCUMENTATION CREATED', percent: null },
    { label: 'ROBOT INSTALLATION DOCUMENTATION CREATED', percent: null },
    { label: '1A4 SHEET CREATED + COMPLETED', percent: null }
  ],
  'layout': [
    { label: 'LATEST LAYOUT IN SIMULATION', percent: null },
    { label: '3D CABLE TRAYS CHECKED AND MATCH LAYOUT', percent: null },
    { label: '3D FENCING CHECKED AND MATCH LAYOUT', percent: null },
    { label: '3D DUNNAGES CHECKED AND MATCH LAYOUT', percent: null },
    { label: '3D CABINETS CHECKED AND MATCH LAYOUT', percent: null },
    { label: 'FINAL LAYOUT INCLUDED MATCHING LAYOUT + SIM', percent: null },
    { label: 'ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM', percent: null }
  ]
}

const friendlyTitle = (aspect?: string): string => {
  if (!aspect) return 'Aspect'
  return aspect
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function RobotSimulationAspectPage() {
  const { aspect } = useParams<{ aspect: string }>()
  const [searchParams] = useSearchParams()
  const robot = searchParams.get('robot') || 'Unknown Robot'

  const title = useMemo(() => friendlyTitle(aspect), [aspect])
  const fields = useMemo<AspectField[]>(() => {
    if (aspect && ASPECT_FIELDS[aspect]) {
      return ASPECT_FIELDS[aspect]
    }
    return ASPECT_FIELDS['robot-simulation']
  }, [aspect])

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
        {fields.length > 0 ? (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map(({ label, percent }) => (
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
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
            No milestones defined for this aspect yet.
          </div>
        )}
        <Link
          to="/robot-simulation"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          &larr; Back to Robot Simulation
        </Link>
      </div>
    </div>
  )
}

export default RobotSimulationAspectPage
