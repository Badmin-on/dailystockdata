'use client';

import { useEffect, useState } from 'react';
import { ClockIcon, ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface HistoryItem {
  date: string;
  type: 'financial' | 'price' | 'system';
  description: string;
  changes: number;
  status: 'success' | 'error' | 'warning';
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'financial' | 'price' | 'system'>('all');

  useEffect(() => {
    // 임시 데이터 - 실제로는 API에서 가져와야 함
    const mockHistory: HistoryItem[] = [
      {
        date: new Date().toISOString(),
        type: 'price',
        description: '주가 데이터 자동 수집 완료',
        changes: 1788,
        status: 'success',
      },
      {
        date: new Date(Date.now() - 86400000).toISOString(),
        type: 'financial',
        description: '재무 데이터 자동 수집 완료',
        changes: 1788,
        status: 'success',
      },
      {
        date: new Date(Date.now() - 172800000).toISOString(),
        type: 'system',
        description: 'Materialized View 갱신',
        changes: 2,
        status: 'success',
      },
      {
        date: new Date(Date.now() - 259200000).toISOString(),
        type: 'price',
        description: '주가 데이터 수집 실패 - 네트워크 오류',
        changes: 0,
        status: 'error',
      },
    ];

    setHistory(mockHistory);
    setLoading(false);
  }, []);

  const filteredHistory = filter === 'all'
    ? history
    : history.filter(item => item.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'financial':
        return <ChartBarIcon className="h-6 w-6 text-green-400" />;
      case 'price':
        return <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />;
      case 'system':
        return <ClockIcon className="h-6 w-6 text-purple-400" />;
      default:
        return <ClockIcon className="h-6 w-6 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
            ✅ 성공
          </span>
        );
      case 'error':
        return (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
            ❌ 실패
          </span>
        );
      case 'warning':
        return (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
            ⚠️ 경고
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
            📜 히스토리
          </h1>
          <p className="text-slate-400">데이터 수집 및 시스템 변경 이력</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('financial')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'financial'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            재무 데이터
          </button>
          <button
            onClick={() => setFilter('price')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'price'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            주가 데이터
          </button>
          <button
            onClick={() => setFilter('system')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'system'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            시스템
          </button>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <ClockIcon className="h-16 w-16 text-slate-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">히스토리를 불러오는 중...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">히스토리가 없습니다.</p>
            </div>
          ) : (
            filteredHistory.map((item, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                    {getIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {item.description}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {new Date(item.date).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Changes */}
                    {item.changes > 0 && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <span>변경된 항목:</span>
                        <span className="text-blue-400 font-semibold">
                          {item.changes.toLocaleString()}개
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-400 mb-2">ℹ️ 히스토리 정보</h3>
          <ul className="text-slate-300 space-y-2">
            <li>• <strong>재무 데이터</strong>: 매주 일요일 23:00 KST 자동 수집</li>
            <li>• <strong>주가 데이터</strong>: 평일 20:00 KST 자동 수집</li>
            <li>• <strong>시스템</strong>: View 갱신 및 시스템 유지보수 작업</li>
            <li>• <strong>보관 기간</strong>: 최근 30일간의 이력 표시</li>
          </ul>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">🚧 개발 중</h3>
          <p className="text-slate-300">
            현재는 임시 데이터를 표시하고 있습니다. 실제 데이터 수집 이력은 곧 추가될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
