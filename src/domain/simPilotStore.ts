import { useEffect, useState } from 'react'
import type { ToolingSnapshot, BottleneckSnapshot, ToolingWorkflowStatus } from './toolingTypes'

export interface SimPilotStoreState {
  toolingSnapshot: ToolingSnapshot
  bottleneckSnapshot: BottleneckSnapshot | null
  workflowStatuses: ToolingWorkflowStatus[]
  isLoading: boolean
}

const defaultToolingSnapshot: ToolingSnapshot = {
  asOf: '',
  items: [],
  source: 'uninitialized'
}

const defaultBottleneckSnapshot: BottleneckSnapshot = {
  asOf: '',
  entries: []
}

let simPilotState: SimPilotStoreState = {
  toolingSnapshot: defaultToolingSnapshot,
  bottleneckSnapshot: defaultBottleneckSnapshot,
  workflowStatuses: [],
  isLoading: false
}

const subscribers = new Set<() => void>()

function notifySubscribers() {
  subscribers.forEach((callback) => callback())
}

export const simPilotStore = {
  getState(): SimPilotStoreState {
    return simPilotState
  },

  setToolingSnapshot(snapshot: ToolingSnapshot): void {
    simPilotState = {
      ...simPilotState,
      toolingSnapshot: snapshot,
      isLoading: false
    }
    notifySubscribers()
  },

  setBottleneckSnapshot(snapshot: BottleneckSnapshot | null): void {
    simPilotState = {
      ...simPilotState,
      bottleneckSnapshot: snapshot
    }
    notifySubscribers()
  },

  setWorkflowStatuses(statuses: ToolingWorkflowStatus[]): void {
    simPilotState = {
      ...simPilotState,
      workflowStatuses: statuses
    }
    notifySubscribers()
  },

  setLoading(isLoading: boolean): void {
    simPilotState = {
      ...simPilotState,
      isLoading
    }
    notifySubscribers()
  },

  hydrate(data: Partial<SimPilotStoreState>): void {
    simPilotState = {
      ...simPilotState,
      ...data
    }
    notifySubscribers()
  },

  clear(): void {
    simPilotState = {
      toolingSnapshot: defaultToolingSnapshot,
      bottleneckSnapshot: defaultBottleneckSnapshot,
      workflowStatuses: [],
      isLoading: false
    }
    notifySubscribers()
  },

  subscribe(callback: () => void): () => void {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }
}

export function useSimPilotStore(): SimPilotStoreState {
  const [state, setState] = useState(simPilotState)

  useEffect(() => {
    const unsubscribe = simPilotStore.subscribe(() => {
      setState(simPilotStore.getState())
    })
    return unsubscribe
  }, [])

  return state
}
