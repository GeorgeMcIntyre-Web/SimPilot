import type { FileImportAdapter } from '../../core/adapters/FileImportAdapter'

export const browserFileImportAdapter: FileImportAdapter = {
  async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer()
  },
}
