'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function DateComparisonPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    metric: 'operating_profit',
    minGrowth: 0,
    year: '2025'  // 기본값: 2025년
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableYears] = useState<number[]>([2024, 2025, 2026, 2027, 2028]);

  useEffect(() => {
    console.log('🔍 Fetching available dates...');
    fetch('/api/available-dates')
      .then(res => {
        console.log('📡 Response status:', res.status);
        return res.json();
      })
      .then(dates => {
        console.log('📅 Available dates:', dates);
        console.log('📊 Total dates:', dates?.length || 0);
        setAvailableDates(dates);
        if (dates.length >= 2) {
          setFilters(prev => ({ ...prev, startDate: dates[1], endDate: dates[0] }));
        }
      })
      .catch(error => {
        console.error('❌ Error fetching dates:', error);
      });
  }, []);

  const handleSearch = async () => {
    if (!filters.startDate || !filters.endDate) {
      alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        metric: filters.metric,
        minGrowth: filters.minGrowth.toString(),
        year: filters.year
      });
      const response = await fetch(`/api/date-comparison?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">날짜별 컨센서스 변화 추적</h1>
          </div>
          <p className="text-gray-600">
            두 날짜를 선택하여 기업들의 컨센서스(예상치) 변화를 추적하세요.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">시작 날짜</label>
              <select
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">선택하세요</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">종료 날짜</label>
              <select
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">선택하세요</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비교 년도</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비교 지표</label>
              <select
                value={filters.metric}
                onChange={(e) => setFilters(prev => ({ ...prev, metric: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="operating_profit">영업이익</option>
                <option value="revenue">매출액</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            {loading ? '분석 중...' : '컨센서스 변화 분석'}
          </button>
        </div>

        {data && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">분석 결과: {data.totalCompanies}개 기업</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">기업명</th>
                    <th className="px-4 py-2 text-center">코드</th>
                    <th className="px-4 py-2 text-center">년도</th>
                    <th className="px-4 py-2 text-right">시작값</th>
                    <th className="px-4 py-2 text-right">종료값</th>
                    <th className="px-4 py-2 text-center">성장률</th>
                  </tr>
                </thead>
                <tbody>
                  {data.companies?.map((c: any, index: number) => (
                    <tr key={`${c.code}-${index}`} className="border-t">
                      <td className="px-4 py-2">{c.name}</td>
                      <td className="px-4 py-2 text-center">{c.code}</td>
                      <td className="px-4 py-2 text-center font-medium text-blue-600">{c.year}</td>
                      <td className="px-4 py-2 text-right">{c.startValue?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{c.endValue?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={c.growthRate >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {c.growthRate?.toFixed(2)}%
                        </span>
                      </td>
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
