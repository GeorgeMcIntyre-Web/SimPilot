import { readFileSync } from 'fs';
import { read } from 'xlsx';
import { parseRobotList } from '../src/ingestion/robotListParser';

const filePath = String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`;

async function test() {
    const wb = read(readFileSync(filePath), { type: 'buffer' });
    const result = await parseRobotList(wb, 'test.xlsx', 'STLA-S');
    
    console.log('First 5 robots:\n');
    result.robots.slice(0, 5).forEach((robot, i) => {
        console.log(`Robot ${i + 1}:`);
        console.log(`  areaName: ${robot.areaName || 'MISSING'}`);
        console.log(`  lineCode: ${robot.lineCode || 'MISSING'}`);
        console.log(`  stationCode: ${robot.stationCode || 'MISSING'}`);
        console.log(`  metadata.Index: ${robot.metadata?.Index || 'MISSING'}`);
        console.log('');
    });
}

test().catch(console.error);

