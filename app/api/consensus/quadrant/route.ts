/**
 * GET /api/consensus/quadrant
 *
 * Get scatter plot data for 4-quadrant visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface QuadrantDataPoint {
  ticker: string;
  company_name: string;
  quad_x: number;
  quad_y: number;
  quad_position: string;
  fvb_score: number;
  hgs_score: number;
  rrs_score: number;
  signal_tags: string[];
  is_target_zone: boolean;
  is_high_growth: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const target_y1 = searchParams.get('target_y1');
    const target_y2 = searchParams.get('target_y2');
    const minHgs = searchParams.get('min_hgs');
    const maxRrs = searchParams.get('max_rrs');

    // Build query - Step 1: Get metrics
    let query = supabaseAdmin
      .from('consensus_metric_daily')
      .select(`
        ticker,
        quad_x,
        quad_y,
        quad_position,
        fvb_score,
        hgs_score,
        rrs_score,
        snapshot_date,
        target_y1,
        target_y2,
        companies:company_id (
          name
        )
      `)
      .eq('calc_status', 'NORMAL')
      .not('quad_x', 'is', null)
      .not('quad_y', 'is', null);

    // Date filter (default to latest)
    if (date) {
      query = query.eq('snapshot_date', date);
    } else {
      const { data: latestData } = await supabaseAdmin
        .from('consensus_metric_daily')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (latestData) {
        query = query.eq('snapshot_date', latestData.snapshot_date);
      }
    }

    // Target year filters
    if (target_y1) {
      query = query.eq('target_y1', parseInt(target_y1));
    }
    if (target_y2) {
      query = query.eq('target_y2', parseInt(target_y2));
    }

    // Optional filters for UI controls
    if (minHgs) {
      query = query.gte('hgs_score', parseFloat(minHgs));
    }
    if (maxRrs) {
      query = query.lte('rrs_score', parseFloat(maxRrs));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quadrant data', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        data: [],
        stats: {
          total: 0,
          q1_count: 0,
          q2_count: 0,
          q3_count: 0,
          q4_count: 0,
          target_zone_count: 0,
          high_growth_count: 0,
        },
        axis_ranges: { x_min: -10, x_max: 100, y_min: -50, y_max: 50 }
      });
    }

    // Step 2: Fetch corresponding diff_log data
    const { data: diffLogData } = await supabaseAdmin
      .from('consensus_diff_log')
      .select('snapshot_date, ticker, target_y1, target_y2, signal_tags, is_target_zone, is_high_growth')
      .eq('snapshot_date', data[0].snapshot_date)
      .in('ticker', data.map((row: any) => row.ticker));

    // Create lookup map for diff_log data
    const diffLogMap = new Map();
    diffLogData?.forEach((diff: any) => {
      const key = `${diff.snapshot_date}-${diff.ticker}-${diff.target_y1}-${diff.target_y2}`;
      diffLogMap.set(key, diff);
    });

    // Format data for scatter plot
    const formattedData: QuadrantDataPoint[] = data.map((row: any) => {
      const key = `${row.snapshot_date}-${row.ticker}-${row.target_y1}-${row.target_y2}`;
      const diffLog = diffLogMap.get(key);

      return {
        ticker: row.ticker,
        company_name: row.companies?.name || row.ticker,
        quad_x: row.quad_x,
        quad_y: row.quad_y,
        quad_position: row.quad_position,
        fvb_score: row.fvb_score,
        hgs_score: row.hgs_score,
        rrs_score: row.rrs_score,
        signal_tags: diffLog?.signal_tags || [],
        is_target_zone: diffLog?.is_target_zone || false,
        is_high_growth: diffLog?.is_high_growth || false,
      };
    });

    // Calculate quadrant statistics
    const stats = {
      total: formattedData.length,
      q1_count: 0,
      q2_count: 0,
      q3_count: 0,
      q4_count: 0,
      target_zone_count: 0,
      high_growth_count: 0,
    };

    formattedData.forEach((point) => {
      if (point.quad_position === 'Q1_GROWTH_RERATING') stats.q1_count++;
      else if (point.quad_position === 'Q2_GROWTH_DERATING') stats.q2_count++;
      else if (point.quad_position === 'Q3_DECLINE_RERATING') stats.q3_count++;
      else if (point.quad_position === 'Q4_DECLINE_DERATING') stats.q4_count++;

      if (point.is_target_zone) stats.target_zone_count++;
      if (point.is_high_growth) stats.high_growth_count++;
    });

    // Calculate axis ranges for UI
    const xValues = formattedData.map(d => d.quad_x);
    const yValues = formattedData.map(d => d.quad_y);

    const axisRanges = {
      x_min: Math.min(...xValues, -10),
      x_max: Math.max(...xValues, 100),
      y_min: Math.min(...yValues, -50),
      y_max: Math.max(...yValues, 50),
    };

    return NextResponse.json({
      data: formattedData,
      stats,
      axis_ranges: axisRanges,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
