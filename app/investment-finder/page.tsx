'use client';

import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

/**
 * 투자 기회 발굴 페이지
 * 
 * 핵심 전략:
 * 1. 컨센서스 개선 기업 (매출↑ AND 영업이익↑)
 * 2. 주가 저평가 (120일 이평선 근처 또는 아래)
 * 3. 결과: 실적 개선 + 저평가 = 투자 기회!
 */

interface InvestmentOpportunity {
  name: string;
  code: string;
  market: string;
  year: number;
  
  // 재무 데이터
  current_revenue: number;
  current_op_profit: number;
  
  // 컨센서스 변화 (과거 대비)
  prev_day_revenue: number | null;
  prev_day_op_profit: number | null;
  revenue_growth_prev_day: string | null;
  op_profit_growth_prev_day: string | null;
  
  onemonth_ago_revenue: number | null;
  onemonth_ago_op_profit: number | null;
  revenue_growth_1month: string | null;
  op_profit_growth_1month: string | null;
  
  // 주가 및 이격도
  current_price: number | null;
  ma120: number | null;
  price_deviation: number | null;
  
  // 투자 신호
  is_highlighted: boolean;
  has_daily_surge: boolean;
}

export default function InvestmentFinderPage() {
  const [data, setData] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 필터 설정
  const [filters, setFilters] = useState({
    // 컨센서스 조건
    minRevenueGrowth1M: 5,      // 1개월 매출 증가율 최소값
    minOpProfitGrowth1M: 5,     // 1개월 영업이익 증가율 최소값
    
    // 이격도 조건
    minDeviation: -20,          // 최소 이격도 (저평가 하한)
    maxDeviation: 0,            // 최대 이격도 (이평선 근처)
    
    // 기타
    market: 'ALL',
    year: '',
    sortBy: 'combined_score'
  });
  
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    consensusImproved: 0,
    undervaluedByPrice: 0,
    finalOpportunities: 0
  });

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (availableYears.length > 0 && !filters.year) {
      setFilters(prev => ({ ...prev, year: availableYears[0].toString() }));
    }
  }, [availableYears]);

  useEffect(() => {
    if (filters.year) {
      fetchData();
    }
  }, [filters.year]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch('/api/available-years');
      const years = await response.json();
      setAvailableYears(years);
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: filters.year,
        sortBy: 'price_deviation',
        sortOrder: 'ASC'
      });
      
      const response = await fetch(`/api/stock-comparison?${params}`);
      const result = await response.json();
      
      // 필터 적용
      const filtered = applyFilters(result);
      setData(filtered);
      
      // 통계 계산
      calculateStats(result, filtered);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (rawData: any[]): InvestmentOpportunity[] => {
    return rawData.filter(item => {
      // 1단계: 컨센서스 개선 필터
      const revenueGrowth1M = parseFloat(item.revenue_growth_1month || '0');
      const opProfitGrowth1M = parseFloat(item.op_profit_growth_1month || '0');
      
      const consensusImproved = 
        revenueGrowth1M >= filters.minRevenueGrowth1M &&
        opProfitGrowth1M >= filters.minOpProfitGrowth1M;
      
      if (!consensusImproved) return false;
      
      // 2단계: 주가 저평가 필터
      if (item.price_deviation === null) return false;
      
      const isUndervalued = 
        item.price_deviation >= filters.minDeviation &&
        item.price_deviation <= filters.maxDeviation;
      
      if (!isUndervalued) return false;
      
      // 3단계: 시장 필터
      if (filters.market !== 'ALL' && item.market !== filters.market) {
        return false;
      }
      
      return true;
    }).map(item => ({
      ...item,
      // 종합 점수 계산
      combined_score: calculateCombinedScore(item)
    })).sort((a, b) => {
      if (filters.sortBy === 'combined_score') {
        return b.combined_score - a.combined_score;
      } else if (filters.sortBy === 'price_deviation') {
        return (a.price_deviation || 0) - (b.price_deviation || 0);
      } else if (filters.sortBy === 'revenue_growth_1month') {
        return parseFloat(b.revenue_growth_1month || '0') - parseFloat(a.revenue_growth_1month || '0');
      }
      return 0;
    });
  };

  const calculateCombinedScore = (item: any): number => {
    // 컨센서스 점수 (0-50점)
    const revenueGrowth = Math.min(parseFloat(item.revenue_growth_1month || '0'), 100);
    const opProfitGrowth = Math.min(parseFloat(item.op_profit_growth_1month || '0'), 100);
    const consensusScore = (revenueGrowth + opProfitGrowth) / 4; // 최대 50점
    
    // 이격도 점수 (0-50점) - 낮을수록 높은 점수
    const deviation = item.price_deviation || 0;
    const deviationScore = Math.max(0, 50 - Math.abs(deviation) * 2); // -10% = 30점, 0% = 50점
    
    return Math.round(consensusScore + deviationScore);
  };

  const calculateStats = (allData: any[], filteredData: any[]) => {
    const consensusImproved = allData.filter(item => {
      const revenueGrowth = parseFloat(item.revenue_growth_1month || '0');
      const opProfitGrowth = parseFloat(item.op_profit_growth_1month || '0');
      return revenueGrowth >= filters.minRevenueGrowth1M && 
             opProfitGrowth >= filters.minOpProfitGrowth1M;
    }).length;
    
    const undervalued = allData.filter(item => {
      return item.price_deviation !== null &&
             item.price_deviation >= filters.minDeviation &&
             item.price_deviation <= filters.maxDeviation;
    }).length;
    
    setStats({
      total: allData.length,
      consensusImproved,
      undervaluedByPrice: undervalued,
      finalOpportunities: filteredData.length
    });
  };

  const formatNumber = (value: number | null, unit: string = '억원'): string => {
    if (value === null) return '-';
    return `${(value / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}${unit}`;
  };

  const formatGrowth = (value: string | null): string => {
    if (!value) return '-';
    if (value === 'Infinity') return '∞';
    const num = parseFloat(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getScoreBadge = (score: number): string => {
    if (score >= 80) return 'S급';
    if (score >= 60) return 'A급';
    if (score >= 40) return 'B급';
    return 'C급';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">투자 기회를 분석하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <SparklesIcon className="w-8 h-8 text-yellow-400 mr-3" />
          <h1 className="text-3xl font-bold text-white">투자 기회 발굴</h1>
        </div>
        <p className="text-slate-400">컨센서스 개선 + 주가 저평가 = 투자 기회!</p>
      </div>

      {/* 전략 설명 */}
      <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center">
          <ChartBarIcon className="w-5 h-5 text-blue-400 mr-2" />
          투자 전략
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-2">1</div>
              <h3 className="font-semibold text-white">컨센서스 개선</h3>
            </div>
            <p className="text-sm text-slate-400">
              매출 ≥ {filters.minRevenueGrowth1M}% AND<br/>
              영업이익 ≥ {filters.minOpProfitGrowth1M}%<br/>
              (1개월 대비)
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-2">2</div>
              <h3 className="font-semibold text-white">주가 저평가</h3>
            </div>
            <p className="text-sm text-slate-400">
              이격도: {filters.minDeviation}% ~ {filters.maxDeviation}%<br/>
              (120일 이평선 근처/아래)
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-2">3</div>
              <h3 className="font-semibold text-white">투자 기회</h3>
            </div>
            <p className="text-sm text-slate-400">
              실적 개선 중이지만<br/>
              주가는 아직 저평가!
            </p>
          </div>
        </div>
      </div>

      {/* 필터 설정 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FunnelIcon className="w-5 h-5 text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-white">필터 설정</h2>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>재검색</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 연도 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">분석 연도</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          
          {/* 시장 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">시장</label>
            <select
              value={filters.market}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, market: e.target.value }));
                fetchData();
              }}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체</option>
              <option value="KOSPI">KOSPI</option>
              <option value="KOSDAQ">KOSDAQ</option>
            </select>
          </div>
          
          {/* 매출 증가율 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              최소 매출 증가율: {filters.minRevenueGrowth1M}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={filters.minRevenueGrowth1M}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, minRevenueGrowth1M: Number(e.target.value) }));
                fetchData();
              }}
              className="w-full"
            />
          </div>
          
          {/* 영업이익 증가율 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              최소 영업이익 증가율: {filters.minOpProfitGrowth1M}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={filters.minOpProfitGrowth1M}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, minOpProfitGrowth1M: Number(e.target.value) }));
                fetchData();
              }}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* 최소 이격도 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              최소 이격도: {filters.minDeviation}%
            </label>
            <input
              type="range"
              min="-30"
              max="0"
              step="5"
              value={filters.minDeviation}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, minDeviation: Number(e.target.value) }));
                fetchData();
              }}
              className="w-full"
            />
          </div>
          
          {/* 최대 이격도 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              최대 이격도: {filters.maxDeviation}%
            </label>
            <input
              type="range"
              min="-10"
              max="10"
              step="2"
              value={filters.maxDeviation}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, maxDeviation: Number(e.target.value) }));
                fetchData();
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">전체 종목</p>
          <p className="text-2xl font-bold text-white">{stats.total}개</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/10 to-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">컨센서스 개선</p>
          <p className="text-2xl font-bold text-green-400">{stats.consensusImproved}개</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">주가 저평가</p>
          <p className="text-2xl font-bold text-blue-400">{stats.undervaluedByPrice}개</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">🎯 투자 기회</p>
          <p className="text-2xl font-bold text-purple-400">{stats.finalOpportunities}개</p>
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
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">등급</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">종합점수</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">현재가</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">이격도</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">매출 증가</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">영업이익 증가</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.map((item, index) => {
                const score = (item as any).combined_score || 0;
                return (
                  <tr key={`${item.code}-${index}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {index < 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-500 text-slate-900 rounded-full font-bold text-sm">
                          {index + 1}
                        </span>
                      ) : (
                        <span className="text-slate-400">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-sm text-slate-400">{item.code} · {item.market}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full font-bold ${getScoreColor(score)}`}>
                        {getScoreBadge(score)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`text-xl font-bold ${getScoreColor(score)}`}>
                        {score}점
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-white">
                      {item.current_price ? `${item.current_price.toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {item.price_deviation !== null ? (
                        <span className={item.price_deviation < 0 ? 'text-blue-400 font-semibold' : 'text-orange-400'}>
                          {item.price_deviation.toFixed(2)}%
                          {item.price_deviation < 0 ? <TrendingDownIcon className="inline w-4 h-4 ml-1" /> : <TrendingUpIcon className="inline w-4 h-4 ml-1" />}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-green-400 font-semibold">
                        {formatGrowth(item.revenue_growth_1month)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-green-400 font-semibold">
                        {formatGrowth(item.op_profit_growth_1month)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {data.length === 0 && (
          <div className="text-center py-12">
            <SparklesIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">조건에 맞는 투자 기회가 없습니다</p>
            <p className="text-sm text-slate-500 mt-2">필터 조건을 조정해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
