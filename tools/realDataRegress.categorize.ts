import { readdirSync, statSync } from 'fs'
import { basename, extname, join } from 'path'
import { log } from './nodeLog'
import type { FileKind } from '../src/ingestion/sheetSniffer'
import type { CategorizedFile } from './realDataRegress.types'

/** Recursively find all Excel files in a directory */
export function walkDirectory(rootPath: string): string[] {
  const results: string[] = []

  function walk(dirPath: string) {
    try {
      const entries = readdirSync(dirPath)

      for (const entry of entries) {
        const fullPath = join(dirPath, entry)

        try {
          const stat = statSync(fullPath)

          if (stat.isDirectory()) {
            walk(fullPath)
          } else if (stat.isFile()) {
            const ext = extname(entry).toLowerCase()
            if (ext === '.xlsx' || ext === '.xlsm' || ext === '.xls') {
              if (!entry.startsWith('~$')) {
                results.push(fullPath)
              }
            }
          }
        } catch (err) {
          log.warn(`[walkDirectory] Cannot access ${fullPath}: ${err}`)
        }
      }
    } catch (err) {
      log.warn(`[walkDirectory] Cannot read directory ${dirPath}: ${err}`)
    }
  }

  walk(rootPath)
  return results
}

/** Categorize a file by analyzing its filename */
export function categorizeByFilename(fileName: string): CategorizedFile | null {
  const lower = fileName.toLowerCase()

  // Simulation Status
  if (lower.includes('simulation') && lower.includes('status')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'SimulationStatus' as FileKind,
      confidence: 'high',
      reason: 'Filename contains "simulation" and "status"'
    }
  }

  if (lower.includes('sim_status') || lower.includes('simstatus')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'SimulationStatus' as FileKind,
      confidence: 'high',
      reason: 'Filename pattern matches simulation status'
    }
  }

  // Robot List
  if (lower.includes('robotlist') || lower.includes('robot_list')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'RobotList' as FileKind,
      confidence: 'high',
      reason: 'Filename pattern matches robot list'
    }
  }

  if (lower.includes('robot') && (lower.includes('list') || lower.includes('spec'))) {
    if (!(lower.includes('equipment') || lower.includes('tool'))) {
      return {
        filePath: fileName,
        fileName: basename(fileName),
        sourceType: 'RobotList' as FileKind,
        confidence: 'high',
        reason: 'Filename contains "robot" and "list/spec"'
      }
    }
  }

  // Tool List
  const toolKeywords = ['tool', 'weld', 'gun', 'sealer', 'gripper', 'equipment']
  const toolMatches = toolKeywords.filter(kw => lower.includes(kw))

  if (toolMatches.length >= 1) {
    if (lower.includes('list') || lower.includes('wg') || lower.includes('riser')) {
      return {
        filePath: fileName,
        fileName: basename(fileName),
        sourceType: 'ToolList' as FileKind,
        confidence: 'high',
        reason: `Filename contains tool-related keywords: ${toolMatches.join(', ')}`
      }
    }

    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'ToolList' as FileKind,
      confidence: 'medium',
      reason: `Filename contains tool keywords: ${toolMatches.join(', ')}`
    }
  }

  // Assemblies List
  if (lower.includes('assemblies') || lower.includes('assembly')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'AssembliesList' as FileKind,
      confidence: 'high',
      reason: 'Filename contains "assemblies"'
    }
  }

  // Unknown
  return {
    filePath: fileName,
    fileName: basename(fileName),
    sourceType: 'Unknown' as FileKind,
    confidence: 'low',
    reason: 'No clear filename pattern match'
  }
}

/** Categorize all discovered files */
export function categorizeFiles(filePaths: string[]): CategorizedFile[] {
  return filePaths
    .map(filePath => categorizeByFilename(filePath))
    .filter((f): f is CategorizedFile => f !== null)
}
