import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'c:\\Users\\George\\source\\repos\\SimPilot\\user_data\\d\\OneDrive_1_2025-11-29\\01_Equipment_List\\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx';

try {
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    console.log('Sheet Names:', workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        console.log('First 5 rows:');
        rows.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    });
} catch (err) {
    console.error('Error reading file:', err);
}
