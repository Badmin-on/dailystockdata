-- ============================================================================
-- Migration 002: Consensus Analysis System - Database Schema
-- Date: 2025-11-19
-- Purpose: Create tables for consensus valuation analysis (FVB/HGS/RRS metrics)
-- Dependencies: migration-001-add-naver-schema.sql
-- ============================================================================

-- ============================================================================
-- Table 1: consensus_metric_daily
-- Purpose: Store calculated metrics and status for each snapshot date
-- ============================================================================

CREATE TABLE IF NOT EXISTS consensus_metric_daily (
    -- Primary Keys
    snapshot_date    DATE NOT NULL,               -- Calculation date (e.g. 2024-11-19)
    ticker           VARCHAR(10) NOT NULL,        -- Stock code (e.g. 005930)
    company_id       INT NOT NULL,                -- companies.id FK
    target_y1        INT NOT NULL,                -- Base year (e.g. 2025)
    target_y2        INT NOT NULL,                -- Comparison year (e.g. 2026)

    -- Status & Metadata
    calc_status      VARCHAR(20),                 -- NORMAL, TURNAROUND, DEFICIT, ERROR
    calc_error       TEXT,                        -- Error message if any

    -- Raw Data Snapshot (preserve originals for recalculation)
    eps_y1           DECIMAL(18,2),               -- Year 1 EPS
    eps_y2           DECIMAL(18,2),               -- Year 2 EPS
    per_y1           DECIMAL(18,2),               -- Year 1 PER
    per_y2           DECIMAL(18,2),               -- Year 2 PER

    -- Growth Rates (basic changes)
    eps_growth_pct   DECIMAL(10,2),               -- EPS growth rate (%)
    per_growth_pct   DECIMAL(10,2),               -- PER change rate (%)

    -- Core Metrics (custom indicators)
    fvb_score        DECIMAL(10,4),               -- Fundamental vs Valuation Balance
    hgs_score        DECIMAL(10,2),               -- Healthy Growth Score
    rrs_score        DECIMAL(10,2),               -- Re-Rating Risk Score

    -- Quadrant Classification (4-quadrant positioning)
    quad_position    VARCHAR(30),                 -- Q1_GROWTH_RERATING, Q2_GROWTH_DERATING, etc.
    quad_x           DECIMAL(10,2),               -- X-axis (EPS growth %)
    quad_y           DECIMAL(10,2),               -- Y-axis (PER change %)

    -- Timestamps
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (snapshot_date, ticker, target_y1, target_y2),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,

    -- Validation checks
    CONSTRAINT valid_years CHECK (target_y2 > target_y1),
    CONSTRAINT valid_status CHECK (calc_status IN ('NORMAL', 'TURNAROUND', 'DEFICIT', 'ERROR'))
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_consensus_metric_date
    ON consensus_metric_daily(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_consensus_metric_ticker
    ON consensus_metric_daily(ticker);

CREATE INDEX IF NOT EXISTS idx_consensus_metric_company
    ON consensus_metric_daily(company_id);

CREATE INDEX IF NOT EXISTS idx_consensus_metric_status
    ON consensus_metric_daily(calc_status);

CREATE INDEX IF NOT EXISTS idx_consensus_metric_quad
    ON consensus_metric_daily(quad_position);

-- Partial indexes for normal stocks only (most common queries)
CREATE INDEX IF NOT EXISTS idx_consensus_metric_fvb
    ON consensus_metric_daily(fvb_score)
    WHERE calc_status = 'NORMAL';

CREATE INDEX IF NOT EXISTS idx_consensus_metric_hgs
    ON consensus_metric_daily(hgs_score)
    WHERE calc_status = 'NORMAL';

CREATE INDEX IF NOT EXISTS idx_consensus_metric_rrs
    ON consensus_metric_daily(rrs_score)
    WHERE calc_status = 'NORMAL';

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_consensus_metric_date_status
    ON consensus_metric_daily(snapshot_date, calc_status);


-- ============================================================================
-- Table 2: consensus_diff_log
-- Purpose: Track changes over time and auto-generated tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS consensus_diff_log (
    -- Primary Keys
    snapshot_date    DATE NOT NULL,               -- Snapshot date
    ticker           VARCHAR(10) NOT NULL,        -- Stock code
    company_id       INT NOT NULL,                -- companies.id FK
    target_y1        INT,                         -- Base year
    target_y2        INT,                         -- Comparison year

    -- Daily Change (vs. previous day)
    fvb_diff_d1      DECIMAL(10,4),               -- FVB daily change
    hgs_diff_d1      DECIMAL(10,2),               -- HGS daily change
    rrs_diff_d1      DECIMAL(10,2),               -- RRS daily change
    quad_shift_d1    VARCHAR(20),                 -- Quadrant shift (e.g. Q1->Q2)

    -- Weekly Change (vs. 1 week ago)
    fvb_diff_w1      DECIMAL(10,4),               -- FVB weekly change
    hgs_diff_w1      DECIMAL(10,2),               -- HGS weekly change
    rrs_diff_w1      DECIMAL(10,2),               -- RRS weekly change
    quad_shift_w1    VARCHAR(20),                 -- Quadrant shift over week

    -- Monthly Change (vs. 1 month ago)
    fvb_diff_m1      DECIMAL(10,4),               -- FVB monthly change
    hgs_diff_m1      DECIMAL(10,2),               -- HGS monthly change
    rrs_diff_m1      DECIMAL(10,2),               -- RRS monthly change
    quad_shift_m1    VARCHAR(20),                 -- Quadrant shift over month

    -- Auto-Generated Tags (array of strings)
    signal_tags      TEXT[],                      -- ['HEALTHY_DERATING', 'TURNAROUND', ...]
    tag_count        INT DEFAULT 0,               -- Number of tags (for easy filtering)

    -- Score Trends (trend classification)
    fvb_trend        VARCHAR(10),                 -- IMPROVING, DECLINING, STABLE
    hgs_trend        VARCHAR(10),                 -- IMPROVING, DECLINING, STABLE
    rrs_trend        VARCHAR(10),                 -- IMPROVING, DECLINING, STABLE

    -- Alert Flags (boolean filters)
    is_overheat      BOOLEAN DEFAULT FALSE,       -- RRS > 30 (re-rating risk)
    is_target_zone   BOOLEAN DEFAULT FALSE,       -- Q2 zone (growth + de-rating)
    is_turnaround    BOOLEAN DEFAULT FALSE,       -- Turnaround stock
    is_high_growth   BOOLEAN DEFAULT FALSE,       -- HGS > 30
    is_healthy       BOOLEAN DEFAULT FALSE,       -- HGS > 20 AND RRS < 10

    -- Timestamps
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (snapshot_date, ticker, target_y1, target_y2),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,

    -- Validation
    CONSTRAINT valid_trend CHECK (
        fvb_trend IS NULL OR fvb_trend IN ('IMPROVING', 'DECLINING', 'STABLE')
    ),
    CONSTRAINT valid_tag_count CHECK (tag_count >= 0)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_consensus_diff_date
    ON consensus_diff_log(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_consensus_diff_ticker
    ON consensus_diff_log(ticker);

CREATE INDEX IF NOT EXISTS idx_consensus_diff_company
    ON consensus_diff_log(company_id);

-- GIN index for array tags (enables tag searches)
CREATE INDEX IF NOT EXISTS idx_consensus_diff_tags
    ON consensus_diff_log USING GIN (signal_tags);

-- Composite indexes for common filters
CREATE INDEX IF NOT EXISTS idx_consensus_diff_flags
    ON consensus_diff_log(is_target_zone, is_turnaround)
    WHERE is_target_zone = TRUE OR is_turnaround = TRUE;

CREATE INDEX IF NOT EXISTS idx_consensus_diff_healthy
    ON consensus_diff_log(is_healthy)
    WHERE is_healthy = TRUE;

CREATE INDEX IF NOT EXISTS idx_consensus_diff_overheat
    ON consensus_diff_log(is_overheat)
    WHERE is_overheat = TRUE;


-- ============================================================================
-- Helper Function: Update timestamp on consensus_metric_daily
-- ============================================================================

CREATE OR REPLACE FUNCTION update_consensus_metric_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consensus_metric_timestamp
    BEFORE UPDATE ON consensus_metric_daily
    FOR EACH ROW
    EXECUTE FUNCTION update_consensus_metric_timestamp();


-- ============================================================================
-- Validation: Check table creation
-- ============================================================================

DO $$
BEGIN
    -- Check consensus_metric_daily
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'consensus_metric_daily'
    ) THEN
        RAISE NOTICE '✅ consensus_metric_daily table created successfully';
    ELSE
        RAISE EXCEPTION '❌ consensus_metric_daily table creation failed';
    END IF;

    -- Check consensus_diff_log
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'consensus_diff_log'
    ) THEN
        RAISE NOTICE '✅ consensus_diff_log table created successfully';
    ELSE
        RAISE EXCEPTION '❌ consensus_diff_log table creation failed';
    END IF;

    -- Check indexes
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'consensus_metric_daily'
        AND indexname = 'idx_consensus_metric_date'
    ) THEN
        RAISE NOTICE '✅ Indexes created successfully';
    END IF;

    RAISE NOTICE '🎉 Migration 002 completed successfully';
END $$;


-- ============================================================================
-- Sample Queries (for reference)
-- ============================================================================

/*
-- 1. Get latest metrics for all stocks
SELECT
    ticker,
    calc_status,
    fvb_score,
    hgs_score,
    rrs_score,
    quad_position
FROM consensus_metric_daily
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM consensus_metric_daily)
    AND calc_status = 'NORMAL'
ORDER BY hgs_score DESC
LIMIT 20;

-- 2. Find stocks in target zone (Q2)
SELECT
    m.ticker,
    m.quad_position,
    m.hgs_score,
    m.rrs_score,
    d.signal_tags
FROM consensus_metric_daily m
LEFT JOIN consensus_diff_log d
    ON m.snapshot_date = d.snapshot_date
    AND m.ticker = d.ticker
WHERE m.snapshot_date = CURRENT_DATE
    AND d.is_target_zone = TRUE
ORDER BY m.hgs_score DESC;

-- 3. Track metric changes over time
SELECT
    snapshot_date,
    ticker,
    fvb_score,
    hgs_score,
    quad_position
FROM consensus_metric_daily
WHERE ticker = '005930'
    AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY snapshot_date DESC;
*/

-- ============================================================================
-- End of Migration 002
-- ============================================================================
