import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 백업 폴더 경로
const BACKUP_DIR = 'C:\\alexDB\\results\\DB1';

async function importExcelFile(filePath: string, scrapeDate: string) {
    console.log(`\n📂 Processing: ${path.basename(filePath)}`);
    console.log(`   Date: ${scrapeDate}`);

    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // JSON으로 변환
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`   Rows: ${data.length}`);

    if (data.length === 0) {
        console.log(`   ⚠️  Empty file, skipping`);
        return { inserted: 0, skipped: 0 };
    }

    // 회사 코드 → company_id 매핑 가져오기
    const { data: companies } = await supabase
        .from('companies')
        .select('id, code, name');

    const codeToId = new Map(companies?.map(c => [c.code, c.id]) || []);

    // 데이터 변환
    const records: any[] = [];
    let skipped = 0;

    for (const row of data) {
        // 종목코드 추출
        const code = String(row['종목코드'] || '').padStart(6, '0');

        if (!code || code === '000000') {
            skipped++;
            continue;
        }

        const companyId = codeToId.get(code);
        if (!companyId) {
            skipped++;
            continue;
        }

        // 연도별 데이터 추출 (2024, 2025, 2026, 2027)
        const years = [2024, 2025, 2026, 2027];

        for (const year of years) {
            // 엑셀 컬럼명: "2024년 매출액", "2024년 영업이익" 등
            const revenue = row[`${year}년 매출액`];
            const opProfit = row[`${year}년 영업이익`];

            // 데이터가 있는 경우만 추가
            // 엑셀 값은 이미 억원 단위이므로 100,000,000을 곱해서 원 단위로 변환
            if (revenue || opProfit) {
                records.push({
                    company_id: companyId,
                    year: year,
                    scrape_date: scrapeDate,
                    revenue: revenue ? Math.round(revenue * 100_000_000) : null,
                    operating_profit: opProfit ? Math.round(opProfit * 100_000_000) : null,
                    net_income: null,
                    eps: null,
                    per: null,
                    roe: null,
                    is_estimate: year >= 2025, // 2025년 이후는 추정치
                    data_source: 'naver'
                });
            }
        }
    }

    console.log(`   Converted: ${records.length} records`);
    console.log(`   Skipped: ${skipped} rows`);

    if (records.length === 0) {
        return { inserted: 0, skipped };
    }

    // DB에 삽입 (배치 처리)
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const { error } = await supabase
            .from('financial_data_extended')
            .upsert(batch, {
                onConflict: 'company_id,year,scrape_date,data_source'
            });

        if (error) {
            console.error(`   ❌ Batch error:`, error.message);
        } else {
            inserted += batch.length;
        }
    }

    console.log(`   ✅ Inserted: ${inserted} records`);
    return { inserted, skipped };
}

async function main() {
    console.log('🚀 Excel Backup Import Started\n');
    console.log('='.repeat(80));

    // 백업 폴더의 모든 엑셀 파일 찾기
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
        .sort();

    console.log(`\n📁 Found ${files.length} Excel files\n`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let processedFiles = 0;

    for (const file of files) {
        // 파일명에서 날짜 추출 (예: stock_2025-07-09.xlsx)
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) {
            console.log(`⚠️  Skipping ${file} - cannot extract date`);
            continue;
        }

        const scrapeDate = dateMatch[1];
        const filePath = path.join(BACKUP_DIR, file);

        try {
            const result = await importExcelFile(filePath, scrapeDate);
            totalInserted += result.inserted;
            totalSkipped += result.skipped;
            processedFiles++;

            // 진행상황 표시
            if (processedFiles % 10 === 0) {
                console.log(`\n📈 Progress: ${processedFiles}/${files.length} files`);
                console.log(`   Total inserted: ${totalInserted.toLocaleString()}`);
            }
        } catch (error: any) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 Import Complete!\n');
    console.log(`Summary:`);
    console.log(`  Files processed: ${processedFiles}`);
    console.log(`  Records inserted: ${totalInserted.toLocaleString()}`);
    console.log(`  Rows skipped: ${totalSkipped.toLocaleString()}`);

    // 최종 검증
    const { count } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    console.log(`\n  Total records in DB: ${count?.toLocaleString()}`);

    // 날짜 개수 확인
    const { data: dates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(1000);

    const uniqueDates = [...new Set(dates?.map(d => d.scrape_date) || [])];
    console.log(`  Unique dates: ${uniqueDates.length}`);
    console.log(`  Date range: ${uniqueDates[uniqueDates.length - 1]} ~ ${uniqueDates[0]}`);
}

main().catch(console.error);
