/**
 * CSG Document Analysis Script
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_ROOT = process.env.SIMPILOT_DATA_PATH || path.resolve(process.cwd(), 'SimPilot_Data');
const CSG_FILES = {
    frontUnit: path.join(DATA_ROOT, 'DesignOS', '00_Simulation_Status', 'STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx'),
    rearUnit: path.join(DATA_ROOT, 'DesignOS', '00_Simulation_Status', 'STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx'),
    underbody: path.join(DATA_ROOT, 'DesignOS', '00_Simulation_Status', 'STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx')
};

function getColumnNames(sheet, range) {
    const decoded = XLSX.utils.decode_range(range);
    const columns = [];
    for (let c = decoded.s.c; c <= decoded.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 1, c });
        const cell = sheet[cellRef];
        if (cell) {
            columns.push({
                index: c,
                name: String(cell.v).trim(),
                letter: XLSX.utils.encode_col(c)
            });
        }
    }
    return columns;
}

function analyzeSimulationSheet(filePath, area) {
    console.log('\n' + '='.repeat(100));
    console.log(`📊 ${area} - CSG Simulation Status`);
    console.log('='.repeat(100));

    if (!fs.existsSync(filePath)) {
        console.log('❌ FILE NOT FOUND!');
        return null;
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const simSheet = workbook.Sheets['SIMULATION'];
        if (!simSheet) {
            console.log('❌ SIMULATION sheet not found!');
            return null;
        }

        const range = simSheet['!ref'];
        const columns = getColumnNames(simSheet, range);

        console.log(`\n📋 Total Columns: ${columns.length}`);
        console.log('\nAll columns:');
        columns.forEach(col => {
            console.log(`  [${col.letter}] ${col.name}`);
        });

        const decoded = XLSX.utils.decode_range(range);
        let dataRows = 0;

        for (let r = 4; r <= decoded.e.r; r++) {
            let hasData = false;
            for (let c = decoded.s.c; c < decoded.s.c + 10; c++) {
                const cellRef = XLSX.utils.encode_cell({ r, c });
                const cell = simSheet[cellRef];
                if (cell && cell.v) {
                    hasData = true;
                    break;
                }
            }
            if (hasData) dataRows++;
        }

        console.log(`\nData rows: ${dataRows}`);
        return { area, columns: columns.length, dataRows };

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return null;
    }
}

function main() {
    console.log('🚀 CSG Document Analysis\n');

    const results = {
        frontUnit: analyzeSimulationSheet(CSG_FILES.frontUnit, 'FRONT UNIT'),
        rearUnit: analyzeSimulationSheet(CSG_FILES.rearUnit, 'REAR UNIT'),
        underbody: analyzeSimulationSheet(CSG_FILES.underbody, 'UNDERBODY')
    };

    console.log('\n' + '='.repeat(100));
    console.log('✅ Analysis complete!\n');
}

main();
