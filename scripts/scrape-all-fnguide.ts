
/**
 * FnGuide Financial Data Scraper (All Companies)
 * Purpose: Collect financial estimates (including 2026/2027) that are missing from Naver
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

// Import dependencies after env vars are loaded
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client locally
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Rate Limiting
const RATE_LIMIT_DELAY = 1000; // 1 second

async function fetchFnGuideData(code: string) {
    const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${code}`;
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000
        });
        return iconv.decode(Buffer.from(response.data), 'utf-8');
    } catch (error) {
        console.error(`Error fetching ${code}:`, error);
        return null;
    }
}

function parseFnGuideData(html: string) {
    const $ = cheerio.load(html);
    const results: any[] = [];

    // Extract Current Price
    const priceText = $('#svdMainChartTxt11').text().replace(/,/g, '');
    const currentPrice = priceText ? parseFloat(priceText) : null;

    // Find the best Financial Highlight table
    let targetTable: any = null;

    $('table').each((i, el) => {
        // Check for year headers
        const headers = $(el).find('thead tr').last().find('th');
        const hasYears = headers.toArray().some(th => /\d{4}\/\d{2}/.test($(th).text()));

        // Check for financials
        const txt = $(el).text();
        const hasFinancials = txt.includes('매출액') || txt.includes('영업이익');

        if (hasYears && hasFinancials) {
            // Check distinct years (Annual)
            const yearValues = headers.toArray()
                .map(th => $(th).text().match(/(\d{4})\/\d{2}/))
                .filter(m => m)
                .map(m => m![1]);

            const uniqueYears = new Set(yearValues);

            // Must be distinct years
            if (yearValues.length === uniqueYears.size && yearValues.length > 0) {
                // Check if Revenue has data in the last column (to avoid tables with empty estimates)
                let hasLastColData = false;
                $(el).find('tbody tr').each((j, tr) => {
                    const title = $(tr).find('th').first().text().trim();
                    if (title.includes('매출액')) {
                        const cells = $(tr).find('td');
                        const lastCell = cells.last().text().trim();
                        if (lastCell && lastCell !== '') {
                            hasLastColData = true;
                        }
                    }
                });

                if (hasLastColData) {
                    targetTable = $(el);
                    return false; // Found a good table, stop searching
                }
            }
        }
    });

    if (!targetTable) return [];

    // Extract Headers (Years)
    const years: { year: number, isEstimate: boolean, index: number }[] = [];
    targetTable.find('thead tr').last().find('th').each((i: number, el: any) => {
        const text = $(el).text().trim();
        const yearMatch = text.match(/(\d{4})\/\d{2}/);
        if (yearMatch) {
            years.push({
                year: parseInt(yearMatch[1]),
                isEstimate: text.includes('(E)') || text.includes('컨센서스') || text.includes('추정치'),
                index: i
            });
        }
    });

    // Extract Data Rows
    const rowMap: any = {};
    targetTable.find('tbody tr').each((i: number, el: any) => {
        const title = $(el).find('th').first().text().trim();
        const cells = $(el).find('td');

        // Map FnGuide titles to our DB fields
        let field = '';
        if (title.includes('매출액')) field = 'revenue';
        else if (title.includes('영업이익') && !title.includes('발표기준')) field = 'operating_profit';
        else if (title.includes('당기순이익') && title.includes('지배')) field = 'net_income'; // Net Income (Controlling)
        else if (title.includes('당기순이익') && !field) field = 'net_income'; // Fallback
        else if (title.includes('EPS')) field = 'eps';
        else if (title.includes('PER')) field = 'per';
        else if (title.includes('ROE')) field = 'roe';

        if (field && !rowMap[field]) { // Only map first occurrence
            rowMap[field] = cells;
        }
    });

    // Build Records
    years.forEach(y => {
        const record: any = {
            year: y.year,
            is_estimate: y.isEstimate,
            data_source: 'fnguide'
        };

        // Helper to parse number
        const getVal = (field: string) => {
            if (!rowMap[field]) return null;

            // CRITICAL FIX: Use y.index directly, not y.index - 1
            // The index from header th already corresponds to the correct td
            const cell = rowMap[field][y.index];
            if (!cell) return null;

            const text = $(cell).text().trim().replace(/,/g, '');
            if (!text) return null;
            return parseFloat(text);
        };

        record.revenue = getVal('revenue');
        record.operating_profit = getVal('operating_profit');
        record.net_income = getVal('net_income');
        record.eps = getVal('eps');
        record.per = getVal('per');
        record.roe = getVal('roe');

        // FnGuide units: Revenue/OP/Net = 100 million KRW (usually) -> Convert to Won
        if (record.revenue) record.revenue = Math.round(record.revenue * 100_000_000);
        if (record.operating_profit) record.operating_profit = Math.round(record.operating_profit * 100_000_000);
        if (record.net_income) record.net_income = Math.round(record.net_income * 100_000_000);

        // Calculate PER if missing but EPS and Price are available
        if (record.per === null && record.eps && currentPrice) {
            record.per = parseFloat((currentPrice / record.eps).toFixed(2));
        }

        // Only add if we have at least some data
        if (record.revenue || record.operating_profit || record.eps) {
            results.push(record);
        }
    });

    return results;
}

async function main() {
    console.log('🚀 Starting FnGuide Scraper (All Companies)...\n');

    // 1. Get Companies (All)
    const { data: companies, error } = await supabaseAdmin
        .from('companies')
        .select('id, name, code')
        .order('id');

    if (error || !companies) {
        console.error('❌ Failed to fetch companies:', error);
        process.exit(1);
    }

    console.log(`📊 Found ${companies.length} companies.`);

    let successCount = 0;
    let failCount = 0;
    // Use Korea Standard Time (KST = UTC+9)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // 9 hours in milliseconds
    const kstDate = new Date(now.getTime() + kstOffset);
    const scrapeDate = kstDate.toISOString().split('T')[0];

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];

        const html = await fetchFnGuideData(company.code);
        if (!html) {
            console.log(`❌ Failed to fetch HTML for ${company.name}`);
            failCount++;
            continue;
        }

        const records = parseFnGuideData(html);
        if (records.length === 0) {
            // console.log(`⚠️  No data parsed for ${company.name}`);
        } else {
            // Save to DB
            const dbRecords = records.map(r => ({
                company_id: company.id,
                year: r.year,
                scrape_date: scrapeDate,
                revenue: r.revenue,
                operating_profit: r.operating_profit,
                net_income: r.net_income,
                eps: r.eps,
                per: r.per,
                roe: r.roe,
                is_estimate: r.is_estimate,
                data_source: 'fnguide'
            }));

            const { error: upsertError } = await supabaseAdmin
                .from('financial_data_extended')
                .upsert(dbRecords, {
                    onConflict: 'company_id,year,scrape_date,data_source'
                });

            if (upsertError) {
                console.error(`❌ DB Error for ${company.name}: ${upsertError.message}`);
                failCount++;
            } else {
                // console.log(`✅ Saved ${records.length} years for ${company.name}`);
                successCount++;
            }
        }

        if ((i + 1) % 50 === 0) {
            console.log(`📈 Progress: ${i + 1}/${companies.length} (${Math.round((i + 1) / companies.length * 100)}%)`);
        }

        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }

    console.log(`\n🎉 Completed! Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(console.error);
