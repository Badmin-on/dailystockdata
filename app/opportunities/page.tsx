'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface InvestmentOpportunity {
  company_id: number;
  name: string;
  code: string;
  market: string;
  year: number;
  is_estimate: boolean;

  // 재무 데이터
  current_revenue: number | null;
  current_op_profit: number | null;
  revenue_change_1d: number | null;
  op_profit_change_1d: number | null;
  revenue_change_1m: number | null;
  op_profit_change_1m: number | null;
  revenue_change_3m: number | null;
  op_profit_change_3m: number | null;
  revenue_change_1y: number | null;
  op_profit_change_1y: number | null;

  // 주가 데이터
  current_price: number | null;
  ma_120: number | null;
  divergence_120: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  position_in_52w_range: number | null;

  // 점수
  consensus_score: number;
  divergence_score: number;
  investment_score: number;
  investment_grade: string;
}

export default function OpportunitiesPage() {
  const [data, setData] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    minScore: 50,
    grade: '',
    market: '',
    year: '',
    sortBy: 'investment_score'
  });

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (availableYears.length > 0 && !filters.year) {
      // 최신 년도를 기본값으로 설정
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
      const params = new URLSearchParams();
      if (filters.minScore) params.append('minScore', filters.minScore.toString());
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.market) params.append('market', filters.market);
      if (filters.year) params.append('year', filters.year);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);

      const res = await fetch(`/api/investment-opportunities?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchData();
  };

  const handleReset = () => {
    setFilters({
      minScore: 50,
      grade: '',
      market: '',
      year: availableYears.length > 0 ? availableYears[0].toString() : '',
      sortBy: 'investment_score'
    });
  };

  const formatValue = (val: number | null) => {
    if (val == null) return 'N/A';
    return (val / 100000000).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const formatPercent = (val: number | null) => {
    if (val == null) return 'N/A';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const formatPrice = (val: number | null) => {
    if (val == null) return 'N/A';
    return val.toLocaleString() + '원';
  };

  const getGradeColor = (grade: string) => {
    const colors: { [key: string]: string } = {
      'S급': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      'A급': 'bg-gradient-to-r from-blue-500 to-blue-700 text-white',
      'B급': 'bg-gradient-to-r from-green-500 to-green-700 text-white',
      'C급': 'bg-gradient-to-r from-gray-400 to-gray-600 text-white',
      'D급': 'bg-gradient-to-r from-red-400 to-red-600 text-white'
    };
    return colors[grade] || 'bg-gray-200 text-gray-800';
  };

  const getDivergenceColor = (divergence: number | null) => {
    if (divergence == null) return 'text-gray-500';
    if (divergence <= -5) return 'text-green-600 font-bold';
    if (divergence <= 5) return 'text-blue-600 font-semibold';
    if (divergence <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getChangeColor = (change: number | null) => {
    if (change == null) return 'text-gray-500';
    if (change >= 20) return 'text-red-600 font-bold';
    if (change >= 10) return 'text-red-500 font-semibold';
    if (change >= 5) return 'text-orange-500';
    if (change > 0) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 헤더 */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                🎯 투자 기회 발굴
              </h1>
              <p className="text-sm lg:text-base text-gray-600">
                재무 컨센서스 변화 + 120일 이평선 이격도 기반 투자 분석
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 lg:px-6 lg:py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 shadow-sm transition-all text-sm lg:text-base text-center"
            >
              ← 기본 대시보드
            </Link>
          </div>
        </div>

        {/* 필터 패널 */}
        <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                분석 년도
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                최소 투자 점수
              </label>
              <input
                type="number"
                value={filters.minScore}
                onChange={(e) => handleFilterChange('minScore', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                투자 등급
              </label>
              <select
                value={filters.grade}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">전체 등급</option>
                <option value="S급">S급 (80점 이상)</option>
                <option value="A급">A급 (70-79점)</option>
                <option value="B급">B급 (60-69점)</option>
                <option value="C급">C급 (50-59점)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                시장 구분
              </label>
              <select
                value={filters.market}
                onChange={(e) => handleFilterChange('market', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">전체 시장</option>
                <option value="KOSPI">KOSPI</option>
                <option value="KOSDAQ">KOSDAQ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                정렬 기준
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="investment_score">종합 점수</option>
                <option value="consensus_score">컨센서스 변화 점수</option>
                <option value="divergence_score">이격도 점수</option>
                <option value="revenue_change_1m">매출액 1개월 변화율</option>
                <option value="op_profit_change_1m">영업이익 1개월 변화율</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-4 py-2 lg:px-6 lg:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-all text-sm lg:text-base"
            >
              🔍 필터 적용
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all text-sm lg:text-base"
            >
              초기화
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-4 lg:p-6 text-white shadow-lg">
            <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">S급 기회</div>
            <div className="text-2xl lg:text-3xl font-bold">
              {data.filter(d => d.investment_grade === 'S급').length}개
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 lg:p-6 text-white shadow-lg">
            <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">A급 기회</div>
            <div className="text-2xl lg:text-3xl font-bold">
              {data.filter(d => d.investment_grade === 'A급').length}개
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 lg:p-6 text-white shadow-lg">
            <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">평균 투자 점수</div>
            <div className="text-2xl lg:text-3xl font-bold">
              {data.length > 0
                ? (data.reduce((sum, d) => sum + d.investment_score, 0) / data.length).toFixed(1)
                : '0'}점
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-4 lg:p-6 text-white shadow-lg">
            <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">총 발굴 기업</div>
            <div className="text-2xl lg:text-3xl font-bold">{data.length}개</div>
          </div>
        </div>

        {/* 범례 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 lg:p-4 mb-4 lg:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3 text-xs lg:text-sm">
            <div>
              <span className="font-bold text-blue-900">컨센서스 점수:</span>
              <span className="text-gray-700 ml-2">1개월 변화율 기반 (매출액/영업이익)</span>
            </div>
            <div>
              <span className="font-bold text-blue-900">이격도 점수:</span>
              <span className="text-gray-700 ml-2">120일 이평선 대비 현재가 위치</span>
            </div>
            <div>
              <span className="font-bold text-blue-900">종합 점수:</span>
              <span className="text-gray-700 ml-2">컨센서스(60%) + 이격도(40%)</span>
            </div>
            <div>
              <span className="font-bold text-blue-900">이격도 해석:</span>
              <span className="text-green-600 ml-2 font-semibold">-10~0%: 매수 적기</span>
              <span className="text-gray-600 mx-2">|</span>
              <span className="text-red-600 font-semibold">+15% 이상: 과열</span>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-8 lg:p-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-base lg:text-lg">투자 기회 분석 중...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 lg:p-16 text-center">
            <p className="text-gray-500 text-base lg:text-lg">조건에 맞는 투자 기회가 없습니다</p>
          </div>
        ) : (
          <>
            {/* 모바일 카드뷰 */}
            <div className="lg:hidden space-y-4">
              {data.map((row, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 p-4"
                >
                  {/* 헤더: 순위, 등급, 기업명 */}
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-500 font-bold text-sm">#{idx + 1}</span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(row.investment_grade)}`}>
                          {row.investment_grade}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${row.market === 'KOSPI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {row.market}
                        </span>
                      </div>
                      <p className="text-gray-900 font-bold text-lg leading-tight">
                        {row.name}
                        {row.is_estimate && <span className="ml-2 text-xs text-blue-600">(E)</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {row.code} · {row.year}년
                      </p>
                    </div>
                  </div>

                  {/* 점수 섹션 */}
                  <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-200">
                    <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-3 text-center">
                      <p className="text-xs text-white opacity-90 font-semibold mb-1">투자점수</p>
                      <p className="text-2xl font-bold text-white">{row.investment_score}점</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-white opacity-90 font-semibold mb-1">컨센서스</p>
                      <p className="text-xl font-bold text-white">{row.consensus_score}점</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-white opacity-90 font-semibold mb-1">이격도</p>
                      <p className="text-xl font-bold text-white">{row.divergence_score}점</p>
                    </div>
                  </div>

                  {/* 주가 정보 */}
                  {row.current_price && (
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">현재가</p>
                          <p className="text-sm font-bold text-gray-900">{formatPrice(row.current_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">120일평</p>
                          <p className="text-sm font-semibold text-gray-600">{formatPrice(row.ma_120)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">이격률</p>
                          <p className={`text-sm font-bold ${getDivergenceColor(row.divergence_120)}`}>
                            {formatPercent(row.divergence_120)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 변화율 섹션 */}
                  <div className="space-y-2">
                    {/* 1일 변화 */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                      <p className="text-xs text-red-700 font-semibold mb-1.5">1일 변화율</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">매출: </span>
                          <span className={`font-semibold ${getChangeColor(row.revenue_change_1d)}`}>
                            {formatPercent(row.revenue_change_1d)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">영익: </span>
                          <span className={`font-semibold ${getChangeColor(row.op_profit_change_1d)}`}>
                            {formatPercent(row.op_profit_change_1d)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 1개월 변화 */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                      <p className="text-xs text-orange-700 font-semibold mb-1.5">1개월 변화율</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">매출: </span>
                          <span className={`font-semibold ${getChangeColor(row.revenue_change_1m)}`}>
                            {formatPercent(row.revenue_change_1m)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">영익: </span>
                          <span className={`font-semibold ${getChangeColor(row.op_profit_change_1m)}`}>
                            {formatPercent(row.op_profit_change_1m)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3개월 변화 */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                      <p className="text-xs text-purple-700 font-semibold mb-1.5">3개월 변화율</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">매출: </span>
                          <span className={`font-semibold ${getChangeColor(row.revenue_change_3m)}`}>
                            {formatPercent(row.revenue_change_3m)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">영익: </span>
                          <span className={`font-semibold ${getChangeColor(row.op_profit_change_3m)}`}>
                            {formatPercent(row.op_profit_change_3m)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 1년 변화 */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                      <p className="text-xs text-indigo-700 font-semibold mb-1.5">1년 변화율</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">매출: </span>
                          <span className={`font-semibold ${getChangeColor(row.revenue_change_1y)}`}>
                            {formatPercent(row.revenue_change_1y)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">영익: </span>
                          <span className={`font-semibold ${getChangeColor(row.op_profit_change_1y)}`}>
                            {formatPercent(row.op_profit_change_1y)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크톱 테이블 */}
            <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-700 flex items-center justify-between">
                <span className="font-semibold">💡 팁: 테이블을 좌우로 스크롤하여 모든 데이터를 확인하세요</span>
                <span className="text-xs">→</span>
              </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <style jsx>{`
                .sticky {
                  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
                }
              `}</style>
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 border-b-2 border-gray-300 min-w-[50px]">
                      순위
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 border-b-2 border-gray-300 min-w-[90px]">
                      등급
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 border-b-2 border-gray-300 min-w-[150px]">
                      기업명
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300">
                      종목코드
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300">
                      시장
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300">
                      연도
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-yellow-50">
                      투자점수
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-blue-50">
                      컨센서스
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-green-50">
                      이격도
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-bold text-gray-700 border-b-2 border-gray-300">
                      현재가
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-bold text-gray-700 border-b-2 border-gray-300">
                      120일평
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300">
                      이격률
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-red-50">
                      1D 매출
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-red-50">
                      1D 영업익
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-orange-50">
                      1M 매출
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-orange-50">
                      1M 영업익
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-purple-50">
                      3M 매출
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-purple-50">
                      3M 영업익
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-indigo-50">
                      1Y 매출
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 border-b-2 border-gray-300 bg-indigo-50">
                      1Y 영업익
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-center font-bold text-gray-700 text-xs sticky left-0 bg-white z-10 whitespace-nowrap min-w-[50px]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 sticky left-[50px] bg-white z-10 min-w-[90px]">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getGradeColor(row.investment_grade)}`}>
                          {row.investment_grade}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-left font-semibold text-gray-900 text-sm sticky left-[140px] bg-white z-10 min-w-[150px] whitespace-nowrap">
                        {row.name}
                        {row.is_estimate && <span className="ml-2 text-xs text-blue-600">(E)</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600 font-mono text-xs whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${row.market === 'KOSPI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {row.market}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-700">
                          {row.year}년
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center bg-yellow-50 whitespace-nowrap">
                        <span className="text-sm font-bold text-yellow-700">
                          {row.investment_score}점
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center bg-blue-50 whitespace-nowrap">
                        <span className="font-semibold text-blue-700 text-xs">
                          {row.consensus_score}점
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center bg-green-50 whitespace-nowrap">
                        <span className="font-semibold text-green-700 text-xs">
                          {row.divergence_score}점
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs whitespace-nowrap">
                        {formatPrice(row.current_price)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 text-xs whitespace-nowrap">
                        {formatPrice(row.ma_120)}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${getDivergenceColor(row.divergence_120)} whitespace-nowrap`}>
                        {formatPercent(row.divergence_120)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-red-50 ${getChangeColor(row.revenue_change_1d)} whitespace-nowrap`}>
                        {formatPercent(row.revenue_change_1d)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-red-50 ${getChangeColor(row.op_profit_change_1d)} whitespace-nowrap`}>
                        {formatPercent(row.op_profit_change_1d)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-orange-50 ${getChangeColor(row.revenue_change_1m)} whitespace-nowrap`}>
                        {formatPercent(row.revenue_change_1m)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-orange-50 ${getChangeColor(row.op_profit_change_1m)} whitespace-nowrap`}>
                        {formatPercent(row.op_profit_change_1m)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-purple-50 ${getChangeColor(row.revenue_change_3m)} whitespace-nowrap`}>
                        {formatPercent(row.revenue_change_3m)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-purple-50 ${getChangeColor(row.op_profit_change_3m)} whitespace-nowrap`}>
                        {formatPercent(row.op_profit_change_3m)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-indigo-50 ${getChangeColor(row.revenue_change_1y)} whitespace-nowrap`}>
                        {formatPercent(row.revenue_change_1y)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold bg-indigo-50 ${getChangeColor(row.op_profit_change_1y)} whitespace-nowrap`}>
                        {formatPercent(row.op_profit_change_1y)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
