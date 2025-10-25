'use client';

import { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface CollectionStatus {
  success: boolean;
  timestamp: string;
  data: {
    companies: {
      total: number;
      with_financial_data: number;
      with_price_data: number;
      kospi: number;
      kosdaq: number;
    };
    financial_data: {
      companies_count: number;
      total_records: number;
      latest_update: string | null;
      progress_percent: number;
      target: number;
    };
    price_data: {
      companies_count: number;
      total_records: number;
      latest_update: string | null;
      progress_percent: number;
      target: number;
    };
    overall: {
      target_companies: number;
      financial_coverage: string;
      price_coverage: string;
      status: 'COMPLETE' | 'IN_PROGRESS';
    };
  };
}

export default function CollectionStatusPage() {
  const [status, setStatus] = useState<CollectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/collect-data/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 10000); // 10초마다 갱신

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (percent: number) => {
    if (percent >= 100) return 'text-green-400';
    if (percent >= 50) return 'text-blue-400';
    if (percent >= 25) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getProgressBarColor = (percent: number) => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 50) return 'bg-blue-500';
    if (percent >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">상태 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ 오류 발생</div>
          <p className="text-slate-400">{error}</p>
          <button
            onClick={fetchStatus}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const financialPercent = status.data.financial_data.progress_percent;
  const pricePercent = status.data.price_data.progress_percent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              📊 데이터 수집 현황
            </h1>
            <p className="text-slate-400 mt-2">실시간 데이터 수집 진행 상황 모니터링</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-500">마지막 업데이트</p>
              <p className="text-slate-300 font-mono text-sm">
                {lastUpdate.toLocaleTimeString('ko-KR')}
              </p>
            </div>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {autoRefresh ? '🔄 자동 갱신 ON' : '⏸️ 자동 갱신 OFF'}
            </button>
            
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`h-5 w-5 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>

        {/* Overall Status Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">전체 현황</h2>
            <div className={`px-4 py-2 rounded-full font-bold ${
              status.data.overall.status === 'COMPLETE'
                ? 'bg-green-500/20 text-green-400 border border-green-500'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500 animate-pulse'
            }`}>
              {status.data.overall.status === 'COMPLETE' ? '✅ 수집 완료' : '🔄 수집 진행 중'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Companies */}
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">전체 기업 수</p>
              <p className="text-4xl font-bold text-white mb-1">
                {status.data.companies.total.toLocaleString()}
              </p>
              <div className="flex gap-4 text-sm mt-4">
                <span className="text-blue-400">
                  KOSPI: {status.data.companies.kospi}
                </span>
                <span className="text-purple-400">
                  KOSDAQ: {status.data.companies.kosdaq}
                </span>
              </div>
            </div>

            {/* Financial Coverage */}
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">재무 데이터 수집률</p>
              <p className={`text-4xl font-bold mb-1 ${getStatusColor(financialPercent)}`}>
                {status.data.overall.financial_coverage}
              </p>
              <p className="text-slate-500 text-sm">
                {status.data.financial_data.companies_count} / {status.data.financial_data.target} 기업
              </p>
            </div>

            {/* Price Coverage */}
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">주가 데이터 수집률</p>
              <p className={`text-4xl font-bold mb-1 ${getStatusColor(pricePercent)}`}>
                {status.data.overall.price_coverage}
              </p>
              <p className="text-slate-500 text-sm">
                {status.data.price_data.companies_count} / {status.data.price_data.target} 기업
              </p>
            </div>
          </div>
        </div>

        {/* Financial Data Details */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">📈 재무 데이터 수집 현황</h2>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-slate-400 text-sm">진행률</span>
              <span className={`font-bold ${getStatusColor(financialPercent)}`}>
                {financialPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(financialPercent)}`}
                style={{ width: `${Math.min(financialPercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">수집 기업 수</p>
              <p className="text-2xl font-bold text-white">
                {status.data.financial_data.companies_count.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">총 레코드 수</p>
              <p className="text-2xl font-bold text-white">
                {status.data.financial_data.total_records.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">최근 업데이트</p>
              <p className="text-2xl font-bold text-white">
                {status.data.financial_data.latest_update || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Price Data Details */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">💹 주가 데이터 수집 현황</h2>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-slate-400 text-sm">진행률</span>
              <span className={`font-bold ${getStatusColor(pricePercent)}`}>
                {pricePercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(pricePercent)}`}
                style={{ width: `${Math.min(pricePercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">수집 기업 수</p>
              <p className="text-2xl font-bold text-white">
                {status.data.price_data.companies_count.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">총 레코드 수</p>
              <p className="text-2xl font-bold text-white">
                {status.data.price_data.total_records.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">최근 업데이트</p>
              <p className="text-2xl font-bold text-white">
                {status.data.price_data.latest_update 
                  ? new Date(status.data.price_data.latest_update).toLocaleString('ko-KR')
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-400 mb-2">ℹ️ 수집 정보</h3>
          <ul className="text-slate-300 space-y-2">
            <li>• <strong>재무 데이터</strong>: 매주 일요일 23:00 KST 자동 수집</li>
            <li>• <strong>주가 데이터</strong>: 평일 20:00 KST 자동 수집 (장 마감 후)</li>
            <li>• <strong>수집 대상</strong>: KOSPI 상위 500개 + KOSDAQ 상위 500개 = 1,000개 기업</li>
            <li>• <strong>자동 갱신</strong>: 이 페이지는 10초마다 자동으로 업데이트됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
