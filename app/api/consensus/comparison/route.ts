/**
 * GET /api/consensus/comparison
 *
 * Compare consensus metrics across different time periods
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface ComparisonData {
  current: any;
  previous: any;
  changes: {
    fvb_change: number;
    hgs_change: number;
    rrs_change: number;
    eps_growth_change: number;
    per_growth_change: number;
    quad_changed: boolean;
    days_diff: number;
  };
  interpretation: {
    overall: 'UPGRADED' | 'DOWNGRADED' | 'STABLE' | 'MIXED';
    signals: string[];
    summary: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const currentDate = searchParams.get('current_date');
    const compareDate = searchParams.get('compare_date');

    if (!ticker) {
      return NextResponse.json(
        { error: 'ticker parameter is required' },
        { status: 400 }
      );
    }

    // Get current date data (default to latest if not specified)
    let currentQuery = supabaseAdmin
      .from('consensus_metric_daily')
      .select('*')
      .eq('ticker', ticker)
      .eq('calc_status', 'NORMAL')
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (currentDate) {
      currentQuery = currentQuery.eq('snapshot_date', currentDate);
    }

    const { data: currentData, error: currentError } = await currentQuery.single();

    if (currentError || !currentData) {
      return NextResponse.json(
        { error: 'Current consensus data not found' },
        { status: 404 }
      );
    }

    // Get comparison date data
    // If compareDate is provided, find the closest date in DB
    let compareQuery = supabaseAdmin
      .from('consensus_metric_daily')
      .select('*')
      .eq('ticker', ticker)
      .eq('calc_status', 'NORMAL')
      .lt('snapshot_date', currentData.snapshot_date)
      .order('snapshot_date', { ascending: false });

    if (compareDate) {
      // Find closest date to the requested compareDate
      compareQuery = compareQuery.lte('snapshot_date', compareDate);
    }

    const { data: previousData, error: previousError } = await compareQuery.limit(1).single();

    if (previousError || !previousData) {
      return NextResponse.json(
        {
          error: 'No historical data available for comparison',
          current: currentData,
          previous: null,
          changes: null,
          interpretation: null
        },
        { status: 200 }
      );
    }

    // Calculate changes
    const changes = {
      fvb_change: currentData.fvb_score - previousData.fvb_score,
      hgs_change: currentData.hgs_score - previousData.hgs_score,
      rrs_change: currentData.rrs_score - previousData.rrs_score,
      eps_growth_change: currentData.eps_growth_pct - previousData.eps_growth_pct,
      per_growth_change: currentData.per_growth_pct - previousData.per_growth_pct,
      quad_changed: currentData.quad_position !== previousData.quad_position,
      days_diff: Math.floor(
        (new Date(currentData.snapshot_date).getTime() -
         new Date(previousData.snapshot_date).getTime()) /
        (1000 * 60 * 60 * 24)
      ),
    };

    // Interpret changes
    const interpretation = interpretChanges(changes, currentData, previousData);

    const response: ComparisonData = {
      current: currentData,
      previous: previousData,
      changes,
      interpretation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Comparison error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function interpretChanges(changes: any, current: any, previous: any) {
  const signals: string[] = [];
  let upgrades = 0;
  let downgrades = 0;

  // FVB interpretation
  if (Math.abs(changes.fvb_change) > 0.1) {
    if (changes.fvb_change > 0) {
      signals.push(`저평가 인식 강화 (FVB ${changes.fvb_change > 0 ? '+' : ''}${changes.fvb_change.toFixed(2)})`);
      upgrades++;
    } else {
      signals.push(`고평가 우려 증가 (FVB ${changes.fvb_change.toFixed(2)})`);
      downgrades++;
    }
  }

  // HGS interpretation
  if (Math.abs(changes.hgs_change) > 5) {
    if (changes.hgs_change > 0) {
      signals.push(`성장성 전망 개선 (HGS ${changes.hgs_change > 0 ? '+' : ''}${changes.hgs_change.toFixed(1)})`);
      upgrades++;
    } else {
      signals.push(`성장성 전망 악화 (HGS ${changes.hgs_change.toFixed(1)})`);
      downgrades++;
    }
  }

  // RRS interpretation
  if (Math.abs(changes.rrs_change) > 5) {
    if (changes.rrs_change > 0) {
      signals.push(`과열 리스크 증가 (RRS ${changes.rrs_change > 0 ? '+' : ''}${changes.rrs_change.toFixed(1)})`);
      downgrades++;
    } else {
      signals.push(`리스크 완화 (RRS ${changes.rrs_change.toFixed(1)})`);
      upgrades++;
    }
  }

  // EPS growth change
  if (Math.abs(changes.eps_growth_change) > 10) {
    if (changes.eps_growth_change > 0) {
      signals.push(`실적 전망 상향 (EPS 성장률 ${changes.eps_growth_change > 0 ? '+' : ''}${changes.eps_growth_change.toFixed(1)}%p)`);
      upgrades++;
    } else {
      signals.push(`실적 전망 하향 (EPS 성장률 ${changes.eps_growth_change.toFixed(1)}%p)`);
      downgrades++;
    }
  }

  // Quadrant change
  if (changes.quad_changed) {
    const quadChange = `${previous.quad_position} → ${current.quad_position}`;

    if (current.quad_position === 'Q2_GROWTH_DERATING') {
      signals.push(`✅ 목표 영역 진입 (${quadChange})`);
      upgrades++;
    } else if (previous.quad_position === 'Q2_GROWTH_DERATING') {
      signals.push(`⚠️ 목표 영역 이탈 (${quadChange})`);
      downgrades++;
    } else {
      signals.push(`4분면 이동: ${quadChange}`);
    }
  }

  // Overall assessment
  let overall: 'UPGRADED' | 'DOWNGRADED' | 'STABLE' | 'MIXED';
  let summary: string;

  if (upgrades > downgrades + 1) {
    overall = 'UPGRADED';
    summary = `컨센서스 전반적 상향 조정 (긍정 신호 ${upgrades}개)`;
  } else if (downgrades > upgrades + 1) {
    overall = 'DOWNGRADED';
    summary = `컨센서스 전반적 하향 조정 (부정 신호 ${downgrades}개)`;
  } else if (upgrades === 0 && downgrades === 0) {
    overall = 'STABLE';
    summary = '컨센서스 안정적 유지 (유의미한 변화 없음)';
  } else {
    overall = 'MIXED';
    summary = `컨센서스 혼조 (긍정 ${upgrades}개, 부정 ${downgrades}개)`;
  }

  return { overall, signals, summary };
}
