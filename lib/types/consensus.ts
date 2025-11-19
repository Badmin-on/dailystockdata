/**
 * Consensus Analysis System - TypeScript Types
 *
 * Type definitions for consensus_metric_daily and consensus_diff_log tables
 */

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Calculation status for consensus metrics
 */
export type CalcStatus = 'NORMAL' | 'TURNAROUND' | 'DEFICIT' | 'ERROR';

/**
 * Quadrant positions in EPS-PER analysis
 */
export type QuadPosition =
  | 'Q1_GROWTH_RERATING'      // EPS↑ PER↑ (성장 + 재평가)
  | 'Q2_GROWTH_DERATING'      // EPS↑ PER↓ (성장 + 디레이팅) ⭐ Target
  | 'Q3_DECLINE_RERATING'     // EPS↓ PER↑ (하락 + 재평가)
  | 'Q4_DECLINE_DERATING';    // EPS↓ PER↓ (하락 + 디레이팅)

/**
 * Trend direction for metrics
 */
export type TrendDirection = 'IMPROVING' | 'DECLINING' | 'STABLE';

/**
 * Signal tags for automated alerts
 */
export type SignalTag =
  | 'HEALTHY_DERATING'        // Q2 영역 진입
  | 'TURNAROUND'              // 턴어라운드 종목
  | 'HIGH_GROWTH'             // HGS > 30
  | 'OVERHEAT'                // RRS > 30
  | 'IMPROVING_TREND'         // 개선 추세
  | 'DECLINING_TREND'         // 악화 추세
  | 'QUAD_SHIFT'              // 분면 이동
  | 'DEFICIT_IMPROVING';      // 적자 개선 중

// ============================================================================
// Database Table Types
// ============================================================================

/**
 * consensus_metric_daily table
 *
 * Daily snapshot of calculated consensus metrics
 */
export interface ConsensusMetricDaily {
  // Primary Keys
  snapshot_date: string;        // DATE (YYYY-MM-DD)
  ticker: string;               // Stock code (e.g. "005930")
  company_id: number;           // companies.id FK
  target_y1: number;            // Base year (e.g. 2025)
  target_y2: number;            // Comparison year (e.g. 2026)

  // Status & Metadata
  calc_status: CalcStatus;
  calc_error?: string | null;

  // Raw Data Snapshot
  eps_y1: number | null;
  eps_y2: number | null;
  per_y1: number | null;
  per_y2: number | null;

  // Growth Rates
  eps_growth_pct: number | null;
  per_growth_pct: number | null;

  // Core Metrics
  fvb_score: number | null;     // Fundamental vs Valuation Balance
  hgs_score: number | null;     // Healthy Growth Score
  rrs_score: number | null;     // Re-Rating Risk Score

  // Quadrant Classification
  quad_position: QuadPosition | null;
  quad_x: number | null;        // X-axis (EPS growth %)
  quad_y: number | null;        // Y-axis (PER change %)

  // Timestamps
  created_at: string;           // TIMESTAMP
  updated_at: string;           // TIMESTAMP
}

/**
 * consensus_diff_log table
 *
 * Change tracking and auto-generated tags
 */
export interface ConsensusDiffLog {
  // Primary Keys
  snapshot_date: string;        // DATE (YYYY-MM-DD)
  ticker: string;
  company_id: number;
  target_y1: number | null;
  target_y2: number | null;

  // Daily Change (D1)
  fvb_diff_d1: number | null;
  hgs_diff_d1: number | null;
  rrs_diff_d1: number | null;
  quad_shift_d1: string | null;

  // Weekly Change (W1)
  fvb_diff_w1: number | null;
  hgs_diff_w1: number | null;
  rrs_diff_w1: number | null;
  quad_shift_w1: string | null;

  // Monthly Change (M1)
  fvb_diff_m1: number | null;
  hgs_diff_m1: number | null;
  rrs_diff_m1: number | null;
  quad_shift_m1: string | null;

  // Auto-Generated Tags
  signal_tags: SignalTag[];     // PostgreSQL TEXT[]
  tag_count: number;

  // Score Trends
  fvb_trend: TrendDirection | null;
  hgs_trend: TrendDirection | null;
  rrs_trend: TrendDirection | null;

  // Alert Flags
  is_overheat: boolean;         // RRS > 30
  is_target_zone: boolean;      // Q2 zone
  is_turnaround: boolean;       // Turnaround stock
  is_high_growth: boolean;      // HGS > 30
  is_healthy: boolean;          // HGS > 20 AND RRS < 10

  // Timestamps
  created_at: string;           // TIMESTAMP
}

// ============================================================================
// Input/Output Types for Calculations
// ============================================================================

/**
 * Input data for consensus calculation (from financial_data_extended)
 */
export interface ConsensusInputData {
  company_id: number;
  ticker: string;
  eps_y1: number;
  eps_y2: number;
  per_y1: number;
  per_y2: number;
  target_y1: number;
  target_y2: number;
}

/**
 * Calculated metrics output
 */
export interface CalculatedMetrics {
  eps_growth_pct: number;
  per_growth_pct: number;
  fvb_score: number;
  hgs_score: number;
  rrs_score: number;
}

/**
 * Quadrant coordinates
 */
export interface QuadrantCoords {
  quad_x: number;
  quad_y: number;
  quad_position: QuadPosition;
}

/**
 * Complete calculation result
 */
export interface ConsensusCalculationResult {
  // Status
  calc_status: CalcStatus;
  calc_error?: string;

  // Input snapshot
  eps_y1: number;
  eps_y2: number;
  per_y1: number;
  per_y2: number;

  // Calculated metrics
  eps_growth_pct: number | null;
  per_growth_pct: number | null;
  fvb_score: number | null;
  hgs_score: number | null;
  rrs_score: number | null;

  // Quadrant
  quad_position: QuadPosition | null;
  quad_x: number | null;
  quad_y: number | null;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Combined metric with company info
 */
export interface ConsensusMetricWithCompany extends ConsensusMetricDaily {
  company_name: string;
  company_code: string;
}

/**
 * Metric with diff log
 */
export interface ConsensusMetricWithDiff {
  metric: ConsensusMetricDaily;
  diff: ConsensusDiffLog | null;
}

/**
 * Quadrant chart data point
 */
export interface QuadrantDataPoint {
  ticker: string;
  company_name: string;
  quad_x: number;
  quad_y: number;
  quad_position: QuadPosition;
  hgs_score: number;
  rrs_score: number;
  fvb_score: number;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  date: string;
  fvb_score: number;
  hgs_score: number;
  rrs_score: number;
  quad_position: QuadPosition;
}

// ============================================================================
// Filter Types for API Queries
// ============================================================================

/**
 * Filter options for consensus metrics query
 */
export interface ConsensusMetricFilter {
  snapshot_date?: string;
  calc_status?: CalcStatus | CalcStatus[];
  quad_position?: QuadPosition | QuadPosition[];
  min_hgs?: number;
  max_rrs?: number;
  is_target_zone?: boolean;
  is_turnaround?: boolean;
  signal_tags?: SignalTag[];
  limit?: number;
  offset?: number;
}

/**
 * Sort options
 */
export interface ConsensusSortOptions {
  field: 'fvb_score' | 'hgs_score' | 'rrs_score' | 'eps_growth_pct';
  direction: 'asc' | 'desc';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Year pair for consensus calculation
 */
export interface YearPair {
  target_y1: number;
  target_y2: number;
  eps_y1: number;
  eps_y2: number;
  per_y1: number;
  per_y2: number;
}

/**
 * Edge case detection result
 */
export interface EdgeCaseResult {
  status: CalcStatus;
  reason?: string;
}

/**
 * Batch calculation summary
 */
export interface BatchCalculationSummary {
  total: number;
  success: number;
  failed: number;
  by_status: {
    NORMAL: number;
    TURNAROUND: number;
    DEFICIT: number;
    ERROR: number;
  };
  execution_time_ms: number;
}
