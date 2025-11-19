/**
 * Tag Generator for Consensus Analysis
 *
 * Auto-generates signal tags based on metrics and trends
 */

import {
  SignalTag,
  ConsensusMetricDaily,
  ConsensusDiffLog,
  TrendDirection,
} from '../types/consensus';

/**
 * Generate signal tags based on metrics and diff data
 *
 * Tags:
 * - HEALTHY_DERATING: Q2 zone with positive FVB
 * - TURNAROUND: Turnaround stock
 * - HIGH_GROWTH: Strong EPS growth with high HGS
 * - OVERHEAT: Excessive PER expansion (RRS > 30)
 * - IMPROVING_TREND: Positive FVB momentum
 * - DECLINING_TREND: Negative FVB momentum
 * - QUAD_SHIFT: Moved between quadrants
 * - DEFICIT_IMPROVING: Deficit reducing over time
 *
 * @param metric - Current consensus metric
 * @param diff - Diff log (optional, for trend analysis)
 * @returns Array of signal tags
 */
export function generateTags(
  metric: ConsensusMetricDaily,
  diff?: ConsensusDiffLog | null
): SignalTag[] {
  const tags: SignalTag[] = [];

  // Tag 1: HEALTHY_DERATING (Q2 영역 + FVB 양수)
  // Target zone: Growth + De-rating with positive fundamentals
  if (
    metric.quad_position === 'Q2_GROWTH_DERATING' &&
    metric.fvb_score !== null &&
    metric.fvb_score > 0.2
  ) {
    tags.push('HEALTHY_DERATING');
  }

  // Tag 2: TURNAROUND
  if (metric.calc_status === 'TURNAROUND') {
    tags.push('TURNAROUND');
  }

  // Tag 3: HIGH_GROWTH
  // Strong EPS growth with high healthy growth score
  if (
    metric.eps_growth_pct !== null &&
    metric.eps_growth_pct > 50 &&
    metric.hgs_score !== null &&
    metric.hgs_score > 30
  ) {
    tags.push('HIGH_GROWTH');
  }

  // Tag 4: OVERHEAT
  // Re-rating risk exceeds threshold
  if (metric.rrs_score !== null && metric.rrs_score > 30) {
    tags.push('OVERHEAT');
  }

  // If diff data available, add trend-based tags
  if (diff) {
    // Tag 5: IMPROVING_TREND
    // Positive FVB momentum over month
    if (diff.fvb_diff_m1 !== null && diff.fvb_diff_m1 > 0.1) {
      tags.push('IMPROVING_TREND');
    }

    // Tag 6: DECLINING_TREND
    // Negative FVB momentum over month
    if (diff.fvb_diff_m1 !== null && diff.fvb_diff_m1 < -0.1) {
      tags.push('DECLINING_TREND');
    }

    // Tag 7: QUAD_SHIFT
    // Moved between quadrants in last month
    if (
      diff.quad_shift_m1 !== null &&
      diff.quad_shift_m1 !== '' &&
      !diff.quad_shift_m1.includes('->')
    ) {
      // Only if quadrants actually changed
      const [from, to] = diff.quad_shift_m1.split('->');
      if (from !== to) {
        tags.push('QUAD_SHIFT');
      }
    }

    // Tag 8: DEFICIT_IMPROVING
    // Deficit stocks showing improvement
    if (
      metric.calc_status === 'DEFICIT' &&
      diff.hgs_diff_m1 !== null &&
      diff.hgs_diff_m1 > 5
    ) {
      tags.push('DEFICIT_IMPROVING');
    }
  }

  return tags;
}

/**
 * Determine trend direction from diff values
 *
 * @param diff1 - Daily diff
 * @param diffM1 - Monthly diff
 * @returns Trend direction
 */
export function determineTrend(
  diff1: number | null,
  diffM1: number | null
): TrendDirection | null {
  // No data
  if (diff1 === null && diffM1 === null) {
    return null;
  }

  // Use monthly diff as primary indicator
  if (diffM1 !== null) {
    if (diffM1 > 0.05) return 'IMPROVING';
    if (diffM1 < -0.05) return 'DECLINING';
  }

  // Fallback to daily diff
  if (diff1 !== null) {
    if (diff1 > 0.02) return 'IMPROVING';
    if (diff1 < -0.02) return 'DECLINING';
  }

  return 'STABLE';
}

/**
 * Generate boolean alert flags
 *
 * @param metric - Current consensus metric
 * @param diff - Diff log (optional)
 * @returns Alert flags
 */
export function generateAlertFlags(
  metric: ConsensusMetricDaily,
  diff?: ConsensusDiffLog | null
): {
  is_overheat: boolean;
  is_target_zone: boolean;
  is_turnaround: boolean;
  is_high_growth: boolean;
  is_healthy: boolean;
} {
  return {
    // Overheat: RRS > 30
    is_overheat: metric.rrs_score !== null && metric.rrs_score > 30,

    // Target zone: Q2 quadrant
    is_target_zone: metric.quad_position === 'Q2_GROWTH_DERATING',

    // Turnaround stock
    is_turnaround: metric.calc_status === 'TURNAROUND',

    // High growth: HGS > 30
    is_high_growth: metric.hgs_score !== null && metric.hgs_score > 30,

    // Healthy: Strong growth without excessive re-rating
    is_healthy:
      metric.hgs_score !== null &&
      metric.hgs_score > 20 &&
      metric.rrs_score !== null &&
      metric.rrs_score < 10,
  };
}

/**
 * Create complete diff log entry
 *
 * @param currentMetric - Current metric
 * @param previousMetrics - Previous metrics (D1, W1, M1)
 * @returns Complete diff log
 */
export function createDiffLog(
  currentMetric: ConsensusMetricDaily,
  previousMetrics: {
    d1?: ConsensusMetricDaily | null;
    w1?: ConsensusMetricDaily | null;
    m1?: ConsensusMetricDaily | null;
  }
): Omit<ConsensusDiffLog, 'created_at'> {
  const { d1, w1, m1 } = previousMetrics;

  // Calculate diffs
  const fvb_diff_d1 =
    d1?.fvb_score !== null && currentMetric.fvb_score !== null
      ? currentMetric.fvb_score - d1.fvb_score
      : null;

  const hgs_diff_d1 =
    d1?.hgs_score !== null && currentMetric.hgs_score !== null
      ? currentMetric.hgs_score - d1.hgs_score
      : null;

  const rrs_diff_d1 =
    d1?.rrs_score !== null && currentMetric.rrs_score !== null
      ? currentMetric.rrs_score - d1.rrs_score
      : null;

  const fvb_diff_w1 =
    w1?.fvb_score !== null && currentMetric.fvb_score !== null
      ? currentMetric.fvb_score - w1.fvb_score
      : null;

  const hgs_diff_w1 =
    w1?.hgs_score !== null && currentMetric.hgs_score !== null
      ? currentMetric.hgs_score - w1.hgs_score
      : null;

  const rrs_diff_w1 =
    w1?.rrs_score !== null && currentMetric.rrs_score !== null
      ? currentMetric.rrs_score - w1.rrs_score
      : null;

  const fvb_diff_m1 =
    m1?.fvb_score !== null && currentMetric.fvb_score !== null
      ? currentMetric.fvb_score - m1.fvb_score
      : null;

  const hgs_diff_m1 =
    m1?.hgs_score !== null && currentMetric.hgs_score !== null
      ? currentMetric.hgs_score - m1.hgs_score
      : null;

  const rrs_diff_m1 =
    m1?.rrs_score !== null && currentMetric.rrs_score !== null
      ? currentMetric.rrs_score - m1.rrs_score
      : null;

  // Quadrant shifts
  const quad_shift_d1 =
    d1 && d1.quad_position !== currentMetric.quad_position
      ? `${d1.quad_position}->${currentMetric.quad_position}`
      : null;

  const quad_shift_w1 =
    w1 && w1.quad_position !== currentMetric.quad_position
      ? `${w1.quad_position}->${currentMetric.quad_position}`
      : null;

  const quad_shift_m1 =
    m1 && m1.quad_position !== currentMetric.quad_position
      ? `${m1.quad_position}->${currentMetric.quad_position}`
      : null;

  // Generate tags and trends
  const signal_tags = generateTags(currentMetric, null); // Initial tags without diff
  const alertFlags = generateAlertFlags(currentMetric);

  const fvb_trend = determineTrend(fvb_diff_d1, fvb_diff_m1);
  const hgs_trend = determineTrend(hgs_diff_d1, hgs_diff_m1);
  const rrs_trend = determineTrend(rrs_diff_d1, rrs_diff_m1);

  return {
    snapshot_date: currentMetric.snapshot_date,
    ticker: currentMetric.ticker,
    company_id: currentMetric.company_id,
    target_y1: currentMetric.target_y1,
    target_y2: currentMetric.target_y2,

    // Daily diffs
    fvb_diff_d1,
    hgs_diff_d1,
    rrs_diff_d1,
    quad_shift_d1,

    // Weekly diffs
    fvb_diff_w1,
    hgs_diff_w1,
    rrs_diff_w1,
    quad_shift_w1,

    // Monthly diffs
    fvb_diff_m1,
    hgs_diff_m1,
    rrs_diff_m1,
    quad_shift_m1,

    // Tags and trends
    signal_tags,
    tag_count: signal_tags.length,
    fvb_trend,
    hgs_trend,
    rrs_trend,

    // Alert flags
    ...alertFlags,
  };
}

/**
 * Prioritize stocks based on tags and metrics
 *
 * Priority order:
 * 1. HEALTHY_DERATING (target zone)
 * 2. TURNAROUND + IMPROVING_TREND
 * 3. HIGH_GROWTH + !OVERHEAT
 * 4. Other
 *
 * @param tags - Signal tags
 * @param metric - Consensus metric
 * @returns Priority score (higher = more interesting)
 */
export function calculatePriority(
  tags: SignalTag[],
  metric: ConsensusMetricDaily
): number {
  let score = 0;

  // Highest priority: HEALTHY_DERATING
  if (tags.includes('HEALTHY_DERATING')) {
    score += 100;
  }

  // High priority: TURNAROUND with improvement
  if (
    tags.includes('TURNAROUND') &&
    tags.includes('IMPROVING_TREND')
  ) {
    score += 80;
  }

  // Good priority: HIGH_GROWTH without overheat
  if (
    tags.includes('HIGH_GROWTH') &&
    !tags.includes('OVERHEAT')
  ) {
    score += 60;
  }

  // Bonus: Positive FVB
  if (metric.fvb_score !== null && metric.fvb_score > 0) {
    score += 20;
  }

  // Penalty: OVERHEAT
  if (tags.includes('OVERHEAT')) {
    score -= 30;
  }

  // Penalty: DECLINING_TREND
  if (tags.includes('DECLINING_TREND')) {
    score -= 20;
  }

  return score;
}
