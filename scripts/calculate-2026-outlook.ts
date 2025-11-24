
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function calculateMetrics() {
    const date = '2025-11-21';
    const targetY1 = 2025;
    const targetY2 = 2026;

    console.log(`Calculating metrics for ${date} (Target: ${targetY1} vs ${targetY2})`);

    // 1. Get all companies
    const { data: companies } = await supabase
        .from('companies')
        .select('id, code, name');

    if (!companies) {
        console.error('No companies found');
        return;
    }

    console.log(`Found ${companies.length} companies`);

    let processed = 0;
    let inserted = 0;

    for (const company of companies) {
        // 2. Get financial data for target years
        const { data: financials } = await supabase
            .from('financial_data_extended')
            .select('*')
            .eq('company_id', company.id)
            .in('year', [targetY1, targetY2]);

        const y1Data = financials?.find(f => f.year === targetY1);
        const y2Data = financials?.find(f => f.year === targetY2);

        if (!y1Data || !y2Data) {
            continue; // Skip if data missing
        }

        // 3. Calculate Metrics
        // EPS Growth
        let epsGrowth = null;
        if (y1Data.eps && y2Data.eps && y1Data.eps !== 0) {
            epsGrowth = ((y2Data.eps - y1Data.eps) / Math.abs(y1Data.eps)) * 100;
        }

        // PER Growth (Inverse of PER expansion)
        // If PER expands (10 -> 15), it's expensive (bad for value). 
        // We want to track if PER is getting cheaper or if EPS growth is outpacing price.
        // Actually, let's stick to the standard definition used in the project:
        // PER Change %
        let perGrowth = null;
        if (y1Data.per && y2Data.per && y1Data.per !== 0) {
            perGrowth = ((y2Data.per - y1Data.per) / Math.abs(y1Data.per)) * 100;
        }

        // Scores (Simplified for this script - ideally reuse the main calculator logic)
        // FVB = (EPS Growth - PER Growth) / 10 (Rough approximation)
        let fvbScore = null;
        if (epsGrowth !== null && perGrowth !== null) {
            fvbScore = (epsGrowth - perGrowth) / 20; // Scale down
            // Cap at -2 to +2
            fvbScore = Math.max(-2, Math.min(2, fvbScore));
        }

        // HGS (Healthy Growth Score) - Focus on EPS Growth
        let hgsScore = null;
        if (epsGrowth !== null) {
            hgsScore = Math.min(100, Math.max(0, epsGrowth)); // 0 to 100
        }

        // RRS (Re-rating Risk Score) - Focus on PER Expansion
        let rrsScore = null;
        if (perGrowth !== null) {
            rrsScore = Math.min(100, Math.max(0, perGrowth)); // 0 to 100
        }

        // Quadrant Position
        let quadPosition = 'Q2_GROWTH_DERATING'; // Default safe
        let quadX = hgsScore || 0;
        let quadY = perGrowth || 0;

        if (epsGrowth !== null && perGrowth !== null) {
            if (epsGrowth > 0) {
                if (perGrowth < 0) quadPosition = 'Q2_GROWTH_DERATING'; // Best
                else quadPosition = 'Q1_GROWTH_RERATING'; // Overheat?
            } else {
                if (perGrowth > 0) quadPosition = 'Q3_DECLINE_RERATING'; // Turnaround?
                else quadPosition = 'Q4_DECLINE_DERATING'; // Worst
            }
        }

        // 4. Insert into DB
        const { error } = await supabase
            .from('consensus_metric_daily')
            .upsert({
                snapshot_date: date,
                company_id: company.id,
                ticker: company.code,
                target_y1: targetY1,
                target_y2: targetY2,
                eps_y1: y1Data.eps,
                eps_y2: y2Data.eps,
                per_y1: y1Data.per,
                per_y2: y2Data.per,
                eps_growth_pct: epsGrowth,
                per_growth_pct: perGrowth,
                fvb_score: fvbScore,
                hgs_score: hgsScore,
                rrs_score: rrsScore,
                quad_position: quadPosition,
                quad_x: quadX,
                quad_y: quadY,
                calc_status: 'NORMAL'
            }, { onConflict: 'snapshot_date, ticker, target_y1, target_y2' });

        if (error) {
            console.error(`Error inserting ${company.code}:`, error);
        } else {
            inserted++;
        }
        processed++;
    }

    console.log(`Completed. Processed: ${processed}, Inserted: ${inserted}`);
}

calculateMetrics();
