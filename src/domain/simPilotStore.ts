// SimPilot Store
// Holds the latest SimPilotDataSnapshot plus loading metadata

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { SimPilotDataSnapshot } from './ExcelIngestionFacade'

export interface SimPilotStoreState {
  snapshot: SimPilotDataSnapshot | null
  isLoading: boolean
  errors: string[]
}

type Subscriber = () => void

const subscribers = new Set<Subscriber>()

let storeState: SimPilotStoreState = {
  snapshot: null,
  isLoading: false,
  errors: []
}

function notifySubscribers(): void {
  subscribers.forEach(callback => callback())
}

export const simPilotStore = {
  getState(): SimPilotStoreState {
    return storeState
  },

  setSnapshot(snapshot: SimPilotDataSnapshot): void {
    storeState = {
      ...storeState,
      snapshot,
      isLoading: false,
      errors: []
    }
    notifySubscribers()
  },

  setLoading(isLoading: boolean): void {
    storeState = {
      ...storeState,
      isLoading
    }
    notifySubscribers()
  },

  addError(error: string): void {
    storeState = {
      ...storeState,
      errors: [...storeState.errors, error],
      isLoading: false
    }
    notifySubscribers()
  },

  clearErrors(): void {
    storeState = {
      ...storeState,
      errors: []
    }
    notifySubscribers()
  },

  clear(): void {
    storeState = {
      snapshot: null,
      isLoading: false,
      errors: []
    }
    notifySubscribers()
  },

  subscribe(callback: Subscriber): () => void {
    subscribers.add(callback)
    return () => {
      subscribers.delete(callback)
    }
  }
}

export function useSimPilotStore(): SimPilotStoreState {
  const [state, setState] = useState<SimPilotStoreState>(storeState)

  useEffect(() => {
    const unsubscribe = simPilotStore.subscribe(() => {
      setState(simPilotStore.getState())
    })
    return unsubscribe
  }, [])

  return state
}

export function useSimPilotSelector<T>(selector: (state: SimPilotStoreState) => T): T {
  const state = useSyncExternalStore(
    simPilotStore.subscribe,
    simPilotStore.getState,
    simPilotStore.getState
  )
  return selector(state)
}
