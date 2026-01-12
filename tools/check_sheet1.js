const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const testDataPath = 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData';

function findFilesWithSheet1(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFilesWithSheet1(filePath, fileList);
    } else if (/\.(xlsx|xlsm|xls)$/i.test(file)) {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        
        if (sheetNames.includes('Sheet1')) {
          fileList.push({
            file: filePath,
            sheets: sheetNames
          });
        }
      } catch (err) {
        // Skip files that can't be read
        console.error(`Error reading ${filePath}: ${err.message}`);
      }
    }
  });
  
  return fileList;
}

if (fs.existsSync(testDataPath)) {
  const filesWithSheet1 = findFilesWithSheet1(testDataPath);
  
  console.log(`Found ${filesWithSheet1.length} files with Sheet1:\n`);
  filesWithSheet1.forEach(({ file, sheets }) => {
    console.log(file);
    console.log(`  Sheets: ${sheets.join(', ')}\n`);
  });
} else {
  console.error(`Path does not exist: ${testDataPath}`);
}
