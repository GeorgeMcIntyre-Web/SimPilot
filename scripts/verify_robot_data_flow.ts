import { readFileSync } from 'fs';
import path from 'path';
import { read } from 'xlsx';
import { parseRobotList } from '../src/ingestion/robotListParser';
import { coreStore } from '../src/domain/coreStore';

const DATA_ROOT = process.env.SIMPILOT_DATA_PATH ?? path.resolve(process.cwd(), 'SimPilot_Data');
const filePath = path.join(
  DATA_ROOT,
  '03_Simulation',
  '01_Equipment_List',
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx'
);
const targetSheetName = 'STLA-S';

async function verifyDataFlow() {
    console.log('🔍 Verifying Robot Data Flow\n');
    console.log('=' .repeat(80));
    
    // Step 1: Parse the file
    console.log('\n📄 Step 1: Parsing Excel file...');
    const workbook = read(readFileSync(filePath), { type: 'buffer' });
    const parseResult = await parseRobotList(workbook, filePath, targetSheetName);
    
    console.log(`✅ Parsed ${parseResult.robots.length} robots`);
    console.log(`⚠️  ${parseResult.warnings.length} warnings\n`);
    
    // Step 2: Check first 5 robots from parser
    console.log('📊 Step 2: Sample robots from parser:');
    parseResult.robots.slice(0, 5).forEach((robot, i) => {
        console.log(`\n  Robot ${i + 1}:`);
        console.log(`    ID: ${robot.id}`);
        console.log(`    Name: ${robot.name}`);
        console.log(`    lineCode: ${robot.lineCode || 'MISSING'}`);
        console.log(`    stationCode: ${robot.stationCode || 'MISSING'}`);
        console.log(`    stationNumber: ${robot.stationNumber || 'MISSING'}`);
        console.log(`    areaName: ${robot.areaName || 'MISSING'}`);
        console.log(`    metadata.lineCode: ${robot.metadata?.lineCode || 'MISSING'}`);
        console.log(`    Has metadata: ${Object.keys(robot.metadata || {}).length > 0}`);
    });
    
    // Step 3: Simulate storing in coreStore
    console.log('\n\n💾 Step 3: Storing in coreStore...');
    coreStore.setData({
        projects: [],
        areas: [],
        cells: [],
        robots: parseResult.robots,
        tools: [],
        warnings: []
    }, 'Local');
    
    // Step 4: Retrieve from store
    console.log('📥 Step 4: Retrieving from coreStore...');
    const state = coreStore.getState();
    const storedRobots = state.assets.filter(a => a.kind === 'ROBOT');
    
    console.log(`✅ Retrieved ${storedRobots.length} robots from store\n`);
    
    // Step 5: Check first 5 robots from store
    console.log('📊 Step 5: Sample robots from store (as UnifiedAsset):');
    storedRobots.slice(0, 5).forEach((asset, i) => {
        console.log(`\n  Asset ${i + 1}:`);
        console.log(`    ID: ${asset.id}`);
        console.log(`    Name: ${asset.name}`);
        console.log(`    kind: ${asset.kind}`);
        console.log(`    stationNumber: ${asset.stationNumber || 'MISSING'}`);
        console.log(`    areaName: ${asset.areaName || 'MISSING'}`);
        console.log(`    metadata.lineCode: ${asset.metadata?.lineCode || 'MISSING'}`);
        console.log(`    Has metadata: ${Object.keys(asset.metadata || {}).length > 0}`);
        
        // Check if it's actually a Robot type
        if ('lineCode' in asset) {
            const robot = asset as any;
            console.log(`    lineCode (direct): ${robot.lineCode || 'MISSING'}`);
            console.log(`    stationCode (direct): ${robot.stationCode || 'MISSING'}`);
        }
    });
    
    // Step 6: Compare parser vs store
    console.log('\n\n🔍 Step 6: Data Integrity Check:');
    let missingStationNumber = 0;
    let missingLineCode = 0;
    let hasStationNumber = 0;
    let hasLineCode = 0;
    
    storedRobots.forEach((asset, i) => {
        const original = parseResult.robots[i];
        if (!original) return;
        
        if (!asset.stationNumber) missingStationNumber++;
        else hasStationNumber++;
        
        const lineCodeInMeta = asset.metadata?.lineCode;
        if (!lineCodeInMeta) missingLineCode++;
        else hasLineCode++;
        
        if (i < 3) {
            console.log(`\n  Robot ${i + 1} comparison:`);
            console.log(`    Parser lineCode: ${original.lineCode || 'N/A'}`);
            console.log(`    Store metadata.lineCode: ${lineCodeInMeta || 'N/A'}`);
            console.log(`    Parser stationCode: ${original.stationCode || 'N/A'}`);
            console.log(`    Store stationNumber: ${asset.stationNumber || 'N/A'}`);
        }
    });
    
    console.log(`\n\n📈 Summary:`);
    console.log(`    Robots with stationNumber: ${hasStationNumber}/${storedRobots.length}`);
    console.log(`    Robots with lineCode in metadata: ${hasLineCode}/${storedRobots.length}`);
    console.log(`    Missing stationNumber: ${missingStationNumber}`);
    console.log(`    Missing lineCode: ${missingLineCode}`);
    
    if (missingStationNumber > 0 || missingLineCode > 0) {
        console.log(`\n❌ ISSUE DETECTED: Data is being lost during storage!`);
    } else {
        console.log(`\n✅ All data preserved correctly!`);
    }
}

verifyDataFlow().catch(console.error);



