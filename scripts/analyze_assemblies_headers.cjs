const XLSX = require('xlsx');
const path = require('path');

const file = 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\DesignOS\\02_Assemblies_List\\J11006_TMS_STLA_S_BOTTOM_TRAY_Assemblies_List.xlsm';

console.log('Analyzing:', file);

const wb = XLSX.readFile(file);
const sheet = wb.Sheets['A_List'];
const range = XLSX.utils.decode_range(sheet['!ref']);

console.log('\nLooking for header row (checking rows 1-15):');

for (let r = 0; r < 15; r++) {
  const firstCellRef = XLSX.utils.encode_cell({ r, c: 0 });
  const firstCell = sheet[firstCellRef];
  const firstValue = firstCell ? String(firstCell.v).trim() : '';

  // Check if this row looks like a header
  if (firstValue.toLowerCase().includes('station') ||
      firstValue.toLowerCase().includes('tool') ||
      firstValue.toLowerCase().includes('equipment') ||
      firstValue.toLowerCase().includes('job') ||
      firstValue.toLowerCase().includes('item')) {
    console.log(`\n📍 Row ${r + 1} looks like a header row!`);
    console.log('First 15 columns:');
    for (let c = 0; c <= Math.min(14, range.e.c); c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      const value = cell ? String(cell.v).trim() : '';
      if (value) {
        console.log(`  [${XLSX.utils.encode_col(c)}${r + 1}] ${value}`);
      }
    }
  }
}
