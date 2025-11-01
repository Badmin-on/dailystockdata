'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface ETFData {
  name: string;
  code: string;
  market: string;
  provider: string;
  current_price: number | null;
  ma_120: number | null;
  price_deviation: number | null;
  latest_date: string | null;
  change_rate: number | null;
  volume: number | null;
}

interface ProviderSummary {
  provider: string;
  etf_count: number;
  avg_change_rate: number | null;
  avg_deviation: number | null;
  rising_count: number;
  falling_count: number;
  top_performer: {
    name: string;
    code: string;
    change_rate: number;
  } | null;
  bottom_performer: {
    name: string;
    code: string;
    change_rate: number;
  } | null;
}

export default function ETFMonitoringPage() {
  const searchParams = useSearchParams();
  const [etfData, setEtfData] = useState<ETFData[]>([]);
  const [summaryData, setSummaryData] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('provider');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // ETF 목록 조회
        const etfParams = new URLSearchParams({
          provider: selectedProvider,
          search: searchTerm,
          sortBy,
          sortOrder
        });
        const etfResponse = await fetch(`/api/etf-monitoring?${etfParams}`);
        const etfResult = await etfResponse.json();
        setEtfData(etfResult.data || []);

        // 운용사별 요약 통계 조회
        const summaryResponse = await fetch('/api/etf-summary');
        const summaryResult = await summaryResponse.json();
        setSummaryData(summaryResult.data || []);
      } catch (error) {
        console.error('Error fetching ETF data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProvider, searchTerm, sortBy, sortOrder]);

  // 포맷 헬퍼 함수
  const formatNumber = (value: number | null): string => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('ko-KR');
  };

  const formatPercent = (value: number | null): string => {
    if (value === null || value === undefined) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value: number | null): string => {
    if (value === null || value === undefined) return 'text-slate-400';
    if (value > 0) return 'text-red-400';
    if (value < 0) return 'text-blue-400';
    return 'text-slate-400';
  };

  const getDeviationColor = (value: number | null): string => {
    if (value === null || value === undefined) return 'text-slate-400';
    if (value > 10) return 'text-red-400';
    if (value < -10) return 'text-blue-400';
    return 'text-slate-400';
  };

  // 운용사별 통계 계산
  const totalETFs = summaryData.reduce((sum, s) => sum + s.etf_count, 0);
  const totalRising = summaryData.reduce((sum, s) => sum + s.rising_count, 0);
  const totalFalling = summaryData.reduce((sum, s) => sum + s.falling_count, 0);
  const avgDeviation = summaryData.length > 0
    ? summaryData.reduce((sum, s) => sum + (s.avg_deviation || 0), 0) / summaryData.length
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">ETF 섹터 모니터링</h1>
          <p className="text-slate-400">국내 상장 ETF 실시간 주가 및 이격도 분석</p>
        </div>

        {/* 전체 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">전체 ETF</div>
            <div className="text-3xl font-bold text-white">{totalETFs}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">상승 종목</div>
            <div className="text-3xl font-bold text-red-400">{totalRising}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">하락 종목</div>
            <div className="text-3xl font-bold text-blue-400">{totalFalling}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">평균 이격도</div>
            <div className={`text-3xl font-bold ${getDeviationColor(avgDeviation)}`}>
              {avgDeviation !== null ? `${avgDeviation.toFixed(2)}%` : '-'}
            </div>
          </div>
        </div>

        {/* 운용사별 요약 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">운용사별 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryData.map((summary) => (
              <div
                key={summary.provider}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{summary.provider}</h3>
                    <p className="text-sm text-slate-400">{summary.etf_count}개 ETF</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getChangeColor(summary.avg_change_rate)}`}>
                      {formatPercent(summary.avg_change_rate)}
                    </div>
                    <div className="text-xs text-slate-400">평균 수익률</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">상승</div>
                    <div className="text-red-400 font-semibold">{summary.rising_count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">하락</div>
                    <div className="text-blue-400 font-semibold">{summary.falling_count}</div>
                  </div>
                </div>
                {summary.top_performer && (
                  <div className="text-xs">
                    <div className="text-slate-400 mb-1">상위 종목</div>
                    <div className="text-white">
                      {summary.top_performer.name}
                      <span className="text-red-400 ml-2">
                        {formatPercent(summary.top_performer.change_rate)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 운용사 필터 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">운용사</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                <option value="KODEX">KODEX</option>
                <option value="TIGER">TIGER</option>
                <option value="ACE">ACE</option>
                <option value="RISE">RISE</option>
                <option value="SOL">SOL</option>
                <option value="HANARO">HANARO</option>
              </select>
            </div>

            {/* 검색 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">검색</label>
              <input
                type="text"
                placeholder="종목명 또는 코드"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 정렬 기준 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">정렬 기준</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="provider">운용사</option>
                <option value="name">종목명</option>
                <option value="current_price">현재가</option>
                <option value="change_rate">등락률</option>
                <option value="price_deviation">이격도</option>
                <option value="volume">거래량</option>
              </select>
            </div>

            {/* 정렬 순서 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">순서</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ASC">오름차순</option>
                <option value="DESC">내림차순</option>
              </select>
            </div>
          </div>
        </div>

        {/* ETF 목록 테이블 (데스크톱) */}
        <div className="hidden md:block bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    운용사
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    종목명
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    코드
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    현재가
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    등락률
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    MA120
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    이격도
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    거래량
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      데이터 로딩 중...
                    </td>
                  </tr>
                ) : etfData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  etfData.map((etf, index) => (
                    <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-blue-400">{etf.provider}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{etf.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-slate-300">{etf.code}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm text-white font-semibold">
                          {formatNumber(etf.current_price)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${getChangeColor(etf.change_rate)}`}>
                          {formatPercent(etf.change_rate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm text-slate-300">
                          {formatNumber(etf.ma_120)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${getDeviationColor(etf.price_deviation)}`}>
                          {formatPercent(etf.price_deviation)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm text-slate-300">
                          {formatNumber(etf.volume)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ETF 목록 카드 (모바일) */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center text-slate-400 py-8">데이터 로딩 중...</div>
          ) : etfData.length === 0 ? (
            <div className="text-center text-slate-400 py-8">검색 결과가 없습니다.</div>
          ) : (
            etfData.map((etf, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-medium text-blue-400">{etf.provider}</span>
                    <h3 className="text-base font-bold text-white mt-1">{etf.name}</h3>
                    <p className="text-xs text-slate-400">{etf.code}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {formatNumber(etf.current_price)}
                    </div>
                    <div className={`text-sm font-semibold ${getChangeColor(etf.change_rate)}`}>
                      {formatPercent(etf.change_rate)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">MA120</div>
                    <div className="text-sm text-slate-300">{formatNumber(etf.ma_120)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">이격도</div>
                    <div className={`text-sm font-semibold ${getDeviationColor(etf.price_deviation)}`}>
                      {formatPercent(etf.price_deviation)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">거래량</div>
                    <div className="text-sm text-slate-300">{formatNumber(etf.volume)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 결과 카운트 */}
        {!loading && etfData.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-400">
            총 {etfData.length}개 ETF
          </div>
        )}
      </div>
    </div>
  );
}
