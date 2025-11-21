import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Check DB Connection & Latest Date
        const { data: latestData, error: dbError } = await supabaseAdmin
            .from('consensus_metric_daily')
            .select('snapshot_date, created_at')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();

        // 2. Check Environment Variables
        const envCheck = {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_URL: !!process.env.SUPABASE_URL,
            SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
            NODE_ENV: process.env.NODE_ENV,
        };

        // 3. Check Data Integrity (Join Query)
        const { data: joinData, error: joinError } = await supabaseAdmin
            .from('consensus_metric_daily')
            .select(`
        ticker,
        companies:company_id (
          name
        )
      `)
            .limit(1)
            .single();

        // 4. Server Time
        const now = new Date();
        const kstOffset = 9 * 60;
        const kstTime = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);

        return NextResponse.json({
            status: dbError || joinError ? 'error' : 'ok',
            timestamp: now.toISOString(),
            kst_time: kstTime.toISOString(),
            env_check: envCheck,
            database: {
                connected: !dbError,
                latest_snapshot: latestData?.snapshot_date || null,
                latest_created_at: latestData?.created_at || null,
                error: dbError?.message || null
            },
            data_integrity: {
                join_check: !joinError,
                join_error: joinError?.message || null,
                sample_ticker: joinData?.ticker || null,
                sample_company: joinData?.companies?.name || null
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'critical_error',
            error: error.message
        }, { status: 500 });
    }
}
