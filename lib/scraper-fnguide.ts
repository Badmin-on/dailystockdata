/**
 * FnGuide 재무 데이터 스크래퍼 (원본 1_seoul_ys_fnguide.js 기반)
 * 
 * 원본 로직 그대로 유지:
 * 1. KOSPI 500 + KOSDAQ 500 = 1,000개 기업 수집
 * 2. FnGuide에서 최근 4개년도 재무 데이터 수집
 * 3. 매출액, 영업이익 및 증감률 계산
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

// ============================================
// 타입 정의
// ============================================

export interface StockBasicInfo {
  name: string;
  code: string;
  market: 'KOSPI' | 'KOSDAQ';
}

export interface FinancialYearData {
  year: string;          // 연도 (예: "2024")
  revenue: number | null;           // 매출액 (억원)
  revenue_growth: number | null;    // 매출액 증감률 (%)
  operating_profit: number | null;  // 영업이익 (억원)
  operating_profit_growth: number | null; // 영업이익 증감률 (%)
}

export interface CompanyFinancialData {
  company: StockBasicInfo;
  years_data: FinancialYearData[];
  raw_headers: string[];  // 원본 헤더 정보 (디버깅용)
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 증감률 계산 (원본 calculateGrowth 함수 그대로)
 */
function calculateGrowth(current: string, previous: string): number | null {
  if (!current || !previous) return null;
  
  const currentValue = parseFloat(String(current).replace(/,/g, ''));
  const previousValue = parseFloat(String(previous).replace(/,/g, ''));
  
  if (isNaN(currentValue) || isNaN(previousValue) || previousValue === 0) {
    return null;
  }
  
  const growth = ((currentValue - previousValue) / previousValue * 100);
  return parseFloat(growth.toFixed(2));
}

/**
 * 딜레이 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 기업 목록 수집 (원본 fetchTopStocks 함수)
// ============================================

/**
 * 네이버 증권에서 시가총액 상위 기업 목록 수집
 * @param market 'KOSPI' 또는 'KOSDAQ'
 * @param limit 수집할 기업 수 (기본값: 500)
 */
export async function fetchTopStocks(
  market: 'KOSPI' | 'KOSDAQ',
  limit: number = 500
): Promise<StockBasicInfo[]> {
  const stocks: StockBasicInfo[] = [];
  const sosok = market === 'KOSPI' ? 0 : 1;
  
  // 10페이지까지 조회 (페이지당 약 50개 기업)
  for (let page = 1; page <= 10; page++) {
    if (stocks.length >= limit) break;
    
    const url = `https://finance.naver.com/sise/sise_market_sum.nhn?sosok=${sosok}&page=${page}`;
    
    try {
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000 
      });
      
      // EUC-KR 디코딩
      const decodedResponse = iconv.decode(Buffer.from(response.data), 'EUC-KR');
      const $ = cheerio.load(decodedResponse);
      
      // 테이블 파싱
      $('table.type_2 tbody tr').each((index, element) => {
        const $tds = $(element).find('td');
        const name = $($tds[1]).text().trim();
        const $anchor = $($tds[1]).find('a');
        
        if ($anchor.length > 0) {
          const href = $anchor.attr('href');
          if (href) {
            const code = href.split('=')[1];
            if (code && name) {
              stocks.push({ name, code, market });
            }
          }
        }
      });
      
      // 페이지 간 딜레이 (서버 부하 방지)
      await delay(500);
      
    } catch (error) {
      console.error(`[fetchTopStocks] Error fetching ${market} page ${page}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  // 정확히 limit 개수만 반환
  return stocks.slice(0, limit);
}

// ============================================
// FnGuide 재무 데이터 수집 (원본 fetchStockData 함수)
// ============================================

/**
 * FnGuide에서 특정 기업의 재무 데이터 수집
 * @param stockCode 종목 코드 (예: "005930")
 */
export async function fetchStockFinancialData(stockCode: string): Promise<{
  headers: string[];
  data: {
    매출액?: string[];
    영업이익?: string[];
  };
}> {
  const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${stockCode}`;
  
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // 11번째 테이블 (재무제표 컨센서스)
    const table = $('table').eq(11);
    
    // 헤더 추출
    const headers: string[] = [];
    table.find('thead th').each((i, elem) => {
      headers.push($(elem).text().trim());
    });
    
    headers.shift(); // 첫 번째 빈 헤더 제거
    
    // 최근 4개년도 데이터
    const recentFourYears = headers.slice(-4);
    
    // 데이터 행 파싱
    const rows = table.find('tbody tr');
    const data: { 매출액?: string[]; 영업이익?: string[] } = {};
    const neededRows = ['매출액', '영업이익'];
    
    rows.each((i, row) => {
      const cells = $(row).find('td, th');
      let rowName = $(cells[0]).text().trim();
      
      if (neededRows.includes(rowName)) {
        // 공백 제거 (예: "매출액 " → "매출액")
        rowName = rowName.split(' ')[0];
        
        // 최근 4개 셀의 데이터 추출
        const values: string[] = [];
        cells.slice(-4).each((j, cell) => {
          values.push($(cell).text().trim());
        });
        
        data[rowName as '매출액' | '영업이익'] = values;
      }
    });
    
    return { headers: recentFourYears, data };
    
  } catch (error) {
    console.error(`[fetchStockFinancialData] Error fetching ${stockCode}:`, error instanceof Error ? error.message : String(error));
    return { headers: [], data: {} };
  }
}

// ============================================
// 데이터 변환 및 정리
// ============================================

/**
 * 원본 데이터를 구조화된 재무 데이터로 변환
 */
export function transformFinancialData(
  company: StockBasicInfo,
  rawData: {
    headers: string[];
    data: {
      매출액?: string[];
      영업이익?: string[];
    };
  }
): CompanyFinancialData {
  const years_data: FinancialYearData[] = [];
  
  // 연도 추출 (정규표현식으로 YYYY 형식 추출)
  const years = rawData.headers.map(h => {
    const match = h.match(/\d{4}/);
    return match ? match[0] : null;
  }).filter(y => y !== null) as string[];
  
  // 각 연도별 데이터 구성
  years.forEach((year, yearIndex) => {
    const revenueStr = rawData.data['매출액']?.[yearIndex] || '';
    const prevRevenueStr = yearIndex > 0 ? (rawData.data['매출액']?.[yearIndex - 1] || '') : '';
    const opProfitStr = rawData.data['영업이익']?.[yearIndex] || '';
    const prevOpProfitStr = yearIndex > 0 ? (rawData.data['영업이익']?.[yearIndex - 1] || '') : '';
    
    // 숫자로 변환
    const revenue = revenueStr ? parseFloat(revenueStr.replace(/,/g, '')) : null;
    const operating_profit = opProfitStr ? parseFloat(opProfitStr.replace(/,/g, '')) : null;
    
    // 증감률 계산
    const revenue_growth = calculateGrowth(revenueStr, prevRevenueStr);
    const operating_profit_growth = calculateGrowth(opProfitStr, prevOpProfitStr);
    
    years_data.push({
      year,
      revenue,
      revenue_growth,
      operating_profit,
      operating_profit_growth
    });
  });
  
  return {
    company,
    years_data,
    raw_headers: rawData.headers
  };
}

// ============================================
// 메인 수집 함수
// ============================================

/**
 * 전체 프로세스 실행: 기업 목록 + 재무 데이터 수집
 */
export async function collectAllFinancialData(
  options: {
    kospi_limit?: number;
    kosdaq_limit?: number;
    delay_ms?: number;
    on_progress?: (current: number, total: number, company: string) => void;
  } = {}
): Promise<CompanyFinancialData[]> {
  const {
    kospi_limit = 500,
    kosdaq_limit = 500,
    delay_ms = 1000,
    on_progress
  } = options;
  
  console.log('[FnGuide Scraper] 기업 목록 수집 시작...');
  
  // 1. 기업 목록 수집
  const kospiStocks = await fetchTopStocks('KOSPI', kospi_limit);
  console.log(`[FnGuide Scraper] KOSPI ${kospiStocks.length}개 수집 완료`);
  
  const kosdaqStocks = await fetchTopStocks('KOSDAQ', kosdaq_limit);
  console.log(`[FnGuide Scraper] KOSDAQ ${kosdaqStocks.length}개 수집 완료`);
  
  const allStocks = [...kospiStocks, ...kosdaqStocks];
  const total = allStocks.length;
  
  console.log(`[FnGuide Scraper] 총 ${total}개 기업 재무 데이터 수집 시작...`);
  
  // 2. 각 기업별 재무 데이터 수집
  const results: CompanyFinancialData[] = [];
  
  for (let index = 0; index < allStocks.length; index++) {
    const stock = allStocks[index];
    
    try {
      // 재무 데이터 수집
      const rawData = await fetchStockFinancialData(stock.code);
      
      // 데이터 변환
      const financialData = transformFinancialData(stock, rawData);
      results.push(financialData);
      
      // 진행률 콜백
      if (on_progress) {
        on_progress(index + 1, total, stock.name);
      }
      
      // 딜레이 (서버 부하 방지)
      await delay(delay_ms);
      
    } catch (error) {
      console.error(`[collectAllFinancialData] Error processing ${stock.name} (${stock.code}):`, 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  console.log(`[FnGuide Scraper] 수집 완료: ${results.length}/${total}개`);
  return results;
}

// ============================================
// Supabase 저장 헬퍼 함수
// ============================================

/**
 * 수집된 재무 데이터를 Supabase 저장 형식으로 변환
 */
export function prepareForSupabase(financialData: CompanyFinancialData[]) {
  const records: Array<{
    company_code: string;
    company_name: string;
    market: string;
    year: string;
    revenue: number | null;
    revenue_growth: number | null;
    operating_profit: number | null;
    operating_profit_growth: number | null;
  }> = [];
  
  financialData.forEach(item => {
    item.years_data.forEach(yearData => {
      records.push({
        company_code: item.company.code,
        company_name: item.company.name,
        market: item.company.market,
        year: yearData.year,
        revenue: yearData.revenue,
        revenue_growth: yearData.revenue_growth,
        operating_profit: yearData.operating_profit,
        operating_profit_growth: yearData.operating_profit_growth
      });
    });
  });
  
  return records;
}
