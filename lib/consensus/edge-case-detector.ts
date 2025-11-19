/**
 * Edge Case Detector for Consensus Analysis
 *
 * Detects exceptional scenarios before calculation:
 * - NORMAL: Standard calculation
 * - TURNAROUND: Deficit → Profit (special tag)
 * - DEFICIT: Negative EPS (skip calculation)
 * - ERROR: Invalid data (log and skip)
 */

import { CalcStatus, YearPair, EdgeCaseResult } from '../types/consensus';

/**
 * Detect edge cases in year pair data
 *
 * @param pair - Year pair with EPS and PER data
 * @returns Edge case result with status and reason
 */
export function detectEdgeCase(pair: YearPair): EdgeCaseResult {
  const { eps_y1, eps_y2, per_y1, per_y2 } = pair;

  // Case 1: Missing or null values
  if (
    eps_y1 === null ||
    eps_y1 === undefined ||
    eps_y2 === null ||
    eps_y2 === undefined ||
    per_y1 === null ||
    per_y1 === undefined ||
    per_y2 === null ||
    per_y2 === undefined
  ) {
    return {
      status: 'ERROR',
      reason: 'Missing required values (EPS or PER is null)',
    };
  }

  // Case 2: Invalid PER values
  // PER should be positive and reasonable (< 1000)
  if (per_y1 <= 0 || per_y2 <= 0) {
    return {
      status: 'ERROR',
      reason: `Invalid PER values (PER_Y1: ${per_y1}, PER_Y2: ${per_y2})`,
    };
  }

  if (per_y1 > 1000 || per_y2 > 1000) {
    return {
      status: 'ERROR',
      reason: `Extreme PER values (PER_Y1: ${per_y1}, PER_Y2: ${per_y2})`,
    };
  }

  // Case 3: TURNAROUND (deficit → profit)
  // Year 1 deficit, Year 2 profit
  if (eps_y1 <= 0 && eps_y2 > 0) {
    return {
      status: 'TURNAROUND',
      reason: `Turnaround stock (EPS ${eps_y1} → ${eps_y2})`,
    };
  }

  // Case 4: DEFICIT (persistent or new deficit)
  // Either year has negative EPS
  if (eps_y1 <= 0 || eps_y2 <= 0) {
    return {
      status: 'DEFICIT',
      reason: `Deficit stock (EPS_Y1: ${eps_y1}, EPS_Y2: ${eps_y2})`,
    };
  }

  // Case 5: Extreme low values (EPS < 10)
  // Too small for meaningful ratio calculation
  if (Math.abs(eps_y1) < 10 || Math.abs(eps_y2) < 10) {
    return {
      status: 'ERROR',
      reason: `EPS values too small for calculation (EPS_Y1: ${eps_y1}, EPS_Y2: ${eps_y2})`,
    };
  }

  // Case 6: Unrealistic growth rates (> 1000%)
  // Likely data error or extreme outlier
  const growthRate = ((eps_y2 - eps_y1) / eps_y1) * 100;
  if (Math.abs(growthRate) > 1000) {
    return {
      status: 'ERROR',
      reason: `Unrealistic EPS growth rate: ${growthRate.toFixed(2)}%`,
    };
  }

  // All checks passed - proceed with calculation
  return {
    status: 'NORMAL',
  };
}

/**
 * Validate multiple year pairs in batch
 *
 * @param pairs - Array of year pairs
 * @returns Map of ticker to edge case result
 */
export function validateBatch(
  pairs: Array<YearPair & { ticker: string }>
): Map<string, EdgeCaseResult> {
  const results = new Map<string, EdgeCaseResult>();

  for (const pair of pairs) {
    const result = detectEdgeCase(pair);
    results.set(pair.ticker, result);
  }

  return results;
}

/**
 * Check if calculation should proceed
 *
 * @param status - Calculation status
 * @returns True if should calculate metrics
 */
export function shouldCalculate(status: CalcStatus): boolean {
  return status === 'NORMAL';
}

/**
 * Get calculation skip reason
 *
 * @param status - Calculation status
 * @returns Human-readable reason
 */
export function getSkipReason(status: CalcStatus): string {
  switch (status) {
    case 'TURNAROUND':
      return 'Turnaround stock - metrics not meaningful';
    case 'DEFICIT':
      return 'Deficit stock - EPS negative';
    case 'ERROR':
      return 'Invalid data - cannot calculate';
    default:
      return '';
  }
}

/**
 * Categorize edge case results
 *
 * @param results - Map of edge case results
 * @returns Summary by status
 */
export function summarizeResults(
  results: Map<string, EdgeCaseResult>
): Record<CalcStatus, number> {
  const summary: Record<CalcStatus, number> = {
    NORMAL: 0,
    TURNAROUND: 0,
    DEFICIT: 0,
    ERROR: 0,
  };

  for (const result of results.values()) {
    summary[result.status]++;
  }

  return summary;
}

/**
 * Filter pairs by calculation status
 *
 * @param pairs - Array of year pairs with ticker
 * @param targetStatus - Target status to filter
 * @returns Filtered pairs
 */
export function filterByStatus(
  pairs: Array<YearPair & { ticker: string }>,
  targetStatus: CalcStatus
): Array<YearPair & { ticker: string }> {
  return pairs.filter((pair) => {
    const result = detectEdgeCase(pair);
    return result.status === targetStatus;
  });
}
