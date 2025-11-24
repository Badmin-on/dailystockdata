
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface FinancialRecord {
    year: number;
    revenue: number | null;
    operating_profit: number | null;
    net_income: number | null;
    eps: number | null;
    per: number | null;
    roe: number | null;
}

async function scrapeCompany(companyId: number, code: string) {
    console.error(`Processing ${code}...`);

    try {
        // 1. Get encparam
        const mainUrl = `https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=${code}`;
        const mainResponse = await axios.get(mainUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const match = mainResponse.data.match(/encparam\s*:\s*['"]([^'"]+)['"]/);
        if (!match) {
            console.error(`❌ No encparam found for ${code}`);
            return;
        }
        const encparam = match[1];

        // 2. Fetch AJAX
        const ajaxUrl = `https://navercomp.wisereport.co.kr/company/ajax/cF1001.aspx?cmp_cd=${code}&fin_typ=0&freq_typ=Y&encparam=${encparam}&id=`;
        const ajaxResponse = await axios.get(ajaxUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': mainUrl,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const decoded = iconv.decode(Buffer.from(ajaxResponse.data), 'euc-kr');
        const $ = cheerio.load(decoded);

        // 3. Parse Headers (Years) - Hardcoded based on observation
        const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];
        console.error('Using hardcoded years:', years);

        const records: { [year: number]: FinancialRecord } = {};

        // 4. Map rows
        $('tbody tr').each((i, tr) => {
            const title = $(tr).find('th').text().trim();
            let field: keyof FinancialRecord | null = null;

            if (title.includes('매출액')) field = 'revenue';
            else if (title === '영업이익') field = 'operating_profit';
            else if (title.includes('지배주주순이익')) field = 'net_income';
            else if (title.includes('EPS')) field = 'eps';
            else if (title.includes('PER')) field = 'per';
            else if (title.includes('ROE')) field = 'roe';

            if (field) {
                $(tr).find('td').each((j, td) => {
                    if (j < years.length) {
                        const year = years[j];
                        if (!records[year]) records[year] = {
                            year, revenue: null, operating_profit: null, net_income: null, eps: null, per: null, roe: null
                        };

                        const valStr = $(td).text().trim().replace(/,/g, '');
                        const val = (valStr && valStr !== 'N/A' && valStr !== '-') ? parseFloat(valStr) : null;

                        if (field === 'net_income') {
                            if (title.includes('지배주주')) {
                                records[year][field] = val;
                            } else if (records[year][field] === null) {
                                records[year][field] = val;
                            }
                        } else {
                            records[year][field] = val;
                        }
                    }
                });
            }
        });

        console.error(`Prepared ${Object.keys(records).length} records.`);

        // 5. Save to DB
        const upsertData = Object.values(records).map(r => ({
            company_id: companyId,
            year: r.year,
            revenue: r.revenue,
            operating_profit: r.operating_profit,
            net_income: r.net_income,
            eps: r.eps,
            per: r.per,
            roe: r.roe,
            data_source: 'naver_wise',
            scrape_date: new Date().toISOString().split('T')[0]
        }));

        if (upsertData.length > 0) {
            const { error } = await supabaseAdmin
                .from('financial_data_extended')
                .upsert(upsertData, { onConflict: 'company_id,year,data_source' });

            if (error) console.error(`❌ DB Error for ${code}:`, error.message);
            else console.error(`✅ Saved ${upsertData.length} records for ${code}`);
        } else {
            console.error('⚠️ No data to save.');
        }

    } catch (error: any) {
        console.error(`❌ Error processing ${code}:`, error.message);
    }
}

// Run for Samsung
scrapeCompany(1, '005930');
