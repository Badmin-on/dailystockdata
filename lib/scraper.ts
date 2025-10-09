import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

// 네이버 금융에서 상위 기업 목록 가져오기
export async function fetchTopStocks(market: 'KOSPI' | 'KOSDAQ', limit: number = 500) {
  const stocks: Array<{ name: string; code: string; market: string }> = [];
  const pages = Math.ceil(limit / 50); // 페이지당 50개

  for (let page = 1; page <= pages; page++) {
    try {
      const url = `https://finance.naver.com/sise/sise_market_sum.nhn?sosok=${market === 'KOSPI' ? 0 : 1}&page=${page}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const decodedResponse = iconv.decode(Buffer.from(response.data), 'EUC-KR');
      const $ = cheerio.load(decodedResponse);

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

      if (stocks.length >= limit) break;
    } catch (error) {
      console.error(`Error fetching ${market} page ${page}:`, error);
    }
  }

  return stocks.slice(0, limit);
}

// FnGuide에서 재무 데이터 가져오기
export async function fetchFinancialData(stockCode: string) {
  const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${stockCode}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(response.data);

    // 11번째 테이블 (재무제표)
    const table = $('table').eq(11);
    const headers: string[] = [];

    table.find('thead th').each((i, elem) => {
      headers.push($(elem).text().trim());
    });

    headers.shift(); // 첫 번째 빈 헤더 제거

    // 최근 4년 헤더 추출
    const recentFourYears = headers.slice(-4);
    const rows = table.find('tbody tr');
    const data: { [key: string]: string[] } = {};
    const neededRows = ['매출액', '영업이익'];

    rows.each((i, row) => {
      const cells = $(row).find('td, th');
      let rowName = $(cells[0]).text().trim();

      if (neededRows.some(needed => rowName.includes(needed))) {
        rowName = rowName.split(' ')[0];
        data[rowName] = cells.slice(-4).map((j, cell) => $(cell).text().trim()).get();
      }
    });

    return { headers: recentFourYears, data };
  } catch (error: any) {
    console.error(`Error fetching financial data for ${stockCode}:`, error.message);
    return { headers: [], data: {} };
  }
}

// 억원 → 원 단위 변환
export function parseAndScaleValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(numberValue)) return null;
  return Math.round(numberValue * 100000000); // 억원 → 원
}

// 연도 추출 (2024년, 2025E 등에서 숫자만)
export function extractYear(header: string): number | null {
  const match = header.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

// 추정치 여부 판단
export function isEstimate(header: string): boolean {
  return header.includes('E') || header.includes('(E)') || header.includes('추정');
}

// 숫자 파싱 헬퍼 함수
function cleanNumber(str: string | undefined | null): number | null {
  if (!str || typeof str !== 'string' || str.trim() === '') {
    return null;
  }
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }
  return null;
}

// 네이버 금융에서 전날 종가 데이터 가져오기
export async function fetchStockPrice(stockCode: string) {
  const url = `https://finance.naver.com/item/sise_day.naver?code=${stockCode}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer'
    });
    const decodedResponse = iconv.decode(Buffer.from(response.data), 'EUC-KR');
    const $ = cheerio.load(decodedResponse);

    // 첫 번째 데이터 행 (onmouseover 속성이 있는 행)
    const firstRow = $('table.type2 tr[onmouseover]').first();

    if (firstRow.length === 0) {
      return null;
    }

    const cells = firstRow.find('td');
    if (cells.length < 7) {
      return null;
    }

    // 날짜 파싱 (2025.01.09 → 2025-01-09)
    const dateText = $(cells[0]).text().trim();
    const date = dateText.replace(/\./g, '-');

    // 종가
    const closePrice = cleanNumber($(cells[1]).text().trim());

    // 변동률은 나중에 DB에서 계산 (전날 종가 비교)
    // 현재는 null로 저장하고 별도 업데이트 로직에서 계산
    const changeRate = null;

    // 거래량
    const volume = cleanNumber($(cells[6]).text().trim());

    if (closePrice === null || !date) {
      return null;
    }

    return {
      date,
      close_price: closePrice,
      change_rate: changeRate,
      volume: volume
    };
  } catch (error: any) {
    console.error(`Error fetching stock price for ${stockCode}:`, error.message);
    return null;
  }
}
