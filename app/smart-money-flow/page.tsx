'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SmartMoneyFlow {
  company_id: number;
  name: string;
  code: string;
  market: string;

  // 주가 데이터
  current_price: number | null;
  change_rate: number | null;
  ma_120: number | null;
  divergence_120: number | null;

  // 재무 데이터
  current_revenue: number | null;
  current_op_profit: number | null;
  revenue_change_1m: number | null;
  op_profit_change_1m: number | null;

  // 점수
  consensus_score: number;
  divergence_score: number;
  base_investment_score: number;

  // 거래량 지표
  rvol: number;
  vol_avg_20d: number;
  vol_avg_5d: number;
  latest_volume: number;
  prev_5d_avg_volume: number | null;
  acc_days_10d: number | null;
  volume_trend_pct: number | null;
  volume_score: number;
  smart_money_score: number;
  volume_pattern: string;
  grade: string;
  last_updated: string;
}

interface ApiResponse {
  success: boolean;
  data: SmartMoneyFlow[];
  stats: {
    total: number;
    s_grade: number;
    a_grade: number;
    b_grade: number;
    c_grade: number;
    avg_rvol: string;
    avg_score: string;
    strong_accumulation: number;
    moderate_flow: number;
    increasing_interest: number;
  };
}

export default function SmartMoneyFlowPage() {
  const [data, setData] = useState<SmartMoneyFlow[]>([]);
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minScore: 0,
    market: '',
    minRvol: 1.2,
    maxRvol: 999,
    grade: '',
    pattern: '',
    sortBy: 'smart_money_score',
    sortOrder: 'desc',
    limit: 100
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.minScore) params.append('minScore', filters.minScore.toString());
      if (filters.market) params.append('market', filters.market);
      if (filters.minRvol) params.append('minRvol', filters.minRvol.toString());
      if (filters.maxRvol < 999) params.append('maxRvol', filters.maxRvol.toString());
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.pattern) params.append('pattern', filters.pattern);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.limit) params.append('limit', filters.limit.toString());

      const res = await fetch(`/api/smart-money-flow?${params.toString()}`);
      const result: ApiResponse = await res.json();

      if (result.success) {
        setData(result.data);
        setStats(result.stats);
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
      minScore: 0,
      market: '',
      minRvol: 1.2,
      maxRvol: 999,
      grade: '',
      pattern: '',
      sortBy: 'smart_money_score',
      sortOrder: 'desc',
      limit: 100
    });
  };

  const formatPrice = (val: number | null) => {
    if (val == null) return 'N/A';
    return val.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '원';
  };

  const formatPercent = (val: number | null) => {
    if (val == null) return 'N/A';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const formatVolume = (val: number | null) => {
    if (val == null) return 'N/A';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  const getGradeColor = (grade: string) => {
    const colors: { [key: string]: string } = {
      'S': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      'A': 'bg-gradient-to-r from-blue-500 to-blue-700 text-white',
      'B': 'bg-gradient-to-r from-green-500 to-green-700 text-white',
      'C': 'bg-gradient-to-r from-gray-500 to-gray-700 text-white',
    };
    return colors[grade] || 'bg-gray-600 text-white';
  };

  const getPatternColor = (pattern: string) => {
    if (pattern === 'Strong Accumulation') return 'text-green-400 font-bold';
    if (pattern === 'Moderate Flow') return 'text-blue-400 font-semibold';
    if (pattern === 'Increasing Interest') return 'text-yellow-400';
    if (pattern === 'Volume Dry Up') return 'text-red-400';
    return 'text-gray-400';
  };

  const getPatternIcon = (pattern: string) => {
    if (pattern === 'Strong Accumulation') return '🟢';
    if (pattern === 'Moderate Flow') return '🟡';
    if (pattern === 'Increasing Interest') return '📈';
    if (pattern === 'Volume Dry Up') return '🔴';
    return '⚪';
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-gray-100 p-4 lg:p-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 헤더 */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                🔥 Smart Money Flow
              </h1>
              <p className="text-sm lg:text-base text-gray-400">
                컨센서스 개선 + 저평가 + 거래량 증가 조합으로 기관/외국인 자금 유입 조짐 감지
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 lg:px-6 lg:py-3 bg-[#12151d] border-2 border-gray-700 rounded-lg hover:bg-gray-800 font-semibold text-gray-300 shadow-lg transition-all text-sm lg:text-base text-center"
            >
              ← 대시보드
            </Link>
          </div>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl p-4 lg:p-6 shadow-lg">
              <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">S급 기회</div>
              <div className="text-2xl lg:text-3xl font-bold">{stats.s_grade}개</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 lg:p-6 shadow-lg">
              <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">A급 기회</div>
              <div className="text-2xl lg:text-3xl font-bold">{stats.a_grade}개</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 lg:p-6 shadow-lg">
              <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">평균 RVOL</div>
              <div className="text-2xl lg:text-3xl font-bold">{stats.avg_rvol}x</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-4 lg:p-6 shadow-lg">
              <div className="text-xs lg:text-sm font-semibold opacity-90 mb-2">총 발굴 기업</div>
              <div className="text-2xl lg:text-3xl font-bold">{stats.total}개</div>
            </div>
          </div>
        )}

        {/* 필터 패널 */}
        <div className="bg-[#12151d] rounded-xl shadow-lg p-4 lg:p-6 mb-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-4">필터 옵션</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                최소 점수
              </label>
              <input
                type="number"
                value={filters.minScore}
                onChange={(e) => handleFilterChange('minScore', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-[#0b0d12] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                시장
              </label>
              <select
                value={filters.market}
                onChange={(e) => handleFilterChange('market', e.target.value)}
                className="w-full px-4 py-2 bg-[#0b0d12] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="">전체</option>
                <option value="KOSPI">KOSPI</option>
                <option value="KOSDAQ">KOSDAQ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                등급
              </label>
              <select
                value={filters.grade}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                className="w-full px-4 py-2 bg-[#0b0d12] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="">전체</option>
                <option value="S">S급</option>
                <option value="A">A급</option>
                <option value="B">B급</option>
                <option value="C">C급</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                거래량 패턴
              </label>
              <select
                value={filters.pattern}
                onChange={(e) => handleFilterChange('pattern', e.target.value)}
                className="w-full px-4 py-2 bg-[#0b0d12] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="">전체</option>
                <option value="Strong Accumulation">Strong Accumulation</option>
                <option value="Moderate Flow">Moderate Flow</option>
                <option value="Increasing Interest">Increasing Interest</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-4 py-2 lg:px-6 lg:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg transition-all text-sm lg:text-base"
            >
              🔍 필터 적용
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-semibold transition-all text-sm lg:text-base"
            >
              초기화
            </button>
          </div>
        </div>

        {/* 데이터 표시 */}
        {loading ? (
          <div className="bg-[#12151d] rounded-xl shadow-lg p-8 lg:p-16 text-center border border-gray-800">
            <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400 text-base lg:text-lg">Smart Money Flow 분석 중...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-[#12151d] rounded-xl shadow-lg p-8 lg:p-16 text-center border border-gray-800">
            <p className="text-gray-400 text-base lg:text-lg">조건에 맞는 기업이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-r from-[#12151d] to-[#1a1d26] rounded-xl shadow-lg border border-gray-800 p-4 lg:p-6 hover:border-gray-700 transition-all"
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-800">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-500 font-bold text-sm">#{idx + 1}</span>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(item.grade)}`}>
                        {item.grade}급
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${item.market === 'KOSPI' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'}`}>
                        {item.market}
                      </span>
                      <span className={`text-sm ${getPatternColor(item.volume_pattern)}`}>
                        {getPatternIcon(item.volume_pattern)} {item.volume_pattern}
                      </span>
                    </div>
                    <p className="text-white font-bold text-xl mb-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">{item.code}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">
                      {item.smart_money_score}점
                    </div>
                    <div className="text-xs text-gray-400">Smart Money Score</div>
                  </div>
                </div>

                {/* 점수 3개 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-900/30 rounded-lg p-3 text-center border border-blue-800">
                    <p className="text-xs text-blue-300 mb-1">컨센서스</p>
                    <p className="text-xl font-bold text-blue-400">{item.consensus_score}점</p>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-3 text-center border border-green-800">
                    <p className="text-xs text-green-300 mb-1">이격도</p>
                    <p className="text-xl font-bold text-green-400">{item.divergence_score}점</p>
                  </div>
                  <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-800">
                    <p className="text-xs text-purple-300 mb-1">거래량</p>
                    <p className="text-xl font-bold text-purple-400">{item.volume_score}점</p>
                  </div>
                </div>

                {/* 거래량 정보 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-3 bg-[#0b0d12] rounded-lg border border-gray-800">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">RVOL</p>
                    <p className="text-lg font-bold text-yellow-400">{item.rvol.toFixed(2)}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">최근 5일 평균</p>
                    <p className="text-sm font-semibold text-gray-300">{formatVolume(item.vol_avg_5d)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">20일 평균</p>
                    <p className="text-sm font-semibold text-gray-300">{formatVolume(item.vol_avg_20d)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Acc Days (10d)</p>
                    <p className="text-sm font-semibold text-green-400">{item.acc_days_10d || 0}일</p>
                  </div>
                </div>

                {/* 주가 및 재무 정보 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-300 mb-2">📊 주가 정보</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">현재가:</span>
                      <span className="text-white font-semibold">{formatPrice(item.current_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">120일 평균:</span>
                      <span className="text-gray-300">{formatPrice(item.ma_120)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">이격률:</span>
                      <span className={item.divergence_120 && item.divergence_120 < 0 ? 'text-green-400 font-bold' : 'text-yellow-400 font-semibold'}>
                        {formatPercent(item.divergence_120)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-300 mb-2">📈 재무 변화 (1M)</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">매출액 변화:</span>
                      <span className={item.revenue_change_1m && item.revenue_change_1m > 0 ? 'text-green-400 font-bold' : 'text-gray-400'}>
                        {formatPercent(item.revenue_change_1m)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">영업이익 변화:</span>
                      <span className={item.op_profit_change_1m && item.op_profit_change_1m > 0 ? 'text-green-400 font-bold' : 'text-gray-400'}>
                        {formatPercent(item.op_profit_change_1m)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
