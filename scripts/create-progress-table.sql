-- 데이터 수집 진행률 추적 테이블
-- 실시간으로 수집 상황을 모니터링하기 위한 테이블

CREATE TABLE IF NOT EXISTS collection_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  collection_type TEXT NOT NULL, -- 'financial' or 'price'
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'

  -- 진행률 정보
  total_count INTEGER NOT NULL DEFAULT 0,
  current_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  skip_count INTEGER NOT NULL DEFAULT 0,

  -- 현재 처리 중인 항목 정보
  current_item TEXT,

  -- 로그 메시지 (최근 10개)
  logs JSONB DEFAULT '[]'::jsonb,

  -- 시간 정보
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- 추가 메타데이터
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_collection_progress_session_id
  ON collection_progress(session_id);

CREATE INDEX IF NOT EXISTS idx_collection_progress_status
  ON collection_progress(status);

CREATE INDEX IF NOT EXISTS idx_collection_progress_started_at
  ON collection_progress(started_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_collection_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collection_progress_updated_at
  BEFORE UPDATE ON collection_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_progress_updated_at();

-- RLS (Row Level Security) 활성화
ALTER TABLE collection_progress ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 (공개 대시보드용)
CREATE POLICY "Allow public read access"
  ON collection_progress
  FOR SELECT
  USING (true);

-- Service role만 쓸 수 있도록
CREATE POLICY "Allow service role all access"
  ON collection_progress
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE collection_progress IS '데이터 수집 진행률 실시간 추적 테이블';
COMMENT ON COLUMN collection_progress.session_id IS '수집 세션 고유 ID (UUID)';
COMMENT ON COLUMN collection_progress.collection_type IS '수집 타입: financial (재무), price (주가)';
COMMENT ON COLUMN collection_progress.status IS '수집 상태: running, completed, failed';
COMMENT ON COLUMN collection_progress.logs IS '최근 로그 메시지 배열 (최대 20개)';
