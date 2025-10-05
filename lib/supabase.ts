import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service Role Client (서버사이드 전용)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY!,
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
