import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.7) return 'text-green-600 dark:text-green-400'
  if (confidence >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

export function getConfidenceIcon(confidence: number) {
  if (confidence >= 0.7) return <CheckCircle className="w-4 h-4 text-green-500" />
  if (confidence >= 0.4) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
  return <XCircle className="w-4 h-4 text-red-500" />
}

export function getFieldCategory(role: string): string {
  if (['TOOL_ID', 'ROBOT_ID', 'GUN_NUMBER', 'DEVICE_NAME', 'SERIAL_NUMBER'].includes(role)) {
    return 'Identity'
  }
  if (['AREA', 'STATION', 'LINE_CODE', 'ZONE', 'CELL'].includes(role)) {
    return 'Location'
  }
  if (['REUSE_STATUS', 'SOURCING', 'PROJECT'].includes(role)) {
    return 'Status'
  }
  if (
    ['GUN_FORCE', 'OEM_MODEL', 'ROBOT_TYPE', 'PAYLOAD', 'REACH', 'HEIGHT', 'BRAND'].includes(role)
  ) {
    return 'Technical'
  }
  if (['ENGINEER', 'SIM_LEADER', 'TEAM_LEADER'].includes(role)) {
    return 'Personnel'
  }
  if (['DUE_DATE', 'START_DATE', 'END_DATE'].includes(role)) {
    return 'Dates'
  }
  return 'Other'
}
