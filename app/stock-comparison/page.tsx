'use client';

import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface StockComparison {
  name: string;
  code: string;
  market: string;
  year: number;
  is_estimate: boolean;
  is_highlighted: boolean;
  has_daily_surge: boolean;

  // 재무 데이터
  current_revenue: number;
  current_op_profit: number;

  // 주가 및 이격도 정보
  current_price: number | null;
  ma120: number | null;
  price_deviation: number | null;

  // 전일 대비
  prev_day_revenue: number | null;
  prev_day_op_profit: number | null;
  revenue_growth_prev_day: string | null;
  op_profit_growth_prev_day: string | null;
  prev_day_date: string | null;

  // 1개월 대비
  revenue_growth_1month: string | null;
  op_profit_growth_1month: string | null;
  onemonth_ago_date: string | null;

  // 3개월 대비
  revenue_growth_3month: string | null;
  op_profit_growth_3month: string | null;
  threemonth_ago_date: string | null;

  // 1년 대비
  revenue_growth_1year: string | null;
  op_profit_growth_1year: string | null;
  oneyear_ago_date: string | null;
}

export default function StockComparisonPage() {
  const [data, setData] = useState<StockComparison[]>([]);
  const [filteredData, setFilteredData] = useState<StockComparison[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [minDeviation, setMinDeviation] = useState<number>(-100);
  const [maxDeviation, setMaxDeviation] = useState<number>(100);
  const [sortBy, setSortBy] = useState<string>('op_profit_growth_1year');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [enableDeviationFilter, setEnableDeviationFilter] = useState<boolean>(false);
  const [showOnlyWithPrice, setShowOnlyWithPrice] = useState<boolean>(false);

  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // 비교 날짜 정보
  const [comparisonDates, setComparisonDates] = useState<{
    prevDayDate: string | null;
    oneMonthAgoDate: string | null;
    threeMonthsAgoDate: string | null;
    oneYearAgoDate: string | null;
  }>({
    prevDayDate: null,
    oneMonthAgoDate: null,
    threeMonthsAgoDate: null,
    oneYearAgoDate: null,
  });

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchData();
    }
  }, [selectedYear, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [data, searchTerm, selectedMarket, selectedYear, minDeviation, maxDeviation, sortBy, sortOrder, enableDeviationFilter, showOnlyWithPrice]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch('/api/available-years');
      const years = await response.json();
      setAvailableYears(years);
      if (years.length > 0) {
        // 2025년을 기본값으로 선택 (실제 데이터가 있는 연도)
        // 2025년이 없으면 가장 최근 과거 연도 선택
        const targetYear = years.includes(2025) ? 2025 : Math.min(...years.filter((y: number) => y <= new Date().getFullYear()));
        setSelectedYear(targetYear.toString());
      }
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/stock-comparison?${params}`);
      const result = await response.json();
      setData(result);

      // 비교 날짜 정보 추출 (첫 번째 데이터에서)
      if (result && result.length > 0) {
        const firstItem = result[0];
        setComparisonDates({
          prevDayDate: firstItem.prev_day_date || null,
          oneMonthAgoDate: firstItem.onemonth_ago_date || null,
          threeMonthsAgoDate: firstItem.threemonth_ago_date || null,
          oneYearAgoDate: firstItem.oneyear_ago_date || null,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...data];

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.code.includes(term)
      );
    }

    // 시장 필터
    if (selectedMarket !== 'ALL') {
      filtered = filtered.filter(item => item.market === selectedMarket);
    }

    // 주가 데이터 보유 종목만 표시 필터 (선택적)
    if (showOnlyWithPrice) {
      filtered = filtered.filter(item => item.price_deviation !== null);
    }

    // 이격도 필터 (선택적, 활성화된 경우만)
    if (enableDeviationFilter) {
      filtered = filtered.filter(item => {
        if (item.price_deviation === null) return false;
        return item.price_deviation >= minDeviation && item.price_deviation <= maxDeviation;
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof StockComparison];
      let bVal: any = b[sortBy as keyof StockComparison];

      // null 처리
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // 문자열을 숫자로 변환
      if (typeof aVal === 'string') {
        aVal = aVal === 'Infinity' ? Infinity : parseFloat(aVal);
      }
      if (typeof bVal === 'string') {
        bVal = bVal === 'Infinity' ? Infinity : parseFloat(bVal);
      }

      return sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
    });

    setFilteredData(filtered);
  };

  const formatNumber = (value: number | null, decimals: number = 0): string => {
    if (value === null) return '-';
    return value.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
  };

  const formatGrowth = (value: string | null): string => {
    if (!value) return '-';
    if (value === 'Infinity') return '∞';
    return `${parseFloat(value) >= 0 ? '+' : ''}${value}%`;
  };

  const getDeviationColor = (deviation: number | null): string => {
    if (deviation === null) return 'text-slate-400';
    if (deviation > 10) return 'text-red-400';
    if (deviation > 0) return 'text-orange-400';
    if (deviation > -10) return 'text-blue-400';
    return 'text-green-400';
  };

  const getDeviationBgColor = (deviation: number | null): string => {
    if (deviation === null) return 'bg-slate-500/20';
    if (deviation > 10) return 'bg-red-500/20';
    if (deviation > 0) return 'bg-orange-500/20';
    if (deviation > -10) return 'bg-blue-500/20';
    return 'bg-green-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">종목 비교 분석</h1>
        <p className="text-sm lg:text-base text-slate-400">재무 데이터 + 주가 이격도(120일 이평선) 종합 분석</p>
      </div>

      {/* 필터 영역 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-4 lg:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center">
            <FunnelIcon className="w-5 h-5 text-blue-400 mr-2" />
            <h2 className="text-base lg:text-lg font-semibold text-white">필터 및 정렬</h2>
          </div>
          <button
            onClick={fetchData}
            className="sm:ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span className="text-sm lg:text-base">새로고침</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
          {/* 검색 */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">종목 검색</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="종목명 또는 코드"
                className="w-full pl-9 lg:pl-10 pr-3 lg:pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm lg:text-base text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 시장 */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">시장</label>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm lg:text-base text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체</option>
              <option value="KOSPI">KOSPI</option>
              <option value="KOSDAQ">KOSDAQ</option>
            </select>
          </div>

          {/* 연도 */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                fetchData();
              }}
              className="w-full px-3 lg:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm lg:text-base text-white focus:outline-none focus:border-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>

          {/* 정렬 */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">정렬 기준</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm lg:text-base text-white focus:outline-none focus:border-blue-500"
            >
              <option value="op_profit_growth_1year">영업이익 증가율(1년)</option>
              <option value="revenue_growth_1year">매출 증가율(1년)</option>
              <option value="op_profit_growth_prev_day">영업이익 증가율(전일)</option>
              <option value="revenue_growth_prev_day">매출 증가율(전일)</option>
              <option value="op_profit_growth_1month">영업이익 증가율(1개월)</option>
              <option value="revenue_growth_1month">매출 증가율(1개월)</option>
              <option value="op_profit_growth_3month">영업이익 증가율(3개월)</option>
              <option value="revenue_growth_3month">매출 증가율(3개월)</option>
              <option value="price_deviation">이격도</option>
              <option value="current_price">현재가</option>
              <option value="current_op_profit">현재 영업이익</option>
              <option value="current_revenue">현재 매출액</option>
            </select>
          </div>
        </div>

        {/* 추가 필터 옵션 */}
        <div className="grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="showOnlyWithPrice"
              checked={showOnlyWithPrice}
              onChange={(e) => setShowOnlyWithPrice(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
            />
            <label htmlFor="showOnlyWithPrice" className="text-xs lg:text-sm text-slate-300 cursor-pointer">
              주가 데이터 보유 종목만 표시
            </label>
          </div>
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="enableDeviationFilter"
              checked={enableDeviationFilter}
              onChange={(e) => setEnableDeviationFilter(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
            />
            <label htmlFor="enableDeviationFilter" className="text-xs lg:text-sm text-slate-300 cursor-pointer">
              이격도 범위 필터 활성화
            </label>
          </div>
        </div>


        {/* 이격도 범위 (활성화된 경우만 표시) */}
        {enableDeviationFilter && (
          <div className="grid grid-cols-1 gap-4 mt-4 p-3 lg:p-4 bg-slate-800/50 rounded-lg border border-blue-500/30">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-blue-300 mb-2">
                최소 이격도 (%): {minDeviation}
              </label>
              <input
                type="range"
                min="-50"
                max="0"
                value={minDeviation}
                onChange={(e) => setMinDeviation(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs lg:text-sm font-medium text-blue-300 mb-2">
                최대 이격도 (%): {maxDeviation}
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={maxDeviation}
                onChange={(e) => setMaxDeviation(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 정렬 순서 */}
        <div className="mt-4">
          <label className="block text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">정렬 순서</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
            className="w-full px-3 lg:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm lg:text-base text-white focus:outline-none focus:border-blue-500"
          >
            <option value="DESC">높은 순</option>
            <option value="ASC">낮은 순</option>
          </select>
        </div>
      </div>

      {/* 비교 기준일 정보 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-4 lg:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="flex items-center">
            <ChartBarIcon className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400 mr-2" />
            <h2 className="text-base lg:text-lg font-semibold text-white">비교 기준일 정보</h2>
          </div>
          <span className="text-xs text-slate-400 sm:ml-2">
            (가장 근접한 날짜로 자동 선택)
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* 전일 비교 */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 lg:p-4">
            <p className="text-xs text-orange-300 font-semibold mb-1 uppercase">전일 대비</p>
            <p className="text-sm lg:text-base font-bold text-white leading-tight">
              {comparisonDates.prevDayDate
                ? new Date(comparisonDates.prevDayDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
          </div>

          {/* 1개월 비교 */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 lg:p-4">
            <p className="text-xs text-yellow-300 font-semibold mb-1 uppercase">1개월</p>
            <p className="text-sm lg:text-base font-bold text-white leading-tight">
              {comparisonDates.oneMonthAgoDate
                ? new Date(comparisonDates.oneMonthAgoDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
          </div>

          {/* 3개월 비교 */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 lg:p-4">
            <p className="text-xs text-green-300 font-semibold mb-1 uppercase">3개월</p>
            <p className="text-sm lg:text-base font-bold text-white leading-tight">
              {comparisonDates.threeMonthsAgoDate
                ? new Date(comparisonDates.threeMonthsAgoDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
          </div>

          {/* 1년 비교 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 lg:p-4">
            <p className="text-xs text-blue-300 font-semibold mb-1 uppercase">1년</p>
            <p className="text-sm lg:text-base font-bold text-white leading-tight">
              {comparisonDates.oneYearAgoDate
                ? new Date(comparisonDates.oneYearAgoDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/10 border border-blue-500/20 rounded-lg p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-slate-400 mb-1">전체 종목</p>
          <p className="text-xl lg:text-2xl font-bold text-white">{data.length}개</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/10 to-green-500/10 border border-green-500/20 rounded-lg p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-slate-400 mb-1">필터 적용</p>
          <p className="text-xl lg:text-2xl font-bold text-white">{filteredData.length}개</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/10 border border-purple-500/20 rounded-lg p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-slate-400 mb-1">주가 데이터 보유</p>
          <p className="text-xl lg:text-2xl font-bold text-white">
            {data.filter(d => d.current_price !== null).length}개
          </p>
        </div>
      </div>

      {/* 모바일 카드뷰 */}
      <div className="lg:hidden space-y-3 mb-6">
        {filteredData.map((item, index) => (
          <div
            key={`${item.code}-${item.year}-mobile`}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-4"
          >
            {/* 헤더: 순위, 종목명, 시장 */}
            <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-700/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-500 font-bold text-sm">#{index + 1}</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    item.market === 'KOSPI'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {item.market}
                  </span>
                </div>
                <p className="text-white font-bold text-base leading-tight">
                  {item.name}
                  {item.is_estimate && <span className="ml-1 text-xs text-blue-400">(E)</span>}
                  {item.has_daily_surge && <span className="ml-1 text-xs">🔥</span>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{item.code} · {item.year}년</p>
              </div>
            </div>

            {/* 주가 정보 */}
            {item.current_price && (
              <div className="mb-3 pb-3 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">현재가</p>
                    <p className="text-white font-bold text-lg">{formatNumber(item.current_price, 0)}원</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-1">이격도</p>
                    <span className={`px-3 py-1 rounded-full font-bold text-sm ${getDeviationBgColor(item.price_deviation)} ${getDeviationColor(item.price_deviation)}`}>
                      {item.price_deviation !== null ? (
                        <>{item.price_deviation >= 0 ? '+' : ''}{item.price_deviation.toFixed(2)}%</>
                      ) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 비교 데이터 */}
            <div className="space-y-2">
              {/* 전일 대비 */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-2">
                <p className="text-xs text-orange-300 font-semibold mb-1.5">전일 대비</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">매출: </span>
                    <span className={parseFloat(item.revenue_growth_prev_day || '0') >= 5 ? 'text-red-400 font-bold' : parseFloat(item.revenue_growth_prev_day || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                      {formatGrowth(item.revenue_growth_prev_day)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">영익: </span>
                    <span className={parseFloat(item.op_profit_growth_prev_day || '0') >= 5 ? 'text-red-400 font-bold' : parseFloat(item.op_profit_growth_prev_day || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                      {formatGrowth(item.op_profit_growth_prev_day)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1개월 대비 */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2">
                <p className="text-xs text-yellow-300 font-semibold mb-1.5">1개월 대비</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">매출: </span>
                    <span className={parseFloat(item.revenue_growth_1month || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                      {formatGrowth(item.revenue_growth_1month)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">영익: </span>
                    <span className={parseFloat(item.op_profit_growth_1month || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                      {formatGrowth(item.op_profit_growth_1month)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3개월 대비 */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2">
                <p className="text-xs text-green-300 font-semibold mb-1.5">3개월 대비</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">매출: </span>
                    <span className={parseFloat(item.revenue_growth_3month || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                      {formatGrowth(item.revenue_growth_3month)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">영익: </span>
                    <span className={parseFloat(item.op_profit_growth_3month || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-slate-500'}>
                      {formatGrowth(item.op_profit_growth_3month)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1년 대비 */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                <p className="text-xs text-blue-300 font-semibold mb-1.5">1년 대비</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">매출: </span>
                    <span className={parseFloat(item.revenue_growth_1year || '0') >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-semibold'}>
                      {formatGrowth(item.revenue_growth_1year)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">영익: </span>
                    <span className={parseFloat(item.op_profit_growth_1year || '0') >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-semibold'}>
                      {formatGrowth(item.op_profit_growth_1year)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-8 text-center">
            <ChartBarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">조건에 맞는 종목이 없습니다</p>
          </div>
        )}
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden lg:block bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase sticky left-0 bg-slate-800/50 z-10">순위</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase sticky left-12 bg-slate-800/50 z-10">종목명</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">시장</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">연도</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">현재가</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">120일평</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">이격도</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-orange-300 uppercase">매출(전일)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-orange-300 uppercase">영익(전일)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase">매출(1개월)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase">영익(1개월)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-green-300 uppercase">매출(3개월)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-green-300 uppercase">영익(3개월)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-blue-300 uppercase">매출(1년)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-blue-300 uppercase">영익(1년)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredData.map((item, index) => (
                <tr key={`${item.code}-${item.year}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-bold sticky left-0 bg-slate-900/95 z-10">{index + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap sticky left-12 bg-slate-900/95 z-10">
                    <div>
                      <p className="text-white font-medium">
                        {item.name}
                        {item.is_estimate && <span className="ml-1 text-xs text-blue-400">(E)</span>}
                        {item.has_daily_surge && <span className="ml-1 text-xs">🔥</span>}
                      </p>
                      <p className="text-sm text-slate-400">{item.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.market === 'KOSPI'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.market}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-slate-300 font-semibold">
                    {item.year}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-white font-semibold">
                    {formatNumber(item.current_price, 0)}{item.current_price ? '원' : ''}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-slate-400">
                    {formatNumber(item.ma120, 2)}{item.ma120 ? '원' : ''}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 rounded-full font-semibold ${getDeviationBgColor(item.price_deviation)} ${getDeviationColor(item.price_deviation)}`}>
                      {item.price_deviation !== null ? (
                        <>
                          {item.price_deviation >= 0 ? '+' : ''}{item.price_deviation.toFixed(2)}%
                        </>
                      ) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.revenue_growth_prev_day || '0') >= 5 ? 'text-red-400 font-bold' : parseFloat(item.revenue_growth_prev_day || '0') >= 0 ? 'text-green-400' : 'text-slate-500'}>
                      {formatGrowth(item.revenue_growth_prev_day)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.op_profit_growth_prev_day || '0') >= 5 ? 'text-red-400 font-bold' : parseFloat(item.op_profit_growth_prev_day || '0') >= 0 ? 'text-green-400' : 'text-slate-500'}>
                      {formatGrowth(item.op_profit_growth_prev_day)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.revenue_growth_1month || '0') >= 0 ? 'text-green-400' : 'text-slate-500'}>
                      {formatGrowth(item.revenue_growth_1month)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.op_profit_growth_1month || '0') >= 0 ? 'text-green-400' : 'text-slate-500'}>
                      {formatGrowth(item.op_profit_growth_1month)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.revenue_growth_3month || '0') >= 0 ? 'text-green-400' : 'text-slate-500'}>
                      {formatGrowth(item.revenue_growth_3month)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.op_profit_growth_3month || '0') >= 0 ? 'text-green-400' : 'text-slate-500'}>
                      {formatGrowth(item.op_profit_growth_3month)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.revenue_growth_1year || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-red-400'}>
                      {formatGrowth(item.revenue_growth_1year)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.op_profit_growth_1year || '0') >= 0 ? 'text-green-400 font-semibold' : 'text-red-400'}>
                      {formatGrowth(item.op_profit_growth_1year)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">조건에 맞는 종목이 없습니다</p>
          </div>
        )}
      </div>

      {/* 도움말 섹션 */}
      <div className="mt-6 space-y-3 lg:space-y-4">
        {/* 기호 설명 */}
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/10 border border-purple-500/20 rounded-lg p-3 lg:p-4">
          <h3 className="text-xs lg:text-sm font-semibold text-purple-400 mb-2 lg:mb-3">🔖 기호 설명</h3>
          <div className="grid grid-cols-1 gap-2 lg:gap-3 text-xs lg:text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-blue-400 font-semibold">(E)</span>
              <span className="text-slate-300">: 전망치 (Estimate)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-red-400 font-bold">🔥</span>
              <span className="text-slate-300">: 전일 대비 +5% 이상 급등</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-400 font-bold">양수</span>
              <span className="text-slate-300">: 증가 / </span>
              <span className="text-slate-500">음수</span>
              <span className="text-slate-300">: 감소</span>
            </div>
          </div>
        </div>

        {/* 이격도 설명 */}
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/10 border border-blue-500/20 rounded-lg p-3 lg:p-4">
          <h3 className="text-xs lg:text-sm font-semibold text-blue-400 mb-2">💡 이격도란?</h3>
          <p className="text-xs lg:text-sm text-slate-300 mb-2 lg:mb-3">
            현재 주가가 120일 이동평균선 대비 얼마나 떨어져 있는지를 나타냅니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-400">+10% 이상: 과열</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-slate-400">0~10%: 상승</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-slate-400">-10~0%: 하락</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-400">-10% 이하: 저평가</span>
            </div>
          </div>
        </div>

        {/* 컬럼 색상 설명 */}
        <div className="bg-gradient-to-br from-green-600/10 to-green-500/10 border border-green-500/20 rounded-lg p-3 lg:p-4">
          <h3 className="text-xs lg:text-sm font-semibold text-green-400 mb-2">📊 컬럼 색상 안내</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 text-xs lg:text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-orange-300 font-semibold">주황</span>
              <span className="text-slate-400">: 전일 대비</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-yellow-300 font-semibold">노랑</span>
              <span className="text-slate-400">: 1개월 대비</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-300 font-semibold">연두</span>
              <span className="text-slate-400">: 3개월 대비</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-300 font-semibold">파랑</span>
              <span className="text-slate-400">: 1년 대비</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
