/**
 * Consensus Calculation Batch Script (Fixed Version)
 *
 * This version uses the MOST RECENT data available for each company,
 * regardless of scrape_date, to ensure all companies are covered.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

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
const { calculateConsensusResult } = require('../lib/consensus/calculator');
import type { YearPair } from '../lib/types/consensus';

interface CompanyFinancialData {
    company_id: number;
    ticker: string;
    company_name: string;
    data: Array<{
        year: number;
        eps: number | null;
        per: number | null;
        data_source: string;
        scrape_date: string;
    }>;
}

async function calculateConsensusBatchFixed() {
    const startTime = Date.now();

    // Use Korea Standard Time (KST = UTC+9)
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
    const snapshotDate = kstTime.toISOString().split('T')[0];
    const currentYear = kstTime.getFullYear();

    console.log(`📅 Snapshot Date (KST): ${snapshotDate}`);
    console.log(`📅 Current Year: ${currentYear}`);

    const yearsToFetch = [currentYear - 1, currentYear, currentYear + 1];
    console.log(`🎯 Target Years: ${yearsToFetch.join(', ')}`);

    console.log('🚀 Consensus Calculation Batch Started (Fixed Version)');
    console.log('═'.repeat(80));

    // 1. Fetch ALL financial data regardless of scrape_date
    // We'll get the most recent data for each company-year combination
    console.log('\n📊 Step 1: Fetching ALL financial data (ignoring scrape_date filter)...');

    let allFinancialData: any[] = [];
    let from = 0;
    const chunkSize = 1000;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from('financial_data_extended')
            .select(`
          company_id,
          year,
          eps,
          per,
          data_source,
          scrape_date,
          companies:company_id (
            id,
            name,
            code
          )
        `)
            .in('year', yearsToFetch)
            .order('scrape_date', { ascending: false }) // Newest first
            .range(from, from + chunkSize - 1);

        if (error) {
            console.error('❌ Failed to fetch financial data:', error);
            process.exit(1);
        }

        if (!data || data.length === 0) break;

        allFinancialData = [...allFinancialData, ...data];
        from += chunkSize;

        console.log(`  Fetched ${data.length} records (Total: ${allFinancialData.length})`);

        if (data.length < chunkSize) break;
    }

    const financialData = allFinancialData;

    console.log(`✅ Fetched ${financialData.length} financial records`);

    // 2. Group by company, keeping the MOST RECENT data for each year
    // Priority: fnguide > naver_wise > naver (for same date), but newest date wins first
    console.log('\n📊 Step 2: Grouping by company (using most recent data per year)...');

    const companyMap = new Map<number, CompanyFinancialData>();

    financialData.forEach((row: any) => {
        const companyId = row.company_id;
        const company = row.companies;

        if (!company) return;

        if (!companyMap.has(companyId)) {
            companyMap.set(companyId, {
                company_id: company.id,
                ticker: company.code,
                company_name: company.name,
                data: [],
            });
        }

        const companyData = companyMap.get(companyId)!;

        const existingIndex = companyData.data.findIndex(d => d.year === row.year);

        const newRecord = {
            year: row.year,
            eps: row.eps,
            per: row.per,
            data_source: row.data_source,
            scrape_date: row.scrape_date
        };

        if (existingIndex !== -1) {
            const existingRecord = companyData.data[existingIndex];

            let shouldOverwrite = false;

            // Priority: Newer date wins, then source priority
            if (newRecord.scrape_date > existingRecord.scrape_date) {
                shouldOverwrite = true;
            } else if (newRecord.scrape_date === existingRecord.scrape_date) {
                // Same date, check source priority: fnguide > naver_wise > naver
                const sourcePriority: Record<string, number> = {
                    'fnguide': 3,
                    'naver_wise': 2,
                    'naver': 1
                };
                const newPriority = sourcePriority[newRecord.data_source] || 0;
                const existingPriority = sourcePriority[existingRecord.data_source] || 0;
                if (newPriority > existingPriority) {
                    shouldOverwrite = true;
                }
            }

            if (shouldOverwrite) {
                companyData.data[existingIndex] = newRecord;
            }
        } else {
            companyData.data.push(newRecord);
        }
    });

    console.log(`✅ Grouped into ${companyMap.size} companies`);

    // Debug: Check how many companies have required year pairs
    let companiesWithY1Y2 = 0;
    let companiesWithNextYear = 0;
    const y1 = currentYear - 1;
    const y2 = currentYear;
    const y3 = currentYear + 1;

    for (const [_, company] of companyMap) {
        const hasY1 = company.data.some(d => d.year === y1 && d.eps !== null);
        const hasY2 = company.data.some(d => d.year === y2 && d.eps !== null);
        const hasY3 = company.data.some(d => d.year === y3 && d.eps !== null);

        if (hasY1 && hasY2) companiesWithY1Y2++;
        if (hasY2 && hasY3) companiesWithNextYear++;
    }

    console.log(`📊 Companies with ${y1}-${y2} pair + EPS: ${companiesWithY1Y2}`);
    console.log(`📊 Companies with ${y2}-${y3} pair + EPS: ${companiesWithNextYear}`);

    // 3. Calculate metrics for each company
    console.log('\n📊 Step 3: Calculating consensus metrics...\n');

    const metricsToInsert: any[] = [];

    let successCount = 0;
    let errorCount = 0;
    let turnaroundCount = 0;
    let deficitCount = 0;

    const pairsToCalculate = [
        { y1: currentYear - 1, y2: currentYear },
        { y1: currentYear, y2: currentYear + 1 }
    ];

    for (const [companyId, company] of companyMap.entries()) {
        for (const pairConfig of pairsToCalculate) {
            const { y1, y2 } = pairConfig;

            const dataY1 = company.data.find(d => d.year === y1);
            const dataY2 = company.data.find(d => d.year === y2);

            if (!dataY1 || !dataY2) continue;

            if (dataY1.eps === null || dataY2.eps === null) continue;

            let result: any;

            if (dataY1.per !== null && dataY2.per !== null) {
                const pair: YearPair = {
                    target_y1: y1,
                    target_y2: y2,
                    eps_y1: dataY1.eps,
                    eps_y2: dataY2.eps,
                    per_y1: dataY1.per,
                    per_y2: dataY2.per,
                };
                result = calculateConsensusResult(pair);
            } else {
                const epsRatio = dataY2.eps / dataY1.eps;
                const epsGrowth = (epsRatio - 1) * 100;

                let status = 'NORMAL';
                if (dataY1.eps < 0 && dataY2.eps > 0) status = 'TURNAROUND';
                else if (dataY2.eps < 0) status = 'DEFICIT';

                result = {
                    calc_status: status,
                    calc_error: null,
                    eps_y1: dataY1.eps,
                    eps_y2: dataY2.eps,
                    per_y1: dataY1.per,
                    per_y2: dataY2.per,
                    eps_growth_pct: parseFloat(epsGrowth.toFixed(2)),
                    per_growth_pct: null,
                    fvb_score: null,
                    hgs_score: null,
                    rrs_score: null,
                    quad_position: null,
                    quad_x: null,
                    quad_y: null,
                };
            }

            if (result.calc_status === 'NORMAL') successCount++;
            else if (result.calc_status === 'TURNAROUND') turnaroundCount++;
            else if (result.calc_status === 'DEFICIT') deficitCount++;
            else errorCount++;

            metricsToInsert.push({
                company_id: company.company_id,
                ticker: company.ticker,
                snapshot_date: snapshotDate,
                target_y1: y1,
                target_y2: y2,
                eps_y1: result.eps_y1,
                eps_y2: result.eps_y2,
                per_y1: result.per_y1,
                per_y2: result.per_y2,
                eps_growth_pct: result.eps_growth_pct,
                per_growth_pct: result.per_growth_pct,
                fvb_score: result.fvb_score,
                hgs_score: result.hgs_score,
                rrs_score: result.rrs_score,
                quad_position: result.quad_position,
                quad_x: result.quad_x,
                quad_y: result.quad_y,
                calc_status: result.calc_status,
                calc_error: result.calc_error,
            });
        }
    }

    // 4. Batch Insert
    console.log(`\n💾 Saving ${metricsToInsert.length} metrics to DB...`);

    if (metricsToInsert.length > 0) {
        for (let i = 0; i < metricsToInsert.length; i += 1000) {
            const chunk = metricsToInsert.slice(i, i + 1000);
            const { error } = await supabaseAdmin
                .from('consensus_metric_daily')
                .upsert(chunk, { onConflict: 'snapshot_date,ticker,target_y1,target_y2' });

            if (error) {
                console.error('❌ Error saving batch:', error);
            } else {
                console.log(`  ✅ Saved batch ${Math.floor(i / 1000) + 1} (${chunk.length} records)`);
            }
        }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Success (Normal): ${successCount}`);
    console.log(`  🔄 Turnaround: ${turnaroundCount}`);
    console.log(`  📉 Deficit: ${deficitCount}`);
    console.log(`  ❌ Error/Skipped: ${errorCount}`);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️ Completed in ${duration.toFixed(2)}s`);
}

calculateConsensusBatchFixed();
