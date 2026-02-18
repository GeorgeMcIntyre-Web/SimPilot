import { FieldMatchResult } from '../../../ingestion/fieldMatcher'
import { SheetQualityScore } from '../../../ingestion/dataQualityScoring'

export interface SheetMappingData {
  workbookId: string
  sheetName: string
  matches: FieldMatchResult[]
  qualityScore?: SheetQualityScore
  sampleValues?: Record<number, string[]> // columnIndex → sample values
}

export interface SheetMappingInspectorProps {
  sheets: SheetMappingData[]
  onRerunProjection?: (workbookId: string, sheetName: string) => void
  className?: string
}
