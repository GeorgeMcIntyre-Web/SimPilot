import { coreStore } from '../src/domain/coreStore';

console.log('🔍 Debugging Assets in Store\n');
console.log('='.repeat(80));

const state = coreStore.getState();
const assets = state.assets;

console.log(`\n📊 Total assets: ${assets.length}`);
console.log(`   Robots: ${assets.filter(a => a.kind === 'ROBOT').length}`);
console.log(`   Tools: ${assets.filter(a => a.kind !== 'ROBOT').length}\n`);

// Check robots specifically
const robots = assets.filter(a => a.kind === 'ROBOT');
console.log(`\n🤖 Analyzing ${robots.length} robots:\n`);

let hasStationNumber = 0;
let hasLineCode = 0;
let missingBoth = 0;

robots.slice(0, 20).forEach((robot, i) => {
    const stationNumber = robot.stationNumber;
    const lineCode = robot.metadata?.lineCode;
    
    if (stationNumber) hasStationNumber++;
    if (lineCode) hasLineCode++;
    if (!stationNumber && !lineCode) missingBoth++;
    
    if (i < 10) {
        console.log(`  Robot ${i + 1}: ${robot.name}`);
        console.log(`    stationNumber: ${stationNumber || 'MISSING'}`);
        console.log(`    metadata.lineCode: ${lineCode || 'MISSING'}`);
        console.log(`    areaName: ${robot.areaName || 'MISSING'}`);
        console.log(`    sourceFile: ${robot.sourceFile.split(/[/\\]/).pop()}`);
        console.log('');
    }
});

console.log(`\n📈 Summary (first 20 robots):`);
console.log(`    Has stationNumber: ${hasStationNumber}/20`);
console.log(`    Has lineCode in metadata: ${hasLineCode}/20`);
console.log(`    Missing both: ${missingBoth}/20`);

// Check if data is from Robotlist_ZA file
const robotlistRobots = robots.filter(r => 
    r.sourceFile.includes('Robotlist_ZA') || 
    r.sourceFile.includes('STLA-S')
);

console.log(`\n📄 Robots from Robotlist_ZA file: ${robotlistRobots.length}`);
if (robotlistRobots.length > 0) {
    console.log(`\n  Sample from Robotlist_ZA:`);
    robotlistRobots.slice(0, 5).forEach((robot, i) => {
        console.log(`    ${i + 1}. ${robot.name}`);
        console.log(`       stationNumber: ${robot.stationNumber || 'MISSING'}`);
        console.log(`       metadata.lineCode: ${robot.metadata?.lineCode || 'MISSING'}`);
    });
}


