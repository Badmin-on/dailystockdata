/**
 * Naver Finance 데이터 스크래퍼
 * 목적: Naver Finance JSON API에서 16개 재무 지표 수집
 */

import axios from 'axios';
import { supabaseAdmin } from './supabase';
import type { NaverFinanceResponse, FinancialDataExtended } from './supabase';

// Rate Limiting 설정
const RATE_LIMIT_DELAY = 2000; // 2초

interface ScraperResult {
  success: boolean;
  company_id: number;
  company_name: string;
  records_inserted: number;
  error?: string;
}

interface ParsedFinancialData {
  year: number;
  is_estimate: boolean;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  roe: number | null;
  eps: number | null;
  per: number | null;
  bps: number | null;
  pbr: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  total_equity: number | null;
  debt_ratio: number | null;
  operating_cash_flow: number | null;
  investing_cash_flow: number | null;
  financing_cash_flow: number | null;
  free_cash_flow: number | null;
}

/**
 * Rate limiting을 위한 sleep 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Naver API 값을 파싱
 * - 대부분 백만 단위 문자열 (예: "3,022,314" = 3조 224억)
 * - 비율/배수 데이터는 그대로 사용 (예: "13.5" = 13.5%)
 */
function parseNaverNumber(value: any, isRatio: boolean = false): number | null {
  if (value === null || value === undefined || value === '-' || value === 'N/A' || value === '') {
    return null;
  }

  let numericValue: number;

  // 문자열인 경우 (대부분의 경우)
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    numericValue = parseFloat(cleaned);

    if (isNaN(numericValue)) {
      return null;
    }
  }
  // 숫자인 경우 (드물게 발생)
  else if (typeof value === 'number') {
    numericValue = value;
  }
  else {
    return null;
  }

  // 비율/배수 데이터는 그대로 반환
  if (isRatio) {
    return numericValue;
  }

  // 금액 데이터는 백만 단위 → 원 단위로 변환
  return numericValue * 1_000_000;
}

/**
 * Naver Finance API에서 데이터 가져오기
 */
async function fetchNaverFinancialData(stockCode: string): Promise<NaverFinanceResponse | null> {
  try {
    const url = `https://m.stock.naver.com/api/stock/${stockCode}/finance/annual`;

    const response = await axios.get<NaverFinanceResponse>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://m.stock.naver.com/',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    if (!response.data?.financeInfo) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error(`❌ API 요청 실패 (${stockCode}):`, error);
    return null;
  }
}

/**
 * Naver API 응답을 DB 형식으로 파싱
 */
function parseFinancialData(data: NaverFinanceResponse): ParsedFinancialData[] {
  const { trTitleList, rowList } = data.financeInfo;

  if (!trTitleList || !rowList) {
    return [];
  }

  // 연도별 데이터 구조 초기화
  const yearDataMap = new Map<string, ParsedFinancialData>();

  trTitleList.forEach(yearInfo => {
    // "2023.12." 형식에서 연도 추출
    const yearMatch = yearInfo.title.match(/(\d{4})/);
    if (!yearMatch) {
      return; // 연도 추출 실패
    }

    const year = parseInt(yearMatch[1]);

    if (isNaN(year) || year < 2000 || year > 2030) {
      return; // 유효하지 않은 연도 스킵
    }

    yearDataMap.set(yearInfo.key, {
      year,
      is_estimate: yearInfo.isConsensus === 'Y',
      revenue: null,
      operating_profit: null,
      net_income: null,
      operating_margin: null,
      net_margin: null,
      roe: null,
      eps: null,
      per: null,
      bps: null,
      pbr: null,
      total_assets: null,
      total_liabilities: null,
      total_equity: null,
      debt_ratio: null,
      operating_cash_flow: null,
      investing_cash_flow: null,
      financing_cash_flow: null,
      free_cash_flow: null,
    });
  });

  // 각 지표를 연도별로 매핑 (Naver API 실제 필드명 기준)
  const fieldMapping: Record<string, keyof ParsedFinancialData> = {
    '매출액': 'revenue',
    '영업이익': 'operating_profit',
    '당기순이익': 'net_income', // Naver API는 "당기순이익" 사용
    '영업이익률': 'operating_margin',
    '순이익률': 'net_margin',
    'ROE': 'roe',
    'EPS': 'eps',
    'PER': 'per',
    'BPS': 'bps',
    'PBR': 'pbr',
    '부채비율': 'debt_ratio',
    // 주의: Naver API는 현금흐름, 자산/부채/자본 데이터를 제공하지 않음
    // 해당 필드들은 null로 남음
  };

  // 비율/배수 필드 목록 (원 단위 변환 하지 않음)
  const ratioFields = new Set<keyof ParsedFinancialData>([
    'operating_margin',  // 영업이익률 (%)
    'net_margin',        // 순이익률 (%)
    'roe',               // ROE (%)
    'eps',               // 주당순이익 (원)
    'per',               // 주가수익비율 (배)
    'bps',               // 주당순자산 (원)
    'pbr',               // 주가순자산비율 (배)
    'debt_ratio',        // 부채비율 (%)
  ]);

  rowList.forEach(row => {
    const fieldName = fieldMapping[row.title];

    if (!fieldName) {
      return; // 매핑되지 않은 지표 스킵
    }

    const isRatio = ratioFields.has(fieldName);

    Object.entries(row.columns || {}).forEach(([yearKey, columnData]) => {
      const yearData = yearDataMap.get(yearKey);

      if (!yearData) {
        return;
      }

      const parsedValue = parseNaverNumber(columnData.value, isRatio);

      // TypeScript 타입 안전성을 위한 조건부 할당
      if (fieldName in yearData) {
        (yearData as any)[fieldName] = parsedValue;
      }
    });
  });

  return Array.from(yearDataMap.values());
}

/**
 * DB에 데이터 저장 (Upsert)
 */
async function saveToDatabase(
  companyId: number,
  parsedData: ParsedFinancialData[]
): Promise<number> {
  const scrapeDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let insertedCount = 0;

  for (const data of parsedData) {
    const record: Omit<FinancialDataExtended, 'id' | 'created_at' | 'updated_at'> = {
      company_id: companyId,
      year: data.year,
      scrape_date: scrapeDate,
      revenue: data.revenue,
      operating_profit: data.operating_profit,
      net_income: data.net_income,
      operating_margin: data.operating_margin,
      net_margin: data.net_margin,
      roe: data.roe,
      eps: data.eps,
      per: data.per,
      bps: data.bps,
      pbr: data.pbr,
      total_assets: data.total_assets,
      total_liabilities: data.total_liabilities,
      total_equity: data.total_equity,
      debt_ratio: data.debt_ratio,
      operating_cash_flow: data.operating_cash_flow,
      investing_cash_flow: data.investing_cash_flow,
      financing_cash_flow: data.financing_cash_flow,
      free_cash_flow: data.free_cash_flow,
      is_estimate: data.is_estimate,
      data_source: 'naver',
    };

    // Upsert (충돌 시 업데이트)
    const { error } = await supabaseAdmin
      .from('financial_data_extended')
      .upsert(record, {
        onConflict: 'company_id,year,scrape_date,data_source',
      });

    if (error) {
      console.error(`❌ DB 저장 실패 (company_id: ${companyId}, year: ${data.year}):`, error);
    } else {
      insertedCount++;
    }
  }

  return insertedCount;
}

/**
 * 단일 종목 스크래핑 (공개 API)
 */
export async function scrapeNaverFinance(
  companyId: number,
  companyName: string,
  stockCode: string
): Promise<ScraperResult> {
  console.log(`🔄 ${companyName} (${stockCode}) 스크래핑 시작...`);

  // 1. API 데이터 가져오기
  const apiData = await fetchNaverFinancialData(stockCode);

  if (!apiData) {
    return {
      success: false,
      company_id: companyId,
      company_name: companyName,
      records_inserted: 0,
      error: 'API 응답 없음',
    };
  }

  // 2. 데이터 파싱
  const parsedData = parseFinancialData(apiData);

  if (parsedData.length === 0) {
    return {
      success: false,
      company_id: companyId,
      company_name: companyName,
      records_inserted: 0,
      error: '파싱된 데이터 없음',
    };
  }

  // 3. DB 저장
  const insertedCount = await saveToDatabase(companyId, parsedData);

  console.log(`✅ ${companyName}: ${insertedCount}개 레코드 저장`);

  return {
    success: true,
    company_id: companyId,
    company_name: companyName,
    records_inserted: insertedCount,
  };
}

/**
 * 전체 종목 스크래핑 (배치)
 */
export async function scrapeAllCompanies(): Promise<ScraperResult[]> {
  console.log('🚀 전체 종목 스크래핑 시작\n');

  // 1. companies 테이블에서 모든 종목 가져오기
  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, code')
    .order('id');

  if (error || !companies) {
    console.error('❌ 종목 목록 조회 실패:', error);
    return [];
  }

  console.log(`📊 총 ${companies.length}개 종목 발견\n`);

  const results: ScraperResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];

    // 스크래핑 실행
    const result = await scrapeNaverFinance(
      company.id,
      company.name,
      company.code
    );

    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
      console.error(`❌ ${company.name} 실패: ${result.error}`);
    }

    // Rate limiting (마지막 종목 제외)
    if (i < companies.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }

    // 진행률 표시 (10개마다)
    if ((i + 1) % 10 === 0) {
      console.log(`\n📈 진행률: ${i + 1}/${companies.length} (${((i + 1) / companies.length * 100).toFixed(1)}%)\n`);
    }
  }

  // 최종 결과
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 스크래핑 완료\n');
  console.log(`✅ 성공: ${successCount}/${companies.length}`);
  console.log(`❌ 실패: ${failCount}/${companies.length}`);
  console.log(`📈 성공률: ${(successCount / companies.length * 100).toFixed(1)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return results;
}

/**
 * 특정 종목 목록만 스크래핑
 */
export async function scrapeSampleCompanies(companyCodes: string[]): Promise<ScraperResult[]> {
  console.log(`🚀 샘플 종목 스크래핑 시작 (${companyCodes.length}개)\n`);

  const results: ScraperResult[] = [];

  for (let i = 0; i < companyCodes.length; i++) {
    const code = companyCodes[i];

    // DB에서 종목 정보 조회
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, code')
      .eq('code', code)
      .single();

    if (error || !company) {
      console.error(`❌ 종목 조회 실패 (${code}):`, error);
      results.push({
        success: false,
        company_id: 0,
        company_name: code,
        records_inserted: 0,
        error: '종목 조회 실패',
      });
      continue;
    }

    // 스크래핑 실행
    const result = await scrapeNaverFinance(company.id, company.name, company.code);
    results.push(result);

    // Rate limiting (마지막 종목 제외)
    if (i < companyCodes.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  return results;
}
