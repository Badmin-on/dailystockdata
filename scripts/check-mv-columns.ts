import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkMVColumns() {
    console.log('mv_consensus_changes 컬럼 확인\n');

    // 샘플 데이터 1개 조회
    const { data, error } = await supabase
        .from('mv_consensus_changes')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('사용 가능한 컬럼:');
        Object.keys(data[0]).forEach(key => {
            console.log(`  - ${key}: ${data[0][key]}`);
        });
    }
}

checkMVColumns().catch(console.error);
