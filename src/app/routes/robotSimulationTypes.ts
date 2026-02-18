import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'

export type StationRow = {
  cell: CellSnapshot
  label: string
  application: string
  applicationFull?: string
  assetId?: string
}
