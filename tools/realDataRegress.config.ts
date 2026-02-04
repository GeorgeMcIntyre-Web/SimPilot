import { join } from 'path'
import type { DatasetConfig } from './realDataRegress.types'

export const DATASETS: DatasetConfig[] = [
  {
    name: 'BMW',
    rootPath: 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\BMW\\'
  },
  {
    name: 'J11006_TMS',
    rootPath: 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\J11006_TMS\\'
  },
  {
    name: 'V801',
    rootPath: 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\'
  }
]

export const ARTIFACTS_DIR = join(process.cwd(), 'artifacts', 'real-data-regress')
