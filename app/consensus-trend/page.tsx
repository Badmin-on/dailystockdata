'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CompanyInfo {
  id: string;
  code: string;
  name: string;
  market: string;
}

interface TimeSeriesData {
  date: string;
  close_price: number | null;
  volume: number | null;
  [key: string]: any; // revenue_2025, op_profit_2025, etc.
}

interface Stats {
  recent30Days: {
    [year: number]: {
      revenue_change: number;
      first: number;
      last: number;
    };
    price_change?: number;
    price_first?: number;
    price_last?: number;
    divergence?: number;
  };
}

interface TrendData {
  company: CompanyInfo;
  timeSeriesData: TimeSeriesData[];
  stats: Stats;
  metadata: {
    totalDataPoints: number;
    dateRange: {
      start: string;
      end: string;
    };
    years: number[];
  };
}

export default function ConsensusTrendPage() {
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'revenue' | 'profit'>('revenue');
  const [chartMode, setChartMode] = useState<'absolute' | 'percentage'>('percentage'); // 기본값 증감률

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setError('기업 이름 또는 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 코드인지 이름인지 판단 (6자리 숫자면 코드)
      const isCode = /^\d{6}$/.test(searchInput);
      const queryParam = isCode ? `code=${searchInput}` : `name=${encodeURIComponent(searchInput)}`;

      const response = await fetch(`/api/consensus-trend?${queryParam}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다.');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 차트 데이터 가공
  const chartData = (() => {
    if (!data?.timeSeriesData.length) return [];

    // 기준값 계산 (첫 번째 유효한 데이터 포인트)
    const baseValues: { [key: string]: number } = {};

    if (chartMode === 'percentage') {
      // 각 year별 첫 번째 유효값 찾기
      data.metadata.years.forEach(year => {
        const key = viewMode === 'revenue' ? `revenue_${year}` : `op_profit_${year}`;
        const firstValid = data.timeSeriesData.find(item => item[key] != null);
        if (firstValid) {
          baseValues[`${year}년`] = firstValid[key];
        }
      });

      // 주가 기준값
      const firstValidPrice = data.timeSeriesData.find(item => item.close_price != null);
      if (firstValidPrice) {
        baseValues['close_price'] = firstValidPrice.close_price;
      }
    }

    return data.timeSeriesData.map(item => {
      const result: any = {
        date: item.date.substring(5), // MM-DD 형식으로 단축
      };

      // 주가 처리
      if (chartMode === 'absolute') {
        result.close_price = item.close_price;
      } else if (chartMode === 'percentage' && baseValues['close_price']) {
        result.close_price = item.close_price
          ? ((item.close_price - baseValues['close_price']) / baseValues['close_price'] * 100)
          : null;
      }

      // 선택한 viewMode에 따라 데이터 추가
      data.metadata.years.forEach(year => {
        const key = viewMode === 'revenue' ? `revenue_${year}` : `op_profit_${year}`;
        const value = item[key];

        if (chartMode === 'absolute') {
          // 절대값 (억원 단위)
          result[`${year}년`] = value ? value / 1000000 : null;
        } else if (chartMode === 'percentage' && baseValues[`${year}년`]) {
          // 증감률 (%)
          result[`${year}년`] = value
            ? ((value - baseValues[`${year}년`]) / baseValues[`${year}년`] * 100)
            : null;
        }
      });

      return result;
    });
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            컨센서스 & 주가 추이 분석
          </h1>
          <p className="text-gray-400">기업의 컨센서스 변화와 주가 추이를 한눈에 확인하세요</p>
        </div>

        {/* 검색 영역 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="기업 이름 또는 코드를 입력하세요 (예: 삼성전자, 005930)"
                className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-12"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* 데이터 표시 영역 */}
        {data && (
          <div className="space-y-8">
            {/* 기업 정보 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{data.company.name}</h2>
                  <p className="text-gray-400">
                    {data.company.code} · {data.company.market}
                  </p>
                </div>
                <div className="flex gap-4">
                  {/* 매출/영업이익 선택 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('revenue')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        viewMode === 'revenue'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      매출
                    </button>
                    <button
                      onClick={() => setViewMode('profit')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        viewMode === 'profit'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      영업이익
                    </button>
                  </div>

                  {/* 절대값/증감률 선택 */}
                  <div className="flex gap-2 border-l border-gray-600 pl-4">
                    <button
                      onClick={() => setChartMode('absolute')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        chartMode === 'absolute'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      절대값
                    </button>
                    <button
                      onClick={() => setChartMode('percentage')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        chartMode === 'percentage'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      증감률
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 인사이트 카드 */}
            {data.stats?.recent30Days && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 컨센서스 변화 */}
                {data.stats.recent30Days[2025] && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      {data.stats.recent30Days[2025].revenue_change >= 0 ? (
                        <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-6 h-6 text-red-500" />
                      )}
                      <h3 className="text-lg font-semibold">2025년 컨센서스</h3>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {data.stats.recent30Days[2025].revenue_change > 0 ? '+' : ''}
                      {data.stats.recent30Days[2025].revenue_change.toFixed(2)}%
                    </div>
                    <p className="text-sm text-gray-400">최근 30일 변화</p>
                  </div>
                )}

                {/* 주가 변화 */}
                {data.stats.recent30Days.price_change !== undefined && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      {data.stats.recent30Days.price_change >= 0 ? (
                        <ArrowTrendingUpIcon className="w-6 h-6 text-blue-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-6 h-6 text-red-500" />
                      )}
                      <h3 className="text-lg font-semibold">주가</h3>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {data.stats.recent30Days.price_change > 0 ? '+' : ''}
                      {data.stats.recent30Days.price_change.toFixed(2)}%
                    </div>
                    <p className="text-sm text-gray-400">최근 30일 변화</p>
                  </div>
                )}

                {/* 괴리율 */}
                {data.stats.recent30Days.divergence !== undefined && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">괴리율</h3>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {data.stats.recent30Days.divergence > 0 ? '+' : ''}
                      {data.stats.recent30Days.divergence.toFixed(2)}%p
                    </div>
                    <p className="text-sm text-gray-400">
                      {Math.abs(data.stats.recent30Days.divergence) > 5
                        ? data.stats.recent30Days.divergence > 0
                          ? '주가 저평가 구간'
                          : '주가 과열 구간'
                        : '정상 범위'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 차트 영역 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-6">
                {viewMode === 'revenue' ? '매출' : '영업이익'} 컨센서스 & 주가 추이
              </h3>
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  {/* 왼쪽 Y축 */}
                  <YAxis
                    yAxisId="left"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    label={{
                      value: chartMode === 'percentage' ? '변화율 (%)' : '컨센서스 (억원)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#9CA3AF'
                    }}
                  />
                  {/* 오른쪽 Y축 */}
                  {chartMode === 'absolute' ? (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      label={{ value: '주가 (원)', angle: 90, position: 'insideRight', fill: '#9CA3AF' }}
                    />
                  ) : (
                    // 증감률 모드에서는 단일 Y축 사용
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      hide={true}
                    />
                  )}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: any, name: string) => {
                      if (value === null || value === undefined) return ['-', name];

                      if (chartMode === 'percentage') {
                        // 증감률 모드: % 표시
                        return [`${value.toFixed(2)}%`, name];
                      } else {
                        // 절대값 모드
                        if (name === '주가') {
                          return [`${value.toLocaleString()}원`, name];
                        } else {
                          return [`${value.toLocaleString()}억원`, name];
                        }
                      }
                    }}
                  />
                  <Legend />

                  {/* 컨센서스 라인 (왼쪽 축) */}
                  {data.metadata.years.map((year, index) => (
                    <Line
                      key={year}
                      yAxisId="left"
                      type="monotone"
                      dataKey={`${year}년`}
                      stroke={['#3B82F6', '#10B981', '#F59E0B'][index % 3]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={true}
                      name={`${year}년 ${viewMode === 'revenue' ? '매출' : '영업이익'}`}
                    />
                  ))}

                  {/* 주가 영역 (오른쪽 축) */}
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="close_price"
                    fill="#8B5CF6"
                    fillOpacity={0.2}
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    connectNulls={true}
                    name="주가"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 메타데이터 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-400 mb-1">데이터 포인트</p>
                  <p className="text-2xl font-bold">{data.metadata.totalDataPoints}개</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">기간</p>
                  <p className="text-2xl font-bold">
                    {data.metadata.dateRange.start} ~ {data.metadata.dateRange.end}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">분석 년도</p>
                  <p className="text-2xl font-bold">{data.metadata.years.join(', ')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 초기 상태 안내 */}
        {!data && !loading && !error && (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-12 border border-gray-700 text-center">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">기업을 검색해주세요</h3>
            <p className="text-gray-400">
              기업 이름 또는 코드를 입력하여 컨센서스와 주가 추이를 확인하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
