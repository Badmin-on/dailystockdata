'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Company {
  id: number;
  name: string;
  code: string;
  market: string;
  year: number;
  startValue: number;
  endValue: number;
  growthRate: number;
  absoluteChange: number;
  valueUnit: string;
  isLossToProfit: boolean;
  startIsEstimate: boolean;
  endIsEstimate: boolean;
}

interface ComparisonResult {
  actualStartDate: string;
  actualEndDate: string;
  requestedStartDate: string;
  requestedEndDate: string;
  metric: string;
  minGrowth: number;
  totalCompanies: number;
  companies: Company[];
}

export default function DateComparisonPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metric, setMetric] = useState<'revenue' | 'operating_profit'>('operating_profit');
  const [minGrowth, setMinGrowth] = useState(-1000);
  const [year, setYear] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [limit, setLimit] = useState(100);

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [startMonthDates, setStartMonthDates] = useState<string[]>([]);
  const [endMonthDates, setEndMonthDates] = useState<string[]>([]);

  useEffect(() => {
    fetchAvailableYears();
    fetchAvailableDates();
  }, []);

  // 시작 날짜의 월이 변경되면 해당 월의 데이터 날짜 가져오기
  useEffect(() => {
    if (startDate) {
      const [year, month] = startDate.split('-');
      fetchMonthDates(parseInt(year), parseInt(month), 'start');
    }
  }, [startDate]);

  // 종료 날짜의 월이 변경되면 해당 월의 데이터 날짜 가져오기
  useEffect(() => {
    if (endDate) {
      const [year, month] = endDate.split('-');
      fetchMonthDates(parseInt(year), parseInt(month), 'end');
    }
  }, [endDate]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch('/api/available-years');
      const years = await response.json();
      setAvailableYears(years);
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      // 재무 데이터의 최근 날짜 가져오기
      const response = await fetch('/api/data-status');
      const data = await response.json();

      if (data.success && data.overall.latest_financial_date) {
        const latest = new Date(data.overall.latest_financial_date);
        const dates: string[] = [];

        // 최근 50개 날짜 생성 (대략적으로)
        for (let i = 0; i < 365; i += 7) {
          const date = new Date(latest);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }

        setAvailableDates(dates);

        // 기본값 설정 (1개월 전 ~ 최근)
        // useEffect가 자동으로 해당 월의 데이터를 가져옴
        if (!startDate) {
          const oneMonthAgo = new Date(latest);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          setStartDate(oneMonthAgo.toISOString().split('T')[0]);
        }
        if (!endDate) {
          setEndDate(latest.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching dates:', error);
    }
  };

  const fetchMonthDates = async (year: number, month: number, type: 'start' | 'end') => {
    try {
      const response = await fetch(`/api/available-financial-dates?year=${year}&month=${month}`);
      const data = await response.json();

      if (data.success && data.dates) {
        if (type === 'start') {
          setStartMonthDates(data.dates);
        } else {
          setEndMonthDates(data.dates);
        }
      }
    } catch (error) {
      console.error('Error fetching month dates:', error);
    }
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      setError('시작 날짜와 종료 날짜를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        metric,
        minGrowth: minGrowth.toString(),
        sortOrder,
        limit: limit.toString()
      });
      
      if (year) {
        params.append('year', year);
      }

      const response = await fetch(`/api/date-comparison?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">날짜별 비교 분석</h1>
        <p className="text-slate-400">특정 기간 동안의 재무 데이터 변화를 비교합니다</p>
      </div>

      {/* 검색 필터 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-6 mb-6">
        <div className="flex items-center mb-4">
          <FunnelIcon className="w-5 h-5 text-blue-400 mr-2" />
          <h2 className="text-lg font-semibold text-white">검색 조건</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">시작 날짜</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            {startMonthDates.length > 0 && (
              <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">📅 데이터 수집일:</p>
                <div className="flex flex-wrap gap-1">
                  {startMonthDates.map((date) => {
                    const day = new Date(date).getDate();
                    const isSelected = startDate === date;
                    return (
                      <button
                        key={date}
                        onClick={() => setStartDate(date)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {day}일
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">종료 날짜</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            {endMonthDates.length > 0 && (
              <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">📅 데이터 수집일:</p>
                <div className="flex flex-wrap gap-1">
                  {endMonthDates.map((date) => {
                    const day = new Date(date).getDate();
                    const isSelected = endDate === date;
                    return (
                      <button
                        key={date}
                        onClick={() => setEndDate(date)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {day}일
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">비교 지표</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as 'revenue' | 'operating_profit')}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="revenue">매출액</option>
              <option value="operating_profit">영업이익</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">연도 (선택)</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">전체</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">최소 증감률 (%)</label>
            <input
              type="number"
              value={minGrowth}
              onChange={(e) => setMinGrowth(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">정렬 순서</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="DESC">증감률 높은 순</option>
              <option value="ASC">증감률 낮은 순</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">표시 개수</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={10}
              max={500}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              검색 중...
            </>
          ) : (
            <>
              <CalendarDaysIcon className="w-5 h-5 mr-2" />
              비교 분석 시작
            </>
          )}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="space-y-6">
          {/* 요약 정보 */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">분석 기간</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(result.actualStartDate).toLocaleDateString('ko-KR')} ~ {new Date(result.actualEndDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">비교 지표</p>
                <p className="text-lg font-semibold text-white">{result.metric}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">검색 결과</p>
                <p className="text-lg font-semibold text-white">{result.totalCompanies}개 기업</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">최소 증감률</p>
                <p className="text-lg font-semibold text-white">{result.minGrowth}% 이상</p>
              </div>
            </div>
          </div>

          {/* 결과 테이블 */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">순위</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">기업명</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">시장</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">시작값</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">종료값</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">증감액</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">증감률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {result.companies.map((company, index) => (
                    <tr key={company.code} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-400 font-medium">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-white font-medium">{company.name}</p>
                          <p className="text-sm text-slate-400">{company.code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          company.market === 'KOSPI' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {company.market}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                        {company.startValue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300">
                        {company.endValue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={company.absoluteChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {company.absoluteChange >= 0 ? '+' : ''}{company.absoluteChange.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {company.growthRate >= 0 ? (
                            <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`font-semibold ${company.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {company.growthRate >= 0 ? '+' : ''}{company.growthRate.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
