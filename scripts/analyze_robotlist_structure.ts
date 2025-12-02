import { readFileSync } from 'fs';
import { read, utils } from 'xlsx';
import { sheetToMatrix, buildColumnMap } from '../src/ingestion/excelUtils';

const filePath = String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`;
const sheetName = 'STLA-S';

console.log('📊 Detailed Analysis of Robotlist_ZA Structure\n');
console.log('='.repeat(80));

const workbook = read(readFileSync(filePath), { type: 'buffer' });
const rows = sheetToMatrix(workbook, sheetName);

// Find header row
let headerRowIndex: number | null = null;
for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    const rowText = row.map(c => String(c || '').toUpperCase().trim()).join(' | ');
    if (rowText.includes('ASSEMBLY LINE') && rowText.includes('STATION NUMBER') && rowText.includes('ROBOTNUMBER')) {
        headerRowIndex = i;
        break;
    }
}

if (headerRowIndex === null) {
    console.log('❌ Could not find header row');
    process.exit(1);
}

console.log(`\n✅ Found header row at index ${headerRowIndex}\n`);

const headerRow = rows[headerRowIndex];
console.log('📋 Header Row:');
headerRow.forEach((cell, i) => {
    if (cell) {
        console.log(`  Col ${i}: "${cell}"`);
    }
});

// Build column map
const columnMap = buildColumnMap(headerRow, [
    'ROBOTNUMBER (E-NUMBER)',
    'ROBOTNUMBER',
    'ROBOT ID',
    'ROBOT',
    'ID',
    'ASSEMBLY LINE',
    'LINE',
    'LINE CODE',
    'STATION NUMBER',
    'STATION',
    'STATION CODE',
    'CELL',
    'ROBOT CAPTION',
    'AREA',
    'AREA NAME',
    'INDEX',
    'POSITION'
]);

console.log('\n🗺️  Column Map:');
Object.entries(columnMap).forEach(([key, index]) => {
    if (index !== null) {
        console.log(`  ${key}: Column ${index} ("${headerRow[index]}")`);
    }
});

// Check first data row
const dataRow = rows[headerRowIndex + 1];
console.log('\n📝 First Data Row (Row ' + (headerRowIndex + 1) + '):');
dataRow.forEach((cell, i) => {
    if (cell !== null && cell !== '') {
        const header = headerRow[i] || `Col ${i}`;
        console.log(`  ${header}: "${cell}"`);
    }
});

// Extract key values
console.log('\n🔍 Extracted Values from First Data Row:');
const getCell = (row: any[], colName: string): string | null => {
    const idx = columnMap[colName];
    if (idx === null || idx === undefined) return null;
    const val = row[idx];
    return val ? String(val).trim() : null;
};

const robotId = getCell(dataRow, 'ROBOTNUMBER (E-NUMBER)') 
    || getCell(dataRow, 'ROBOTNUMBER')
    || getCell(dataRow, 'ROBOT ID')
    || getCell(dataRow, 'ROBOT')
    || getCell(dataRow, 'ID')
    || getCell(dataRow, 'ROBOT CAPTION');

const lineCode = getCell(dataRow, 'ASSEMBLY LINE')
    || getCell(dataRow, 'LINE')
    || getCell(dataRow, 'LINE CODE');

const stationCode = getCell(dataRow, 'STATION NUMBER')
    || getCell(dataRow, 'STATION')
    || getCell(dataRow, 'STATION CODE')
    || getCell(dataRow, 'CELL');

const areaName = getCell(dataRow, 'AREA')
    || getCell(dataRow, 'AREA NAME');

console.log(`  Robot ID: ${robotId || 'MISSING'}`);
console.log(`  Line Code: ${lineCode || 'MISSING'}`);
console.log(`  Station Code: ${stationCode || 'MISSING'}`);
console.log(`  Area Name: ${areaName || 'MISSING'}`);

// Check a few more rows
console.log('\n📊 Sample of First 5 Data Rows:');
for (let i = 1; i <= 5; i++) {
    const row = rows[headerRowIndex + i];
    if (!row) break;
    
    const rId = getCell(row, 'ROBOTNUMBER (E-NUMBER)') || getCell(row, 'ROBOTNUMBER') || getCell(row, 'ROBOT CAPTION');
    const lCode = getCell(row, 'ASSEMBLY LINE');
    const sCode = getCell(row, 'STATION NUMBER');
    
    console.log(`\n  Row ${headerRowIndex + i}:`);
    console.log(`    Robot ID: ${rId || 'MISSING'}`);
    console.log(`    Assembly Line: ${lCode || 'MISSING'}`);
    console.log(`    Station Number: ${sCode || 'MISSING'}`);
}

