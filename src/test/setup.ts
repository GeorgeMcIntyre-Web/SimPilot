import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

function defineSessionStorageForNode(): void {
  if (typeof window !== 'undefined') {
    return
  }

  if (typeof sessionStorage !== 'undefined') {
    return
  }

  let store: Record<string, string> = {}
  const sessionStorageMock: Storage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  })
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result
      if (result instanceof ArrayBuffer) {
        resolve(result)
        return
      }

      reject(new Error('Failed to read as ArrayBuffer'))
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error('Unknown FileReader error'))
    }

    reader.readAsArrayBuffer(blob)
  })
}

function polyfillArrayBufferForFile(): void {
  if (typeof File === 'undefined') {
    return
  }

  if (typeof File.prototype.arrayBuffer === 'function') {
    return
  }

  File.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return readBlobAsArrayBuffer(this)
  }
}

function polyfillArrayBufferForBlob(): void {
  if (typeof Blob === 'undefined') {
    return
  }

  if (typeof Blob.prototype.arrayBuffer === 'function') {
    return
  }

  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return readBlobAsArrayBuffer(this)
  }
}

defineSessionStorageForNode()
polyfillArrayBufferForFile()
polyfillArrayBufferForBlob()
