
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRawData() {
    console.log('🔍 Checking raw financial data...');

    // Get one record from financial_data_extended for today
    const { data, error } = await supabase
        .from('financial_data_extended')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No data found in financial_data_extended');
        return;
    }

    const record = data[0];
    console.log('✅ Found record for ticker:', record.ticker);
    console.log('📅 Date:', record.date);

    const keys = Object.keys(record);
    console.log(`📊 Total columns: ${keys.length}`);
    console.log('📋 Columns:', keys.join(', '));

    // Check for specific Naver consensus items if known, otherwise just list them
    // User mentioned "14 items". Let's see if we have roughly that many data fields.

    // Filter for likely data fields (numbers)
    const numberFields = keys.filter(k => typeof record[k] === 'number');
    console.log(`🔢 Number fields (${numberFields.length}):`);
    numberFields.forEach(field => console.log(`   - ${field}`));
}

checkRawData();
