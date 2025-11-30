import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const outputDir = path.join(process.cwd(), 'tests', 'fixtures', 'excel');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Simulation Status File
const simStatusData = [
    ['Project', 'Area', 'Line', 'Station', 'Robot', 'Sim_Status', 'Olp_Status'],
    ['P_TEST', 'BodyShop', 'Line1', '10', 'R1', '100%', '100%'],
    ['P_TEST', 'BodyShop', 'Line1', '20', 'R2', '50%', '0%'],
    ['P_TEST', 'BodyShop', 'Line2', '10', 'R3', '0%', '0%']
];

const wbSim = XLSX.utils.book_new();
const wsSim = XLSX.utils.aoa_to_sheet(simStatusData);
XLSX.utils.book_append_sheet(wbSim, wsSim, 'Sheet1');
XLSX.writeFile(wbSim, path.join(outputDir, 'SimulationStatus_TEST.xlsx'));

// 2. Equipment List File
const equipmentData = [
    ['Area', 'Line', 'Station', 'Robot Name', 'Robot Model'],
    ['BodyShop', 'Line1', '10', 'R1', 'KUKA_KR210'],
    ['BodyShop', 'Line1', '20', 'R2', 'KUKA_KR210'],
    ['BodyShop', 'Line2', '10', 'R3', 'ABB_6700']
];

const wbEq = XLSX.utils.book_new();
const wsEq = XLSX.utils.aoa_to_sheet(equipmentData);
XLSX.utils.book_append_sheet(wbEq, wsEq, 'Sheet1');
XLSX.writeFile(wbEq, path.join(outputDir, 'EquipmentList_TEST.xlsx'));

console.log('Fixtures generated successfully.');
