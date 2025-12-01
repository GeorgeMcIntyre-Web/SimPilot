import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = path.join(__dirname, '../tests/e2e/fixtures/excel');
if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. Simulation Status File
const simData = [
    ['Project', 'Area', 'Cell', 'Robot', 'Sim %', 'Sim Status', 'Study Path'],
    ['P_TEST', 'Area 1', 'Cell 1', 'R1', 100, 'Approved', 'C:\\Sims\\Cell1.psz'],
    ['P_TEST', 'Area 1', 'Cell 2', 'R2', 50, 'InProgress', 'C:\\Sims\\Cell2.psz'],
    ['P_TEST', 'Area 1', 'Cell 3', 'R3', 0, 'NotStarted', 'C:\\Sims\\Cell3.psz']
];

const simWb = XLSX.utils.book_new();
const simWs = XLSX.utils.aoa_to_sheet(simData);
XLSX.utils.book_append_sheet(simWb, simWs, 'SimulationStatus');
XLSX.writeFile(simWb, path.join(fixturesDir, 'SimulationStatus_TEST.xlsx'));

// 2. Equipment List File
const eqData = [
    ['Project', 'Area', 'Cell', 'Robot', 'Tool', 'Tool Type'],
    ['P_TEST', 'Area 1', 'Cell 1', 'R1', 'Gun1', 'Spot Weld'],
    ['P_TEST', 'Area 1', 'Cell 2', 'R2', 'Gun2', 'Spot Weld'],
    ['P_TEST', 'Area 1', 'Cell 3', 'R3', 'Gun3', 'Spot Weld']
];

const eqWb = XLSX.utils.book_new();
const eqWs = XLSX.utils.aoa_to_sheet(eqData);
XLSX.utils.book_append_sheet(eqWb, eqWs, 'EquipmentList');
XLSX.writeFile(eqWb, path.join(fixturesDir, 'EquipmentList_TEST.xlsx'));

console.log('Generated test fixtures in ' + fixturesDir);
