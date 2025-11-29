
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFinancials() {
    console.log('Checking financial_data_extended for 2025-11-25...');

    const { count, error } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('scrape_date', '2025-11-25');

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`financial_data_extended rows for 2025-11-25: ${count}`);

    if (count && count > 0) {
        console.log('✅ Financial data FOUND! You can run the consensus calculation.');
    } else {
        console.log('❌ No financial data for 2025-11-25.');
    }
}

checkFinancials();
