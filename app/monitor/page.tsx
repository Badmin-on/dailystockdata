'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DataStatus {
  success: boolean;
  timestamp: string;
  overall: {
    total_companies: number;
    total_financial_records: number;
    total_price_records: number;
    companies_with_prices: number;
    avg_prices_per_company: number;
    estimated_companies_with_120day: number;
    latest_price_date: string | null;
    latest_financial_date: string | null;
  };
  markets: {
    kospi: { total: number };
    kosdaq: { total: number };
  };
  collection_progress: {
    financial_coverage: string;
    price_collection_rate: string;
    avg_days_collected: number;
    estimated_ma120_ready_rate: string;
    can_analyze_investments: boolean;
  };
  next_steps: {
    need_more_price_data: boolean;
    days_until_120day: number;
    recommendation: string;
  };
}

interface InvestmentOpportunity {
  company_id: number;
  name: string;
  code: string;
  market: string;
  investment_score: number;
  investment_grade: string;
  consensus_score: number;
  divergence_score: number;
  current_price: number | null;
  ma_120: number | null;
  divergence_120: number | null;
  revenue_change_1m: number | null;
  op_profit_change_1m: number | null;
}

export default function MonitorPage() {
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 데이터 상태 확인
      const statusRes = await fetch('/api/data-status');
      const statusData = await statusRes.json();
      setDataStatus(statusData);

      // 투자 기회 데이터 (상위 50개)
      const oppRes = await fetch('/api/investment-opportunities?limit=50&sortBy=investment_score');
      const oppData = await oppRes.json();
      if (oppData.success) {
        setOpportunities(oppData.data);
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshViews = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/refresh-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
        // Authorization 헤더 제거 - 브라우저에서는 인증 없이 호출
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ View 갱신 완료! 데이터를 다시 로드합니다.');
        await fetchAllData();
      } else {
        alert('❌ View 갱신 실패: ' + data.error);
      }
    } catch (error) {
      alert('❌ View 갱신 중 오류 발생');
    } finally {
      setRefreshing(false);
    }
  };

  const formatPrice = (val: number | null) => {
    if (val == null) return 'N/A';
    return val.toLocaleString() + '원';
  };

  const formatPercent = (val: number | null) => {
    if (val == null) return 'N/A';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
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

  const getDivergenceColor = (val: number | null) => {
    if (val == null) return 'text-gray-500';
    return val >= 0 ? 'text-red-600' : 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">데이터 분석 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                📊 YoonStock Pro - 성장 기업 모니터링
              </h1>
              <p className="text-gray-600">
                실시간 데이터 수집 현황 및 투자 기회 분석 대시보드
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/opportunities"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-all"
              >
                🎯 투자 기회
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 shadow-sm transition-all"
              >
                📈 기본 대시보드
              </Link>
            </div>
          </div>
        </div>

        {/* 데이터 수집 현황 */}
        {dataStatus && (
          <>
            {/* 핵심 지표 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white shadow-lg">
                <div className="text-sm font-semibold opacity-90 mb-2">총 기업 수</div>
                <div className="text-3xl font-bold">{dataStatus.overall.total_companies.toLocaleString()}개</div>
                <div className="text-xs opacity-75 mt-2">
                  KOSPI {dataStatus.markets.kospi.total} | KOSDAQ {dataStatus.markets.kosdaq.total}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg">
                <div className="text-sm font-semibold opacity-90 mb-2">재무 데이터</div>
                <div className="text-3xl font-bold">{dataStatus.overall.total_financial_records.toLocaleString()}건</div>
                <div className="text-xs opacity-75 mt-2">
                  커버리지: {dataStatus.collection_progress.financial_coverage}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white shadow-lg">
                <div className="text-sm font-semibold opacity-90 mb-2">주가 데이터</div>
                <div className="text-3xl font-bold">{dataStatus.overall.total_price_records.toLocaleString()}건</div>
                <div className="text-xs opacity-75 mt-2">
                  {dataStatus.overall.companies_with_prices}개 기업 수집 완료
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-sm font-semibold opacity-90 mb-2">120일 이평선</div>
                <div className="text-3xl font-bold">
                  {dataStatus.overall.estimated_companies_with_120day}개
                </div>
                <div className="text-xs opacity-75 mt-2">
                  분석 가능: {dataStatus.collection_progress.estimated_ma120_ready_rate}
                </div>
              </div>
            </div>

            {/* 수집 진행률 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📈 데이터 수집 진행률</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 주가 데이터 수집 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">주가 데이터 수집</span>
                    <span className="text-sm font-bold text-purple-600">
                      {dataStatus.collection_progress.price_collection_rate}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-700 h-4 rounded-full transition-all"
                      style={{ width: dataStatus.collection_progress.price_collection_rate }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    평균 {dataStatus.collection_progress.avg_days_collected}일치 데이터 보유
                  </p>
                </div>

                {/* 120일 이평선 준비율 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">120일 이평선 분석 가능</span>
                    <span className="text-sm font-bold text-green-600">
                      {dataStatus.collection_progress.estimated_ma120_ready_rate}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-700 h-4 rounded-full transition-all"
                      style={{ width: dataStatus.collection_progress.estimated_ma120_ready_rate }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {dataStatus.next_steps.need_more_price_data
                      ? `약 ${dataStatus.next_steps.days_until_120day}일 후 완전 분석 가능`
                      : '✅ 분석 준비 완료'}
                  </p>
                </div>
              </div>

              {/* 최근 수집 날짜 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-1">최근 재무 데이터</div>
                  <div className="text-lg font-bold text-blue-700">
                    {dataStatus.overall.latest_financial_date || 'N/A'}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm font-semibold text-purple-900 mb-1">최근 주가 데이터</div>
                  <div className="text-lg font-bold text-purple-700">
                    {dataStatus.overall.latest_price_date || 'N/A'}
                  </div>
                </div>
              </div>

              {/* 권장 사항 */}
              <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-yellow-900 mb-1">💡 권장 사항</div>
                    <p className="text-sm text-yellow-800">{dataStatus.next_steps.recommendation}</p>
                  </div>
                  <button
                    onClick={handleRefreshViews}
                    disabled={refreshing}
                    className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all ${
                      refreshing
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    {refreshing ? '갱신 중...' : '🔄 View 갱신'}
                  </button>
                </div>
              </div>
            </div>

            {/* 상위 투자 기회 (Top 20) */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">🔥 상위 투자 기회 (Top 20)</h2>
                <Link
                  href="/opportunities"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  전체 보기 →
                </Link>
              </div>

              {opportunities.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">투자 기회 데이터가 없습니다</p>
                  <p className="text-sm text-gray-400 mt-2">View 갱신 후 데이터가 표시됩니다</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">순위</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">등급</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">기업명</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">시장</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 bg-yellow-50">투자점수</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 bg-blue-50">컨센서스</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 bg-green-50">이격도</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">현재가</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">이격률</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">1M 매출</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">1M 영업익</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {opportunities.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(row.investment_grade)}`}>
                              {row.investment_grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              row.market === 'KOSPI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {row.market}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center bg-yellow-50 font-bold text-yellow-700">
                            {row.investment_score}점
                          </td>
                          <td className="px-4 py-3 text-center bg-blue-50 font-semibold text-blue-700">
                            {row.consensus_score}점
                          </td>
                          <td className="px-4 py-3 text-center bg-green-50 font-semibold text-green-700">
                            {row.divergence_score}점
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatPrice(row.current_price)}
                          </td>
                          <td className={`px-4 py-3 text-center font-semibold ${getDivergenceColor(row.divergence_120)}`}>
                            {formatPercent(row.divergence_120)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-orange-600">
                            {formatPercent(row.revenue_change_1m)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-red-600">
                            {formatPercent(row.op_profit_change_1m)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* 업데이트 타임스탬프 */}
        {dataStatus && (
          <div className="mt-6 text-center text-sm text-gray-500">
            마지막 업데이트: {new Date(dataStatus.timestamp).toLocaleString('ko-KR')}
          </div>
        )}
      </div>
    </div>
  );
}
