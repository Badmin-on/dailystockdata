import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = 'C:\\alexDB\\results\\DB1';

async function examineExcelFile() {
    // 첫 번째 엑셀 파일 찾기
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
        .sort();

    if (files.length === 0) {
        console.log('❌ No Excel files found');
        return;
    }

    const firstFile = files[0];
    const filePath = path.join(BACKUP_DIR, firstFile);

    console.log(`📂 Examining: ${firstFile}\n`);

    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(filePath);

    console.log(`📊 Sheets: ${workbook.SheetNames.join(', ')}\n`);

    // 첫 번째 시트 분석
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // JSON으로 변환
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📈 Total rows: ${data.length}\n`);

    if (data.length > 0) {
        console.log('🔍 Column names:');
        const columns = Object.keys(data[0]);
        columns.forEach((col, i) => {
            console.log(`   ${i + 1}. ${col}`);
        });

        console.log('\n📋 Sample data (first row):');
        const firstRow = data[0];
        Object.entries(firstRow).slice(0, 20).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });

        console.log('\n📋 Sample data (second row):');
        if (data.length > 1) {
            const secondRow = data[1];
            Object.entries(secondRow).slice(0, 20).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        }
    }
}

examineExcelFile().catch(console.error);
