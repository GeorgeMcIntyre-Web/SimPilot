/**
 * SimBridge Diagnostics
 * In-memory ring buffer for SimBridge events.
 */

export interface SimBridgeEvent {
    at: string
    type: 'connect' | 'status' | 'loadStudy' | 'signalRead' | 'signalWrite' | 'error'
    message: string
    meta?: Record<string, unknown>
}

const EVENT_LIMIT = 100
const events: SimBridgeEvent[] = []

/**
 * Record a SimBridge event to the in-memory log
 */
export function recordSimBridgeEvent(event: SimBridgeEvent): void {
    events.unshift(event)
    if (events.length > EVENT_LIMIT) {
        events.pop()
    }
}

/**
 * Get recent SimBridge events
 */
export function getSimBridgeEvents(limit: number = 50): SimBridgeEvent[] {
    return events.slice(0, limit)
}
