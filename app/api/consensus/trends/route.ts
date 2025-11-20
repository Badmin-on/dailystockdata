/**
 * GET /api/consensus/trends
 *
 * Get time-series trend data for specific stocks
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface TrendDataPoint {
  date: string;
  fvb_score: number | null;
  hgs_score: number | null;
  rrs_score: number | null;
  quad_position: string | null;
  eps_growth_pct: number | null;
  per_growth_pct: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tickers = searchParams.get('tickers')?.split(',') || [];
    const days = parseInt(searchParams.get('days') || '30');
    const target_y1 = searchParams.get('target_y1');
    const target_y2 = searchParams.get('target_y2');

    if (tickers.length === 0) {
      return NextResponse.json(
        { error: 'At least one ticker is required' },
        { status: 400 }
      );
    }

    if (tickers.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 tickers allowed' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    let query = supabaseAdmin
      .from('consensus_metric_daily')
      .select(`
        snapshot_date,
        ticker,
        fvb_score,
        hgs_score,
        rrs_score,
        quad_position,
        eps_growth_pct,
        per_growth_pct,
        calc_status,
        companies:company_id (
          name
        )
      `)
      .in('ticker', tickers)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .lte('snapshot_date', endDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    // Target year filters
    if (target_y1) {
      query = query.eq('target_y1', parseInt(target_y1));
    }
    if (target_y2) {
      query = query.eq('target_y2', parseInt(target_y2));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trend data', details: error.message },
        { status: 500 }
      );
    }

    // Group by ticker
    const trendsByTicker: Record<string, {
      company_name: string;
      data: TrendDataPoint[];
    }> = {};

    data?.forEach((row: any) => {
      if (!trendsByTicker[row.ticker]) {
        trendsByTicker[row.ticker] = {
          company_name: row.companies?.name || row.ticker,
          data: [],
        };
      }

      trendsByTicker[row.ticker].data.push({
        date: row.snapshot_date,
        fvb_score: row.fvb_score,
        hgs_score: row.hgs_score,
        rrs_score: row.rrs_score,
        quad_position: row.quad_position,
        eps_growth_pct: row.eps_growth_pct,
        per_growth_pct: row.per_growth_pct,
      });
    });

    // Calculate trend statistics for each ticker
    const trendsWithStats = Object.entries(trendsByTicker).map(([ticker, trend]) => {
      const validPoints = trend.data.filter(d => d.fvb_score !== null);

      let fvbTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' | null = null;
      let hgsTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' | null = null;

      if (validPoints.length >= 2) {
        const firstPoint = validPoints[0];
        const lastPoint = validPoints[validPoints.length - 1];

        // FVB trend
        const fvbChange = (lastPoint.fvb_score || 0) - (firstPoint.fvb_score || 0);
        if (fvbChange > 0.1) fvbTrend = 'IMPROVING';
        else if (fvbChange < -0.1) fvbTrend = 'DECLINING';
        else fvbTrend = 'STABLE';

        // HGS trend
        const hgsChange = (lastPoint.hgs_score || 0) - (firstPoint.hgs_score || 0);
        if (hgsChange > 5) hgsTrend = 'IMPROVING';
        else if (hgsChange < -5) hgsTrend = 'DECLINING';
        else hgsTrend = 'STABLE';
      }

      return {
        ticker,
        company_name: trend.company_name,
        data: trend.data,
        stats: {
          data_points: validPoints.length,
          fvb_trend: fvbTrend,
          hgs_trend: hgsTrend,
          latest_quad: validPoints[validPoints.length - 1]?.quad_position || null,
        },
      };
    });

    return NextResponse.json({
      trends: trendsWithStats,
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
