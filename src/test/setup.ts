// Test setup file for Vitest
// Includes jest-dom matchers for DOM assertions
import '@testing-library/jest-dom'

// Polyfills for File/Blob APIs that may be missing in jsdom

// Import testing-library matchers
import '@testing-library/jest-dom/vitest'

// Import vi for mocking
import { vi } from 'vitest'

// Mock sessionStorage for Node.js test environment (when jsdom is not available)
// jsdom provides sessionStorage automatically, but we ensure it exists for node environment
if (typeof sessionStorage === 'undefined' && typeof window === 'undefined') {
    const sessionStorageMock = (() => {
        let store: Record<string, string> = {}
        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => {
                store[key] = value.toString()
            },
            removeItem: (key: string) => {
                delete store[key]
            },
            clear: () => {
                store = {}
            },
            get length() {
                return Object.keys(store).length
            },
            key: (index: number) => {
                const keys = Object.keys(store)
                return keys[index] || null
            }
        }
    })()
    Object.defineProperty(global, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
    })
}

// Polyfill File.prototype.arrayBuffer if not available
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    resolve(reader.result)
                } else {
                    reject(new Error('Failed to read file as ArrayBuffer'))
                }
            }
            reader.onerror = () => reject(reader.error || new Error('Unknown FileReader error'))
            reader.readAsArrayBuffer(this)
        })
    }
}

// Polyfill Blob.prototype.arrayBuffer if not available
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    resolve(reader.result)
                } else {
                    reject(new Error('Failed to read blob as ArrayBuffer'))
                }
            }
            reader.onerror = () => reject(reader.error || new Error('Unknown FileReader error'))
            reader.readAsArrayBuffer(this)
        })
    }
}

// Mock simulation feature to prevent React Router ESM import errors in non-component tests
vi.mock('../features/simulation', () => ({
    syncSimulationStore: vi.fn(),
    simulationStore: {
        clear: vi.fn(),
        setStations: vi.fn(),
        getState: vi.fn(() => ({ stations: [], loading: false, errors: [] }))
    },
    useSimulationStore: vi.fn(),
    useAllStations: vi.fn(() => []),
    useSimulationLoading: vi.fn(() => false),
    useSimulationErrors: vi.fn(() => []),
    usePrograms: vi.fn(() => []),
    usePlants: vi.fn(() => []),
    useUnits: vi.fn(() => []),
    useLines: vi.fn(() => []),
    useFilteredStations: vi.fn(() => []),
    useStationByKey: vi.fn(() => null),
    useHierarchyTree: vi.fn(() => []),
    generateContextKey: vi.fn((program, plant, unit, line, station) => `${program}|${plant}|${unit}|${line}|${station}`),
    parseContextKey: vi.fn(() => ({ program: '', plant: '', unit: '', line: '', station: '' }))
}))
