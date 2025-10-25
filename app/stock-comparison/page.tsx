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
  
  // 1개월 대비
  revenue_growth_1month: string | null;
  op_profit_growth_1month: string | null;
  
  // 3개월 대비
  revenue_growth_3month: string | null;
  op_profit_growth_3month: string | null;
  
  // 1년 대비
  revenue_growth_1year: string | null;
  op_profit_growth_1year: string | null;
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
  const [sortBy, setSortBy] = useState<string>('price_deviation');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    fetchAvailableYears();
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [data, searchTerm, selectedMarket, selectedYear, minDeviation, maxDeviation, sortBy, sortOrder]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch('/api/available-years');
      const years = await response.json();
      setAvailableYears(years);
      if (years.length > 0) {
        setSelectedYear(years[0].toString());
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
    
    // 이격도 필터 (null이 아닌 경우만)
    filtered = filtered.filter(item => {
      if (item.price_deviation === null) return false;
      return item.price_deviation >= minDeviation && item.price_deviation <= maxDeviation;
    });
    
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
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">종목 비교 분석</h1>
        <p className="text-slate-400">재무 데이터 + 주가 이격도(120일 이평선) 종합 분석</p>
      </div>

      {/* 필터 영역 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-6 mb-6">
        <div className="flex items-center mb-4">
          <FunnelIcon className="w-5 h-5 text-blue-400 mr-2" />
          <h2 className="text-lg font-semibold text-white">필터 및 정렬</h2>
          <button
            onClick={fetchData}
            className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>새로고침</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* 검색 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">종목 검색</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="종목명 또는 코드"
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* 시장 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">시장</label>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체</option>
              <option value="KOSPI">KOSPI</option>
              <option value="KOSDAQ">KOSDAQ</option>
            </select>
          </div>
          
          {/* 연도 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                fetchData();
              }}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          
          {/* 정렬 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">정렬 기준</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="price_deviation">이격도</option>
              <option value="revenue_growth_1year">매출 증가율(1년)</option>
              <option value="op_profit_growth_1year">영업이익 증가율(1년)</option>
              <option value="current_price">현재가</option>
            </select>
          </div>
        </div>
        
        {/* 이격도 범위 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">정렬 순서</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="DESC">높은 순</option>
              <option value="ASC">낮은 순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">전체 종목</p>
          <p className="text-2xl font-bold text-white">{data.length}개</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/10 to-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">필터 적용</p>
          <p className="text-2xl font-bold text-white">{filteredData.length}개</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">주가 데이터 보유</p>
          <p className="text-2xl font-bold text-white">
            {data.filter(d => d.current_price !== null).length}개
          </p>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">순위</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">종목명</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">시장</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">현재가</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">120일 이평</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">이격도</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">1년 매출증가</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">1년 영업이익증가</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredData.map((item, index) => (
                <tr key={`${item.code}-${item.year}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <p className="text-white font-medium">{item.name}</p>
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
                  <td className="px-4 py-3 whitespace-nowrap text-right text-white">
                    {formatNumber(item.current_price, 0)}원
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-slate-300">
                    {formatNumber(item.ma120, 2)}원
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={`px-3 py-1 rounded-full font-semibold ${getDeviationBgColor(item.price_deviation)} ${getDeviationColor(item.price_deviation)}`}>
                      {item.price_deviation !== null ? (
                        <>
                          {item.price_deviation >= 0 ? '+' : ''}{item.price_deviation.toFixed(2)}%
                          {item.price_deviation > 0 ? (
                            <ArrowTrendingUpIcon className="inline w-4 h-4 ml-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </>
                      ) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.revenue_growth_1year || '0') >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatGrowth(item.revenue_growth_1year)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={parseFloat(item.op_profit_growth_1year || '0') >= 0 ? 'text-green-400' : 'text-red-400'}>
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

      {/* 이격도 설명 */}
      <div className="mt-6 bg-gradient-to-br from-blue-600/10 to-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 이격도란?</h3>
        <p className="text-sm text-slate-300">
          현재 주가가 120일 이동평균선 대비 얼마나 떨어져 있는지를 나타냅니다.
        </p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
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
    </div>
  );
}
