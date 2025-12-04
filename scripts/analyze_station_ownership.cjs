/**
 * Station Ownership Analysis
 *
 * Analyzes DES vs CSG simulation status files to determine
 * which supplier owns which stations/areas
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILES = {
  // DES Internal Simulation Status
  desRear: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`,
  desUnderbody: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`,

  // CSG External Simulation Status
  csgFront: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\DesignOS\05_Status_Sheets\STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx`,
  csgRear: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\DesignOS\05_Status_Sheets\STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx`,
  csgUnderbody: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\DesignOS\05_Status_Sheets\STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx`
};

function extractStationData(filePath, supplier, area) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${path.basename(filePath)}`);
    return [];
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'SIMULATION';

    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`⚠️ No SIMULATION sheet in ${path.basename(filePath)}`);
      return [];
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find header row (usually row 2 or 3)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row.some(cell => String(cell).includes('ASSEMBLY LINE') || String(cell).includes('STATION'))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.log(`⚠️ Could not find header row in ${path.basename(filePath)}`);
      return [];
    }

    const headers = data[headerRowIndex];
    const areaColIndex = headers.findIndex(h => String(h).toUpperCase().includes('AREA'));
    const lineColIndex = headers.findIndex(h => String(h).toUpperCase().includes('ASSEMBLY LINE'));
    const stationColIndex = headers.findIndex(h => String(h).toUpperCase().includes('STATION'));
    const robotColIndex = headers.findIndex(h => String(h).toUpperCase().includes('ROBOT') && !String(h).includes('POSITION'));

    const stations = [];
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      const areaName = row[areaColIndex] || '';
      const assemblyLine = row[lineColIndex] || '';
      const station = row[stationColIndex] || '';
      const robot = row[robotColIndex] || '';

      if (station && station !== '') {
        stations.push({
          supplier,
          area,
          areaName: String(areaName).trim(),
          assemblyLine: String(assemblyLine).trim(),
          station: String(station).trim(),
          robot: String(robot).trim(),
          stationKey: `${assemblyLine}_${station}_${robot}`.trim()
        });
      }
    }

    return stations;

  } catch (error) {
    console.log(`❌ Error reading ${path.basename(filePath)}: ${error.message}`);
    return [];
  }
}

function analyzeOwnership() {
  console.log('🔍 Analyzing Station Ownership (DES vs CSG)\n');
  console.log('='.repeat(80));

  // Extract all station data
  const allStations = [
    ...extractStationData(FILES.desRear, 'DES', 'REAR_UNIT'),
    ...extractStationData(FILES.desUnderbody, 'DES', 'UNDERBODY'),
    ...extractStationData(FILES.csgFront, 'CSG', 'FRONT_UNIT'),
    ...extractStationData(FILES.csgRear, 'CSG', 'REAR_UNIT'),
    ...extractStationData(FILES.csgUnderbody, 'CSG', 'UNDERBODY')
  ];

  console.log(`\n📊 Total Rows Extracted: ${allStations.length}\n`);

  // Group by area and supplier
  const byArea = {};
  allStations.forEach(s => {
    if (!byArea[s.area]) {
      byArea[s.area] = { DES: [], CSG: [] };
    }
    byArea[s.area][s.supplier].push(s);
  });

  // Analyze each area
  Object.keys(byArea).sort().forEach(area => {
    console.log('='.repeat(80));
    console.log(`📍 AREA: ${area}`);
    console.log('='.repeat(80));

    const desStations = byArea[area].DES || [];
    const csgStations = byArea[area].CSG || [];

    console.log(`\n   DES Internal: ${desStations.length} station-robot combinations`);
    console.log(`   CSG External: ${csgStations.length} station-robot combinations\n`);

    // Get unique assembly lines
    const desLines = [...new Set(desStations.map(s => s.assemblyLine))].filter(Boolean).sort();
    const csgLines = [...new Set(csgStations.map(s => s.assemblyLine))].filter(Boolean).sort();

    console.log('   Assembly Lines:');
    console.log(`      DES: ${desLines.join(', ') || 'None'}`);
    console.log(`      CSG: ${csgLines.join(', ') || 'None'}`);

    // Check for overlaps
    const desStationKeys = new Set(desStations.map(s => s.stationKey));
    const csgStationKeys = new Set(csgStations.map(s => s.stationKey));

    const overlaps = [...desStationKeys].filter(k => csgStationKeys.has(k));

    if (overlaps.length > 0) {
      console.log(`\n   ⚠️  OVERLAP DETECTED: ${overlaps.length} station-robot combinations in both DES and CSG`);
      console.log('      Sample overlaps:');
      overlaps.slice(0, 5).forEach(key => {
        console.log(`         ${key}`);
      });
      if (overlaps.length > 5) {
        console.log(`         ... and ${overlaps.length - 5} more`);
      }
    } else {
      console.log('\n   ✅ No overlap - DES and CSG work on different stations');
    }

    // Show sample stations for each supplier
    if (desStations.length > 0) {
      console.log('\n   DES Sample Stations (first 10):');
      const uniqueDES = [...new Set(desStations.map(s => `${s.assemblyLine} / ${s.station}`))];
      uniqueDES.slice(0, 10).forEach(station => {
        console.log(`      ${station}`);
      });
      if (uniqueDES.length > 10) {
        console.log(`      ... and ${uniqueDES.length - 10} more`);
      }
    }

    if (csgStations.length > 0) {
      console.log('\n   CSG Sample Stations (first 10):');
      const uniqueCSG = [...new Set(csgStations.map(s => `${s.assemblyLine} / ${s.station}`))];
      uniqueCSG.slice(0, 10).forEach(station => {
        console.log(`      ${station}`);
      });
      if (uniqueCSG.length > 10) {
        console.log(`      ... and ${uniqueCSG.length - 10} more`);
      }
    }

    console.log('');
  });

  // Overall summary
  console.log('='.repeat(80));
  console.log('📊 OVERALL SUMMARY');
  console.log('='.repeat(80));

  const totalDES = allStations.filter(s => s.supplier === 'DES').length;
  const totalCSG = allStations.filter(s => s.supplier === 'CSG').length;

  console.log(`\nTotal station-robot combinations:`);
  console.log(`   DES Internal: ${totalDES}`);
  console.log(`   CSG External: ${totalCSG}`);
  console.log(`   Grand Total:  ${totalDES + totalCSG}`);

  // Create ownership map
  const ownershipMap = {};
  allStations.forEach(s => {
    const key = `${s.area}|${s.assemblyLine}|${s.station}`;
    if (!ownershipMap[key]) {
      ownershipMap[key] = { area: s.area, line: s.assemblyLine, station: s.station, suppliers: new Set() };
    }
    ownershipMap[key].suppliers.add(s.supplier);
  });

  const desOnly = Object.values(ownershipMap).filter(v => v.suppliers.size === 1 && v.suppliers.has('DES')).length;
  const csgOnly = Object.values(ownershipMap).filter(v => v.suppliers.size === 1 && v.suppliers.has('CSG')).length;
  const both = Object.values(ownershipMap).filter(v => v.suppliers.size === 2).length;

  console.log(`\nUnique Stations:`);
  console.log(`   DES Only:  ${desOnly} stations`);
  console.log(`   CSG Only:  ${csgOnly} stations`);
  console.log(`   Both:      ${both} stations (⚠️ need clarification)`);

  // Export to JSON for further analysis
  const outputPath = path.join(__dirname, '..', 'station_ownership_analysis.json');
  const output = {
    timestamp: new Date().toISOString(),
    totalStationRobotCombinations: allStations.length,
    bySupplier: {
      DES: totalDES,
      CSG: totalCSG
    },
    byArea: Object.keys(byArea).reduce((acc, area) => {
      acc[area] = {
        DES: byArea[area].DES.length,
        CSG: byArea[area].CSG.length
      };
      return acc;
    }, {}),
    stationOwnership: Object.values(ownershipMap).map(v => ({
      area: v.area,
      assemblyLine: v.line,
      station: v.station,
      suppliers: [...v.suppliers]
    }))
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Detailed analysis exported to: ${outputPath}\n`);
}

analyzeOwnership();
