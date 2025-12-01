import { simBridgeClient } from './SimBridgeClient'
import {
    SimBridgeServiceState,
    SimBridgeError,
    SimBridgeErrorKind
} from './simBridgeTypes'
import { recordSimBridgeEvent } from './simBridgeDiagnostics'
import { inferProjectFromStudyPath, inferCellFromStudyPath } from './simBridgeDomainAdapter'

/**
 * SimBridge Service
 * Safe adapter around the raw client with state management and error mapping.
 */
export class SimBridgeService {
    private state: SimBridgeServiceState = {
        status: 'unknown'
    }

    /**
     * Get current state
     */
    getState(): SimBridgeServiceState {
        return { ...this.state }
    }

    /**
     * Update internal state
     */
    private setState(updates: Partial<SimBridgeServiceState>) {
        this.state = { ...this.state, ...updates }
    }

    /**
     * Map raw errors to typed SimBridgeErrors
     */
    private mapError(error: unknown, context: string): SimBridgeError {
        let kind: SimBridgeErrorKind = 'unknown'
        let message = 'An unknown error occurred'

        if (error instanceof Error) {
            message = error.message
            if (message.includes('fetch') || message.includes('network')) kind = 'network'
            else if (message.includes('timeout')) kind = 'timeout'
            else if (message.includes('404')) kind = 'study_not_found'
            else if (message.includes('500') || message.includes('502')) kind = 'gateway_unavailable'
        }

        const typedError: SimBridgeError = {
            kind,
            message,
            at: new Date().toISOString()
        }

        recordSimBridgeEvent({
            at: new Date().toISOString(),
            type: 'error',
            message: `Error in ${context}: ${message}`,
            meta: { kind, details: error }
        })

        return typedError
    }

    /**
     * Connect to SimBridge
     */
    async connect(): Promise<SimBridgeServiceState> {
        this.setState({ status: 'connecting' })
        recordSimBridgeEvent({
            at: new Date().toISOString(),
            type: 'connect',
            message: 'Initiating connection...'
        })

        try {
            const isConnected = await simBridgeClient.connect()

            if (isConnected) {
                this.setState({ status: 'connected', lastError: undefined })
                recordSimBridgeEvent({
                    at: new Date().toISOString(),
                    type: 'connect',
                    message: 'Connected successfully'
                })

                // Auto-refresh status to get version/study info
                await this.refreshStatus()
            } else {
                const error: SimBridgeError = {
                    kind: 'gateway_unavailable',
                    message: 'Could not connect to SimBridge server',
                    at: new Date().toISOString()
                }
                this.setState({ status: 'disconnected', lastError: error })
                recordSimBridgeEvent({
                    at: new Date().toISOString(),
                    type: 'error',
                    message: 'Connection failed'
                })
            }
        } catch (e) {
            const error = this.mapError(e, 'connect')
            this.setState({ status: 'error', lastError: error })
        }

        return this.getState()
    }

    /**
     * Refresh status from server
     */
    async refreshStatus(): Promise<SimBridgeServiceState> {
        try {
            const status = await simBridgeClient.getStatus()

            if (status.isConnected) {
                this.setState({ status: 'connected' })

                // If there is an active study, update our state
                if (status.activeStudy) {
                    // Only update if it changed or we didn't have one
                    if (this.state.currentStudy?.studyPath !== status.activeStudy) {
                        this.setState({
                            currentStudy: {
                                studyPath: status.activeStudy,
                                loadedAt: new Date().toISOString(),
                                projectId: inferProjectFromStudyPath(status.activeStudy),
                                cellId: inferCellFromStudyPath(status.activeStudy)
                            }
                        })
                    }
                } else {
                    // No active study
                    this.setState({ currentStudy: undefined })
                }

                recordSimBridgeEvent({
                    at: new Date().toISOString(),
                    type: 'status',
                    message: 'Status refreshed',
                    meta: { version: status.version, activeStudy: status.activeStudy }
                })
            } else {
                this.setState({ status: 'disconnected' })
            }
        } catch (e) {
            const error = this.mapError(e, 'refreshStatus')
            this.setState({ status: 'error', lastError: error })
        }

        return this.getState()
    }

    /**
     * Load a study
     */
    async loadStudy(path: string, ctx?: { projectId?: string; cellId?: string }): Promise<SimBridgeServiceState> {
        if (!path.trim()) {
            const error: SimBridgeError = {
                kind: 'unknown',
                message: 'Study path cannot be empty',
                at: new Date().toISOString()
            }
            this.setState({ lastError: error })
            return this.getState()
        }

        recordSimBridgeEvent({
            at: new Date().toISOString(),
            type: 'loadStudy',
            message: `Loading study: ${path}`,
            meta: { ctx }
        })

        try {
            const success = await simBridgeClient.loadStudy(path)

            if (success) {
                this.setState({
                    status: 'connected',
                    currentStudy: {
                        studyPath: path,
                        loadedAt: new Date().toISOString(),
                        projectId: ctx?.projectId || inferProjectFromStudyPath(path),
                        cellId: ctx?.cellId || inferCellFromStudyPath(path)
                    },
                    lastError: undefined
                })

                recordSimBridgeEvent({
                    at: new Date().toISOString(),
                    type: 'loadStudy',
                    message: 'Study loaded successfully'
                })
            } else {
                const error: SimBridgeError = {
                    kind: 'study_not_found', // Assumption based on simple boolean return
                    message: 'Failed to load study (server returned false)',
                    at: new Date().toISOString()
                }
                this.setState({ lastError: error })
                recordSimBridgeEvent({
                    at: new Date().toISOString(),
                    type: 'error',
                    message: 'Load study failed'
                })
            }
        } catch (e) {
            const error = this.mapError(e, 'loadStudy')
            this.setState({ lastError: error })
        }

        return this.getState()
    }

    /**
     * Get a signal value
     */
    async getSignal(name: string): Promise<number | string | boolean | null> {
        try {
            const value = await simBridgeClient.getSignal(name)
            recordSimBridgeEvent({
                at: new Date().toISOString(),
                type: 'signalRead',
                message: `Read signal ${name}`,
                meta: { value }
            })
            return value
        } catch (e) {
            this.mapError(e, `getSignal(${name})`)
            return null
        }
    }

    /**
     * Set a signal value
     */
    async setSignal(name: string, value: number | string | boolean): Promise<void> {
        try {
            await simBridgeClient.setSignal(name, value)
            recordSimBridgeEvent({
                at: new Date().toISOString(),
                type: 'signalWrite',
                message: `Set signal ${name}`,
                meta: { value }
            })
        } catch (e) {
            this.mapError(e, `setSignal(${name})`)
        }
    }
}

// Singleton instance
export const simBridgeService = new SimBridgeService()
