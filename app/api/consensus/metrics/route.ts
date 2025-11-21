/**
 * GET /api/consensus/metrics
 *
 * Query consensus metrics with filtering, sorting, and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ConsensusMetricDaily } from '@/lib/types/consensus';

interface QueryParams {
  date?: string;
  target_y1?: string;
  target_y2?: string;
  quad?: string | string[];
  tags?: string | string[];
  status?: string | string[];
  min_fvb?: string;
  max_fvb?: string;
  min_hgs?: string;
  max_hgs?: string;
  min_rrs?: string;
  max_rrs?: string;
  sort_by?: string;
  sort_order?: string;
  page?: string;
  limit?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: QueryParams = Object.fromEntries(searchParams);

    // Pagination
    const page = parseInt(params.page || '1');
    const limit = Math.min(parseInt(params.limit || '50'), 100);
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('consensus_metric_daily')
      .select(`
        *,
        companies:company_id (
          id,
          name,
          code
        ),
        consensus_diff_log (
          signal_tags,
          is_target_zone,
          is_turnaround,
          is_high_growth,
          is_healthy
        )
      `, { count: 'exact' });

    // Date filter (default to latest)
    if (params.date) {
      query = query.eq('snapshot_date', params.date);
    } else {
      // Get latest date
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
    if (params.target_y1) {
      query = query.eq('target_y1', parseInt(params.target_y1));
    }
    if (params.target_y2) {
      query = query.eq('target_y2', parseInt(params.target_y2));
    }

    // Quadrant filter
    if (params.quad) {
      const quads = Array.isArray(params.quad) ? params.quad : [params.quad];
      query = query.in('quad_position', quads);
    }

    // Status filter
    if (params.status) {
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      query = query.in('calc_status', statuses);
    } else {
      // Default: only NORMAL status
      query = query.eq('calc_status', 'NORMAL');
    }

    // FVB range
    if (params.min_fvb) {
      query = query.gte('fvb_score', parseFloat(params.min_fvb));
    }
    if (params.max_fvb) {
      query = query.lte('fvb_score', parseFloat(params.max_fvb));
    }

    // HGS range
    if (params.min_hgs) {
      query = query.gte('hgs_score', parseFloat(params.min_hgs));
    }
    if (params.max_hgs) {
      query = query.lte('hgs_score', parseFloat(params.max_hgs));
    }

    // RRS range
    if (params.min_rrs) {
      query = query.gte('rrs_score', parseFloat(params.min_rrs));
    }
    if (params.max_rrs) {
      query = query.lte('rrs_score', parseFloat(params.max_rrs));
    }

    // Tags filter (PostgreSQL array contains)
    if (params.tags) {
      const tags = Array.isArray(params.tags) ? params.tags : [params.tags];
      query = query.overlaps('consensus_diff_log.signal_tags', tags);
    }

    // Sorting
    const sortBy = params.sort_by || 'hgs_score';
    const sortOrder = params.sort_order === 'asc' ? { ascending: true } : { ascending: false };

    // Valid sort fields
    const validSortFields = [
      'fvb_score',
      'hgs_score',
      'rrs_score',
      'eps_growth_pct',
      'per_growth_pct',
      'ticker',
    ];

    if (validSortFields.includes(sortBy)) {
      query = query.order(sortBy, sortOrder);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metrics', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const formattedData = data?.map((row: any) => ({
      ...row,
      company_name: row.companies?.name,
      company_code: row.companies?.code,
      signal_tags: row.consensus_diff_log?.signal_tags || [],
      is_target_zone: row.consensus_diff_log?.is_target_zone || false,
      is_turnaround: row.consensus_diff_log?.is_turnaround || false,
      is_high_growth: row.consensus_diff_log?.is_high_growth || false,
      is_healthy: row.consensus_diff_log?.is_healthy || false,
      companies: undefined,
      consensus_diff_log: undefined,
    })) || [];

    return NextResponse.json({
      data: formattedData,
      pagination: {
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
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
