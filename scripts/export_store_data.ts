/**
 * Export Store Data Script
 * 
 * Loads all files, then exports the store data as JSON
 * that can be imported into the browser.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { ingestFiles } from '../src/ingestion/ingestionCoordinator'
import { coreStore } from '../src/domain/coreStore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Polyfill for File object in Node environment
class NodeFile {
    name: string
    lastModified: number
    private _buffer: Buffer

    constructor(buffer: Buffer, name: string) {
        this.name = name
        this._buffer = buffer
        this.lastModified = Date.now()
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        return this._buffer.buffer.slice(
            this._buffer.byteOffset,
            this._buffer.byteOffset + this._buffer.byteLength
        )
    }
}

function createFileFromPath(filePath: string): File {
    const buffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)
    const nodeFile = new NodeFile(buffer, fileName) as unknown as File
    return nodeFile as File
}

async function main() {
    const filePaths = [
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\STLA_S_ZAR Tool List.xlsx`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_RISERS.xlsx`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\P1MX_Reuse Equipment -STLA-S_2025_10_29_REV00.xlsm`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`,
        String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Zangenpool_TMS_Rev01_Quantity_Force_Info.xls`
    ]

    console.log('🚀 Loading all files and exporting store data...\n')

    const allFiles: File[] = []
    const fileSources: Record<string, 'local' | 'remote'> = {}

    for (const filePath of filePaths) {
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${path.basename(filePath)}`)
            continue
        }

        try {
            const file = createFileFromPath(filePath)
            allFiles.push(file)
            fileSources[file.name] = 'local'
            console.log(`✅ Loaded: ${file.name}`)
        } catch (error) {
            console.error(`❌ Error loading ${path.basename(filePath)}:`, error)
        }
    }

    if (allFiles.length === 0) {
        console.error('❌ No files loaded!')
        return
    }

    // Clear store first
    coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: [],
        tools: [],
        warnings: []
    })

    console.log(`\n📊 Processing ${allFiles.length} files...\n`)

    try {
        const result = await ingestFiles({
            simulationFiles: allFiles,
            equipmentFiles: allFiles,
            fileSources,
            dataSource: 'Local'
        })

        console.log('\n✅ Ingestion complete!')
        console.log(`   Projects: ${result.projectsCount}`)
        console.log(`   Areas: ${result.areasCount}`)
        console.log(`   Cells: ${result.cellsCount}`)
        console.log(`   Robots: ${result.robotsCount}`)
        console.log(`   Tools: ${result.toolsCount}`)

        // Get snapshot
        const snapshot = coreStore.getSnapshot()
        
        // Export to JSON file
        const exportPath = path.join(__dirname, '..', 'exported_store_data.json')
        fs.writeFileSync(exportPath, JSON.stringify(snapshot, null, 2), 'utf-8')
        
        console.log(`\n💾 Store data exported to: ${exportPath}`)
        console.log(`\n📋 To load this in the browser:`)
        console.log(`   1. Open browser console (F12)`)
        console.log(`   2. Run: coreStore.loadSnapshot(${JSON.stringify(snapshot)})`)
        console.log(`   3. Or navigate to Data Loader and the data should auto-load from IndexedDB`)

    } catch (error) {
        console.error('\n❌ Error during ingestion:', error)
    }
}

main().catch(console.error)



