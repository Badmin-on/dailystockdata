import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// 환경변수 검증
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}
if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service Role Client (서버사이드 전용)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 타입 정의
export interface Company {
  id: number;
  name: string;
  code: string;
  market: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialData {
  id: number;
  company_id: number;
  year: number;
  scrape_date: string;
  revenue: number | null;
  operating_profit: number | null;
  is_estimate: boolean;
  created_at?: string;
}

export interface DailyStockPrice {
  id: number;
  company_id: number;
  date: string;
  close_price: number | null;
  change_rate: number | null;
  volume: number | null;
  created_at?: string;
}

// 🆕 확장 재무 데이터 타입 (Naver Finance)
export interface FinancialDataExtended {
  id: number;
  company_id: number;
  year: number;
  scrape_date: string;

  // 손익계산서
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;

  // 수익성 지표
  operating_margin: number | null;
  net_margin: number | null;
  roe: number | null;

  // 주당 지표
  eps: number | null;
  per: number | null;
  bps: number | null;
  pbr: number | null;

  // 재무상태표
  total_assets: number | null;
  total_liabilities: number | null;
  total_equity: number | null;
  debt_ratio: number | null;

  // 현금흐름
  operating_cash_flow: number | null;
  investing_cash_flow: number | null;
  financing_cash_flow: number | null;
  free_cash_flow: number | null;

  // 메타데이터
  is_estimate: boolean;
  data_source: 'naver' | 'fnguide' | 'dart';
  created_at?: string;
  updated_at?: string;
}

// 🆕 Naver API 응답 타입
export interface NaverFinanceResponse {
  financeInfo: {
    trTitleList: Array<{
      title: string;
      key: string;
      isConsensus: 'Y' | 'N';
    }>;
    rowList: Array<{
      title: string;
      columns: {
        [key: string]: {
          value: string;
        };
      };
    }>;
  };
}
