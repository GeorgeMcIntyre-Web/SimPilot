/**
 * Load All Files Script
 * 
 * Loads all specified Excel files through the schema-agnostic ingestion system
 * and displays the results.
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

// Convert Node.js File-like to browser File
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

    console.log('🚀 Loading all files through schema-agnostic ingestion...\n')
    console.log(`Found ${filePaths.length} files to process\n`)

    // Separate files by type (we'll let the sniffer detect, but separate for organization)
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

    console.log(`\n📊 Processing ${allFiles.length} files through ingestion pipeline...\n`)

    // Clear the store first
    coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: [],
        tools: [],
        stands: [],
        weldGuns: [],
        spotWelds: [],
        robotGunAssignments: [],
        users: [],
        checklists: [],
        changeLogs: [],
        ingestionWarnings: []
    })

    try {
        // Process all files
        const result = await ingestFiles({
            simulationFiles: allFiles, // Let the sniffer determine which are simulation files
            equipmentFiles: allFiles,  // And which are equipment files
            fileSources,
            dataSource: 'Local'
        })

        console.log('\n' + '='.repeat(60))
        console.log('📈 INGESTION RESULTS')
        console.log('='.repeat(60))
        console.log(`\n✅ Projects: ${result.projectsCount}`)
        console.log(`✅ Areas: ${result.areasCount}`)
        console.log(`✅ Cells: ${result.cellsCount}`)
        console.log(`✅ Robots: ${result.robotsCount}`)
        console.log(`✅ Tools: ${result.toolsCount}`)
        console.log(`\n⚠️  Warnings: ${result.warnings.length}`)

        if (result.warnings.length > 0) {
            console.log('\n📋 Warnings:')
            result.warnings.slice(0, 20).forEach((warning, i) => {
                console.log(`  ${i + 1}. [${warning.type}] ${warning.message}`)
                if (warning.filename) {
                    console.log(`     File: ${warning.filename}`)
                }
            })
            if (result.warnings.length > 20) {
                console.log(`  ... and ${result.warnings.length - 20} more warnings`)
            }
        }

        // Get actual data from store
        const storeData = coreStore.getSnapshot()
        console.log('\n' + '='.repeat(60))
        console.log('📊 STORE DATA SUMMARY')
        console.log('='.repeat(60))
        console.log(`\n📁 Projects: ${storeData.projects?.length ?? 0}`)
        if (storeData.projects && storeData.projects.length > 0) {
            storeData.projects.forEach(p => {
                console.log(`   - ${p.name} (${p.areas?.length ?? 0} areas)`)
            })
        }

        console.log(`\n🏭 Areas: ${storeData.areas?.length ?? 0}`)
        console.log(`\n🏗️  Cells: ${storeData.cells?.length ?? 0}`)
        if (storeData.cells && storeData.cells.length > 0) {
            console.log('   Sample cells:')
            storeData.cells.slice(0, 5).forEach(c => {
                console.log(`   - ${c.name} (Area: ${c.areaId}, Project: ${c.projectId})`)
            })
        }

        console.log(`\n🤖 Robots: ${storeData.robots?.length ?? 0}`)
        if (storeData.robots && storeData.robots.length > 0) {
            console.log('   Sample robots:')
            storeData.robots.slice(0, 5).forEach(r => {
                console.log(`   - ${r.id} (Type: ${r.type}, Payload: ${r.payload}kg)`)
            })
        }

        console.log(`\n🔧 Assets (Robots + Tools): ${storeData.assets?.length ?? 0}`)
        if (storeData.assets && storeData.assets.length > 0) {
            const robots = storeData.assets.filter(a => a.kind === 'ROBOT')
            const tools = storeData.assets.filter(a => a.kind === 'TOOL' || a.kind === 'GUN')
            console.log(`   - Robots: ${robots.length}`)
            console.log(`   - Tools/Guns: ${tools.length}`)
            if (robots.length > 0) {
                console.log('   Sample robots:')
                robots.slice(0, 3).forEach(r => {
                    console.log(`     - ${r.name} (ID: ${r.id}, Area: ${r.areaName || 'N/A'})`)
                })
            }
            if (tools.length > 0) {
                console.log('   Sample tools:')
                tools.slice(0, 3).forEach(t => {
                    console.log(`     - ${t.name} (ID: ${t.id}, Gun#: ${t.gunNumber || 'N/A'})`)
                })
            }
        }

        console.log(`\n📋 Checklists: ${storeData.checklists?.length ?? 0}`)
        console.log(`\n📝 Change Logs: ${storeData.changeLogs?.length ?? 0}`)

        console.log('\n' + '='.repeat(60))
        console.log('✅ INGESTION COMPLETE!')
        console.log('='.repeat(60))
        console.log('\n💡 Next steps:')
        console.log('   - Review the data in the store')
        console.log('   - Check warnings for any issues')
        console.log('   - Use the data in the application')

    } catch (error) {
        console.error('\n❌ Error during ingestion:', error)
        if (error instanceof Error) {
            console.error('   Message:', error.message)
            console.error('   Stack:', error.stack)
        }
    }
}

main().catch(console.error)

