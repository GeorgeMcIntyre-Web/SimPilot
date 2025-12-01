// Test setup file for Vitest
// Polyfills for File/Blob APIs that may be missing in jsdom

import '@testing-library/jest-dom/vitest'

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
