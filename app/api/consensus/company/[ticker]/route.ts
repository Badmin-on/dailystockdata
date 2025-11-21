/**
 * GET /api/consensus/company/[ticker]
 *
 * Get detailed consensus analysis for a specific company
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
        { status: 400 }
      );
    }

    // 1. Get company info
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, code')
      .eq('code', ticker)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // 2. Get latest consensus metric
    let metricQuery = supabaseAdmin
      .from('consensus_metric_daily')
      .select('*')
      .eq('ticker', ticker)
      .order('snapshot_date', { ascending: false });

    if (date) {
      metricQuery = metricQuery.eq('snapshot_date', date);
    }

    const { data: latestMetric, error: metricError } = await metricQuery
      .limit(1)
      .single();

    if (metricError) {
      return NextResponse.json(
        { error: 'No consensus data found for this company' },
        { status: 404 }
      );
    }

    // 3. Get diff log
    const { data: diffLog } = await supabaseAdmin
      .from('consensus_diff_log')
      .select('*')
      .eq('ticker', ticker)
      .eq('snapshot_date', latestMetric.snapshot_date)
      .single();

    // 4. Get historical metrics (last 90 days)
    const { data: historicalMetrics } = await supabaseAdmin
      .from('consensus_metric_daily')
      .select(`
        snapshot_date,
        fvb_score,
        hgs_score,
        rrs_score,
        quad_position,
        eps_growth_pct,
        per_growth_pct
      `)
      .eq('ticker', ticker)
      .gte('snapshot_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    // 5. Get raw financial data
    const { data: financialData } = await supabaseAdmin
      .from('financial_data_extended')
      .select(`
        year,
        is_estimate,
        eps,
        per,
        revenue,
        operating_profit,
        net_income
      `)
      .eq('company_id', company.id)
      .in('year', [latestMetric.target_y1, latestMetric.target_y2])
      .order('year', { ascending: true });

    // 6. Calculate peer comparison (same quadrant)
    const { data: peerData } = await supabaseAdmin
      .from('consensus_metric_daily')
      .select(`
        ticker,
        hgs_score,
        companies:company_id (
          name
        )
      `)
      .eq('snapshot_date', latestMetric.snapshot_date)
      .eq('quad_position', latestMetric.quad_position)
      .neq('ticker', ticker)
      .order('hgs_score', { ascending: false })
      .limit(5);

    // Format peer comparison
    const peerComparison = peerData?.map((peer: any) => ({
      ticker: peer.ticker,
      company_name: peer.companies?.name || peer.ticker,
      hgs_score: peer.hgs_score,
    })) || [];

    // 7. Build response
    return NextResponse.json({
      company: {
        ticker: company.code,
        name: company.name,
        id: company.id,
      },
      latest_metric: {
        ...latestMetric,
        signal_tags: diffLog?.signal_tags || [],
        is_target_zone: diffLog?.is_target_zone || false,
        is_turnaround: diffLog?.is_turnaround || false,
        is_high_growth: diffLog?.is_high_growth || false,
        is_healthy: diffLog?.is_healthy || false,
        is_overheat: diffLog?.is_overheat || false,
      },
      changes: {
        daily: {
          fvb: diffLog?.fvb_diff_d1 || null,
          hgs: diffLog?.hgs_diff_d1 || null,
          rrs: diffLog?.rrs_diff_d1 || null,
          quad_shift: diffLog?.quad_shift_d1 || null,
        },
        weekly: {
          fvb: diffLog?.fvb_diff_w1 || null,
          hgs: diffLog?.hgs_diff_w1 || null,
          rrs: diffLog?.rrs_diff_w1 || null,
          quad_shift: diffLog?.quad_shift_w1 || null,
        },
        monthly: {
          fvb: diffLog?.fvb_diff_m1 || null,
          hgs: diffLog?.hgs_diff_m1 || null,
          rrs: diffLog?.rrs_diff_m1 || null,
          quad_shift: diffLog?.quad_shift_m1 || null,
        },
        trends: {
          fvb: diffLog?.fvb_trend || null,
          hgs: diffLog?.hgs_trend || null,
          rrs: diffLog?.rrs_trend || null,
        },
      },
      historical: historicalMetrics || [],
      financial_data: financialData || [],
      peer_comparison: peerComparison,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
