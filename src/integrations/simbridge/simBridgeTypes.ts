/**
 * SimBridge Types
 * Strictly typed definitions for the SimBridge integration layer.
 */

export type SimBridgeConnectionStatus =
    | 'unknown'
    | 'connecting'
    | 'connected'
    | 'degraded'
    | 'disconnected'
    | 'error'

export type SimBridgeErrorKind =
    | 'network'
    | 'timeout'
    | 'invalid_response'
    | 'study_not_found'
    | 'gateway_unavailable'
    | 'unknown'

export interface SimBridgeError {
    kind: SimBridgeErrorKind
    message: string
    at: string
    details?: Record<string, unknown>
}

export interface SimBridgeStudyState {
    studyPath: string
    loadedAt: string
    projectId?: string
    cellId?: string
}

export interface SimBridgeServiceState {
    status: SimBridgeConnectionStatus
    lastError?: SimBridgeError
    currentStudy?: SimBridgeStudyState
}
