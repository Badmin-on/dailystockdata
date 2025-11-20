/**
 * Consensus Metrics Calculator
 *
 * Calculates FVB/HGS/RRS metrics and quadrant positioning
 * Based on EPS and PER consensus estimates
 */

import {
  YearPair,
  CalculatedMetrics,
  QuadrantCoords,
  QuadPosition,
  ConsensusCalculationResult,
} from '../types/consensus';
import { detectEdgeCase, shouldCalculate } from './edge-case-detector';

/**
 * Round number to specified decimal places
 */
function round(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

/**
 * Calculate core consensus metrics
 *
 * Formulas:
 * - FVB = ln(EPS_Ratio) - ln(PER_Ratio)
 * - HGS = EPS_Growth% - MAX(PER_Growth%, 0)
 * - RRS = PER_Growth% - MAX(EPS_Growth%, 0)
 *
 * @param pair - Year pair with EPS and PER data
 * @returns Calculated metrics
 */
export function calculateMetrics(pair: YearPair): CalculatedMetrics {
  const { eps_y1, eps_y2, per_y1, per_y2 } = pair;

  // 1. Calculate ratios
  const epsRatio = eps_y2 / eps_y1;
  const perRatio = per_y2 / per_y1;

  // 2. Growth rates (%)
  const eps_growth_pct = (epsRatio - 1) * 100;
  const per_growth_pct = (perRatio - 1) * 100;

  // 3. FVB (Fundamental vs Valuation Balance)
  // Measures whether fundamentals (EPS) are growing faster than valuation (PER)
  // Positive FVB = Fundamentals outpacing valuation (good)
  // Negative FVB = Valuation outpacing fundamentals (risky)
  const fvb_score = Math.log(epsRatio) - Math.log(perRatio);

  // 4. HGS (Healthy Growth Score)
  // EPS growth minus the positive portion of PER growth
  // High HGS = Strong EPS growth without excessive PER expansion
  // This is the "healthy growth" we're looking for (Q2 quadrant)
  const hgs_score = eps_growth_pct - Math.max(per_growth_pct, 0);

  // 5. RRS (Re-Rating Risk Score)
  // PER change minus the positive portion of EPS growth
  // High RRS = PER expanding faster than EPS justifies (overheating risk)
  // Negative RRS = PER contracting despite growth (value opportunity)
  const rrs_score = per_growth_pct - Math.max(eps_growth_pct, 0);

  return {
    eps_growth_pct: round(eps_growth_pct, 2),
    per_growth_pct: round(per_growth_pct, 2),
    fvb_score: round(fvb_score, 4),
    hgs_score: round(hgs_score, 2),
    rrs_score: round(rrs_score, 2),
  };
}

/**
 * Classify quadrant position based on EPS and PER changes
 *
 * Quadrants:
 * - Q1: EPS↑ PER↑ (Growth + Re-rating) - Strong but potentially overheating
 * - Q2: EPS↑ PER↓ (Growth + De-rating) - ⭐ Target zone (healthy growth)
 * - Q3: EPS↓ PER↑ (Decline + Re-rating) - Theme stocks / speculation
 * - Q4: EPS↓ PER↓ (Decline + De-rating) - Recession / distress
 *
 * @param epsGrowth - EPS growth percentage
 * @param perGrowth - PER change percentage
 * @returns Quadrant position with coordinates
 */
export function classifyQuadrant(
  epsGrowth: number,
  perGrowth: number
): QuadrantCoords {
  let quad_position: QuadPosition;

  if (epsGrowth >= 0 && perGrowth >= 0) {
    quad_position = 'Q1_GROWTH_RERATING'; // 성장 + 리레이팅
  } else if (epsGrowth >= 0 && perGrowth < 0) {
    quad_position = 'Q2_GROWTH_DERATING'; // 성장 + 디레이팅 ⭐ Target
  } else if (epsGrowth < 0 && perGrowth >= 0) {
    quad_position = 'Q3_DECLINE_RERATING'; // 역성장 + 리레이팅 (테마)
  } else {
    quad_position = 'Q4_DECLINE_DERATING'; // 역성장 + 디레이팅 (침체)
  }

  return {
    quad_x: round(epsGrowth, 2),
    quad_y: round(perGrowth, 2),
    quad_position,
  };
}

/**
 * Calculate complete consensus result for a year pair
 *
 * Performs edge case detection and metric calculation
 *
 * @param pair - Year pair with EPS and PER data
 * @returns Complete calculation result
 */
export function calculateConsensusResult(
  pair: YearPair
): ConsensusCalculationResult {
  // 1. Detect edge cases
  const edgeCase = detectEdgeCase(pair);

  // 2. Prepare base result with input snapshot
  const result: ConsensusCalculationResult = {
    calc_status: edgeCase.status,
    calc_error: edgeCase.reason,
    eps_y1: pair.eps_y1,
    eps_y2: pair.eps_y2,
    per_y1: pair.per_y1,
    per_y2: pair.per_y2,
    eps_growth_pct: null,
    per_growth_pct: null,
    fvb_score: null,
    hgs_score: null,
    rrs_score: null,
    quad_position: null,
    quad_x: null,
    quad_y: null,
  };

  // 3. Calculate metrics only if status is NORMAL
  if (shouldCalculate(edgeCase.status)) {
    const metrics = calculateMetrics(pair);
    const quadrant = classifyQuadrant(
      metrics.eps_growth_pct,
      metrics.per_growth_pct
    );

    result.eps_growth_pct = metrics.eps_growth_pct;
    result.per_growth_pct = metrics.per_growth_pct;
    result.fvb_score = metrics.fvb_score;
    result.hgs_score = metrics.hgs_score;
    result.rrs_score = metrics.rrs_score;
    result.quad_position = quadrant.quad_position;
    result.quad_x = quadrant.quad_x;
    result.quad_y = quadrant.quad_y;
  }

  return result;
}

/**
 * Calculate metrics for multiple year pairs in batch
 *
 * @param pairs - Array of year pairs with ticker
 * @returns Map of ticker to calculation result
 */
export function calculateBatch(
  pairs: Array<YearPair & { ticker: string }>
): Map<string, ConsensusCalculationResult> {
  const results = new Map<string, ConsensusCalculationResult>();

  for (const pair of pairs) {
    const result = calculateConsensusResult(pair);
    results.set(pair.ticker, result);
  }

  return results;
}

/**
 * Get summary statistics from batch calculation
 *
 * @param results - Map of calculation results
 * @returns Summary statistics
 */
export function getBatchStatistics(
  results: Map<string, ConsensusCalculationResult>
): {
  total: number;
  calculated: number;
  skipped: number;
  by_status: Record<string, number>;
  by_quadrant: Record<string, number>;
  avg_metrics: {
    eps_growth_pct: number;
    per_growth_pct: number;
    fvb_score: number;
    hgs_score: number;
    rrs_score: number;
  };
} {
  const stats = {
    total: results.size,
    calculated: 0,
    skipped: 0,
    by_status: {} as Record<string, number>,
    by_quadrant: {} as Record<string, number>,
    avg_metrics: {
      eps_growth_pct: 0,
      per_growth_pct: 0,
      fvb_score: 0,
      hgs_score: 0,
      rrs_score: 0,
    },
  };

  let sumEpsGrowth = 0;
  let sumPerGrowth = 0;
  let sumFvb = 0;
  let sumHgs = 0;
  let sumRrs = 0;

  for (const result of results.values()) {
    // Status count
    stats.by_status[result.calc_status] =
      (stats.by_status[result.calc_status] || 0) + 1;

    if (result.calc_status === 'NORMAL') {
      stats.calculated++;

      // Quadrant count
      if (result.quad_position) {
        stats.by_quadrant[result.quad_position] =
          (stats.by_quadrant[result.quad_position] || 0) + 1;
      }

      // Sum for averages
      sumEpsGrowth += result.eps_growth_pct || 0;
      sumPerGrowth += result.per_growth_pct || 0;
      sumFvb += result.fvb_score || 0;
      sumHgs += result.hgs_score || 0;
      sumRrs += result.rrs_score || 0;
    } else {
      stats.skipped++;
    }
  }

  // Calculate averages
  if (stats.calculated > 0) {
    stats.avg_metrics.eps_growth_pct = round(
      sumEpsGrowth / stats.calculated,
      2
    );
    stats.avg_metrics.per_growth_pct = round(
      sumPerGrowth / stats.calculated,
      2
    );
    stats.avg_metrics.fvb_score = round(sumFvb / stats.calculated, 4);
    stats.avg_metrics.hgs_score = round(sumHgs / stats.calculated, 2);
    stats.avg_metrics.rrs_score = round(sumRrs / stats.calculated, 2);
  }

  return stats;
}

/**
 * Filter results by quadrant
 *
 * @param results - Map of calculation results
 * @param quadrant - Target quadrant
 * @returns Filtered results
 */
export function filterByQuadrant(
  results: Map<string, ConsensusCalculationResult>,
  quadrant: QuadPosition
): Map<string, ConsensusCalculationResult> {
  const filtered = new Map<string, ConsensusCalculationResult>();

  for (const [ticker, result] of results.entries()) {
    if (result.quad_position === quadrant) {
      filtered.set(ticker, result);
    }
  }

  return filtered;
}

/**
 * Sort results by metric
 *
 * @param results - Map of calculation results
 * @param metric - Metric to sort by
 * @param direction - Sort direction
 * @returns Sorted array of [ticker, result] tuples
 */
export function sortByMetric(
  results: Map<string, ConsensusCalculationResult>,
  metric: 'fvb_score' | 'hgs_score' | 'rrs_score' | 'eps_growth_pct',
  direction: 'asc' | 'desc' = 'desc'
): Array<[string, ConsensusCalculationResult]> {
  const entries = Array.from(results.entries());

  return entries.sort((a, b) => {
    const aValue = a[1][metric] ?? -Infinity;
    const bValue = b[1][metric] ?? -Infinity;

    if (direction === 'desc') {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });
}
