'use client';

import { useEffect, useState } from 'react';

interface StockData {
  name: string;
  code: string;
  market: string;
  year: number;
  is_estimate: boolean;
  is_highlighted: boolean;
  has_daily_surge: boolean;
  current_revenue: number | null;
  current_op_profit: number | null;
  prev_day_revenue: number | null;
  prev_day_op_profit: number | null;
  revenue_growth_prev_day: string | null;
  op_profit_growth_prev_day: string | null;
  prev_day_date: string | null;
  onemonth_ago_revenue: number | null;
  onemonth_ago_op_profit: number | null;
  revenue_growth_1month: string | null;
  op_profit_growth_1month: string | null;
  onemonth_ago_date: string | null;
  threemonth_ago_revenue: number | null;
  threemonth_ago_op_profit: number | null;
  revenue_growth_3month: string | null;
  op_profit_growth_3month: string | null;
  threemonth_ago_date: string | null;
  oneyear_ago_revenue: number | null;
  oneyear_ago_op_profit: number | null;
  revenue_growth_1year: string | null;
  op_profit_growth_1year: string | null;
  oneyear_ago_date: string | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<StockData[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchYears();
    fetchData(today, '', '');
  }, []);

  const fetchYears = async () => {
    try {
      const res = await fetch('/api/available-years');
      const data = await res.json();
      setYears(data);
    } catch (error) {
      console.error('연도 로딩 실패:', error);
    }
  };

  const fetchData = async (date: string, year: string, sort: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (year) params.append('year', year);
      if (sort) params.append('sortBy', sort);

      const res = await fetch(`/api/stock-comparison?${params.toString()}`);
      const stockData = await res.json();
      setData(stockData);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(selectedDate, selectedYear, sortBy);
  };

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setSelectedYear('');
    setSortBy('');
    fetchData(today, '', '');
  };

  const formatValue = (val: number | null) => {
    if (val == null) return 'N/A';
    return (val / 100000000).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const formatGrowth = (val: string | null) => {
    if (val == null) return 'N/A';
    if (val === 'Infinity') return '흑자전환';
    return `${parseFloat(val).toLocaleString()}%`;
  };

  const getChangeClass = (val: string | null) => {
    if (val == null) return 'text-gray-500';
    if (val === 'Infinity' || parseFloat(val) > 0) return 'text-red-600 font-bold';
    if (parseFloat(val) < 0) return 'text-blue-600 font-bold';
    return 'text-gray-500';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1800px] mx-auto">
        {/* 헤더 */}
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          주식 데이터 변화 모니터링
        </h1>

        {/* 컨트롤 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">기준 날짜:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">연도 필터:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">전체 연도</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">정렬 기준:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">정렬 안 함</option>
                <optgroup label="매출액 증감율">
                  <option value="revenue_growth_prev_day">전일 대비</option>
                  <option value="revenue_growth_1month">1개월 전 대비</option>
                  <option value="revenue_growth_3month">3개월 전 대비</option>
                  <option value="revenue_growth_1year">1년 전 대비</option>
                </optgroup>
                <optgroup label="영업이익 증감율">
                  <option value="op_profit_growth_prev_day">전일 대비</option>
                  <option value="op_profit_growth_1month">1개월 전 대비</option>
                  <option value="op_profit_growth_3month">3개월 전 대비</option>
                  <option value="op_profit_growth_1year">1년 전 대비</option>
                </optgroup>
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              데이터 새로고침
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              필터 초기화
            </button>
          </div>
        </div>

        {/* 범례 */}
        <div className="text-center mb-4 text-sm text-gray-600">
          <span className="mr-4">✨: 유망 기업 (추정치 기반 성장)</span>
          <span>🔥: 당일 급등 기업 (전일비 +5% 이상)</span>
        </div>

        {/* 통계 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <p className="text-center text-gray-600">
            총 <span className="font-bold text-blue-600">{data.length.toLocaleString()}</span>개 기업 데이터 표시 중
            {selectedDate && ` (기준일: ${selectedDate})`}
          </p>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">데이터 로딩 중...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500">데이터가 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th rowSpan={2} className="px-3 py-3 text-left font-medium text-gray-700 border-r-2 border-gray-300 sticky left-0 bg-gray-100">회사명</th>
                    <th rowSpan={2} className="px-3 py-3 text-center font-medium text-gray-700 border-r-2 border-gray-300">종목코드</th>
                    <th rowSpan={2} className="px-3 py-3 text-center font-medium text-gray-700 border-r-2 border-gray-300">시장</th>
                    <th rowSpan={2} className="px-3 py-3 text-center font-medium text-gray-700 border-r-2 border-gray-300">연도</th>
                    <th colSpan={2} className="px-3 py-2 text-center font-medium text-gray-700 bg-blue-50 border-r-2 border-gray-300">현재 ({selectedDate})</th>
                    <th colSpan={4} className="px-3 py-2 text-center font-medium text-gray-700 bg-yellow-50 border-r-2 border-gray-300">전일 대비 ({formatDate(data[0]?.prev_day_date)})</th>
                    <th colSpan={4} className="px-3 py-2 text-center font-medium text-gray-700 bg-green-50 border-r-2 border-gray-300">1개월 전 ({formatDate(data[0]?.onemonth_ago_date)})</th>
                    <th colSpan={4} className="px-3 py-2 text-center font-medium text-gray-700 bg-purple-50 border-r-2 border-gray-300">3개월 전 ({formatDate(data[0]?.threemonth_ago_date)})</th>
                    <th colSpan={4} className="px-3 py-2 text-center font-medium text-gray-700 bg-pink-50">1년 전 ({formatDate(data[0]?.oneyear_ago_date)})</th>
                  </tr>
                  <tr>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">매출액(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50 border-r-2 border-gray-300">영업이익(억)</th>

                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-yellow-50">매출액(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-yellow-50">매출액%</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-yellow-50">영업이익(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-yellow-50 border-r-2 border-gray-300">영업이익%</th>

                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">매출액(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">매출액%</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">영업이익(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50 border-r-2 border-gray-300">영업이익%</th>

                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-purple-50">매출액(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-purple-50">매출액%</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-purple-50">영업이익(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-purple-50 border-r-2 border-gray-300">영업이익%</th>

                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-pink-50">매출액(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-pink-50">매출액%</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-pink-50">영업이익(억)</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-pink-50">영업이익%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 ${row.is_highlighted || row.has_daily_surge ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-2 text-left font-medium text-gray-900 sticky left-0 bg-white border-r-2 border-gray-300">
                        {row.is_highlighted && '✨ '}
                        {row.has_daily_surge && '🔥 '}
                        {row.name}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{row.code}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${row.market === 'KOSPI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {row.market}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600 border-r-2 border-gray-300">
                        {row.year}{row.is_estimate ? ' (E)' : ''}
                      </td>

                      <td className="px-2 py-2 text-right text-gray-700">{formatValue(row.current_revenue)}</td>
                      <td className="px-2 py-2 text-right text-gray-700 border-r-2 border-gray-300">{formatValue(row.current_op_profit)}</td>

                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.prev_day_revenue)}</td>
                      <td className={`px-2 py-2 text-right ${getChangeClass(row.revenue_growth_prev_day)}`}>{formatGrowth(row.revenue_growth_prev_day)}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.prev_day_op_profit)}</td>
                      <td className={`px-2 py-2 text-right border-r-2 border-gray-300 ${getChangeClass(row.op_profit_growth_prev_day)}`}>{formatGrowth(row.op_profit_growth_prev_day)}</td>

                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.onemonth_ago_revenue)}</td>
                      <td className={`px-2 py-2 text-right ${getChangeClass(row.revenue_growth_1month)}`}>{formatGrowth(row.revenue_growth_1month)}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.onemonth_ago_op_profit)}</td>
                      <td className={`px-2 py-2 text-right border-r-2 border-gray-300 ${getChangeClass(row.op_profit_growth_1month)}`}>{formatGrowth(row.op_profit_growth_1month)}</td>

                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.threemonth_ago_revenue)}</td>
                      <td className={`px-2 py-2 text-right ${getChangeClass(row.revenue_growth_3month)}`}>{formatGrowth(row.revenue_growth_3month)}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.threemonth_ago_op_profit)}</td>
                      <td className={`px-2 py-2 text-right border-r-2 border-gray-300 ${getChangeClass(row.op_profit_growth_3month)}`}>{formatGrowth(row.op_profit_growth_3month)}</td>

                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.oneyear_ago_revenue)}</td>
                      <td className={`px-2 py-2 text-right ${getChangeClass(row.revenue_growth_1year)}`}>{formatGrowth(row.revenue_growth_1year)}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatValue(row.oneyear_ago_op_profit)}</td>
                      <td className={`px-2 py-2 text-right ${getChangeClass(row.op_profit_growth_1year)}`}>{formatGrowth(row.op_profit_growth_1year)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
