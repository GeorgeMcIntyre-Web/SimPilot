export interface FileImportAdapter {
  readFileAsArrayBuffer(file: File): Promise<ArrayBuffer>
}
