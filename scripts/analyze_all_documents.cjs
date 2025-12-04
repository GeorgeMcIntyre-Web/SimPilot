/**
 * Comprehensive Document Analysis Script
 *
 * This script analyzes all Excel documents to understand their structure and content:
 * 1. Tool List
 * 2. Simulation Status documents
 * 3. Robot Equipment List
 * 4. Assemblies List documents
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// File paths
const FILES = {
    toolList: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\STLA_S_ZAR Tool List.xlsx`,
    simStatusRear: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`,
    simStatusUnderbody: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`,
    robotList: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`,
    assembliesBottomTray: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\J11006_TMS_STLA_S_BOTTOM_TRAY_Assemblies_List.xlsm`,
    assembliesFrontUnit: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm`,
    assembliesRearUnit: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\J11006_TMS_STLA_S_REAR_UNIT_Assemblies_List.xlsm`,
    assembliesUnderbody: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\J11006_TMS_STLA_S_UNDERBODY_Assemblies_List.xlsm`
};

function analyzeWorkbook(filePath, title) {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 ${title}`);
    console.log('='.repeat(80));
    console.log(`File: ${path.basename(filePath)}`);

    if (!fs.existsSync(filePath)) {
        console.log('❌ FILE NOT FOUND!');
        return null;
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const info = {
            fileName: path.basename(filePath),
            sheetNames: workbook.SheetNames,
            sheets: {}
        };

        console.log(`\n📑 Sheets (${workbook.SheetNames.length}):`);
        workbook.SheetNames.forEach((name, idx) => {
            console.log(`   ${idx + 1}. ${name}`);
        });

        // Analyze each sheet
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
            const rows = range.e.r - range.s.r + 1;
            const cols = range.e.c - range.s.c + 1;

            console.log(`\n   📄 Sheet: "${sheetName}"`);
            console.log(`      Size: ${rows} rows × ${cols} columns`);
            console.log(`      Range: ${sheet['!ref'] || 'Empty'}`);

            // Get headers (first 3 rows)
            const headers = [];
            for (let r = 0; r < Math.min(3, rows); r++) {
                const row = [];
                for (let c = 0; c < Math.min(20, cols); c++) {
                    const cellRef = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
                    const cell = sheet[cellRef];
                    row.push(cell ? String(cell.v).substring(0, 30) : '');
                }
                headers.push(row);
            }

            console.log(`      First 3 rows (headers):`);
            headers.forEach((row, idx) => {
                const nonEmpty = row.filter(v => v).slice(0, 10);
                if (nonEmpty.length > 0) {
                    console.log(`         Row ${idx + 1}: ${nonEmpty.join(' | ')}`);
                }
            });

            // Sample data (rows 4-8)
            if (rows > 3) {
                console.log(`      Sample data (rows 4-8):`);
                for (let r = 3; r < Math.min(8, rows); r++) {
                    const row = [];
                    for (let c = 0; c < Math.min(10, cols); c++) {
                        const cellRef = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
                        const cell = sheet[cellRef];
                        row.push(cell ? String(cell.v).substring(0, 20) : '');
                    }
                    const nonEmpty = row.filter(v => v);
                    if (nonEmpty.length > 0) {
                        console.log(`         Row ${r + 1}: ${nonEmpty.join(' | ')}`);
                    }
                }
            }

            info.sheets[sheetName] = {
                rows,
                cols,
                range: sheet['!ref'],
                headers: headers
            };
        });

        return info;

    } catch (error) {
        console.log(`❌ Error reading file: ${error.message}`);
        return null;
    }
}

function main() {
    console.log('🚀 SimPilot Document Analysis');
    console.log('Analyzing all Excel documents to understand structure and content\n');

    const results = {};

    // 1. Tool List
    results.toolList = analyzeWorkbook(FILES.toolList, '1. TOOL LIST (Manufactured In-House)');

    // 2. Simulation Status Documents
    results.simStatusRear = analyzeWorkbook(FILES.simStatusRear, '2a. SIMULATION STATUS - REAR UNIT');
    results.simStatusUnderbody = analyzeWorkbook(FILES.simStatusUnderbody, '2b. SIMULATION STATUS - UNDERBODY');

    // 3. Robot Equipment List
    results.robotList = analyzeWorkbook(FILES.robotList, '3. ROBOT EQUIPMENT LIST');

    // 4. Assemblies List Documents
    results.assembliesBottomTray = analyzeWorkbook(FILES.assembliesBottomTray, '4a. ASSEMBLIES LIST - BOTTOM TRAY');
    results.assembliesFrontUnit = analyzeWorkbook(FILES.assembliesFrontUnit, '4b. ASSEMBLIES LIST - FRONT UNIT');
    results.assembliesRearUnit = analyzeWorkbook(FILES.assembliesRearUnit, '4c. ASSEMBLIES LIST - REAR UNIT');
    results.assembliesUnderbody = analyzeWorkbook(FILES.assembliesUnderbody, '4d. ASSEMBLIES LIST - UNDERBODY');

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(80));

    const categories = [
        { name: 'Tool List', files: [results.toolList] },
        { name: 'Simulation Status', files: [results.simStatusRear, results.simStatusUnderbody] },
        { name: 'Robot Equipment', files: [results.robotList] },
        { name: 'Assemblies List', files: [results.assembliesBottomTray, results.assembliesFrontUnit, results.assembliesRearUnit, results.assembliesUnderbody] }
    ];

    categories.forEach(cat => {
        console.log(`\n${cat.name}:`);
        cat.files.forEach(result => {
            if (result) {
                console.log(`   ✅ ${result.fileName}`);
                console.log(`      Sheets: ${result.sheetNames.join(', ')}`);
            }
        });
    });

    console.log('\n✅ Analysis complete!\n');
}

main();
