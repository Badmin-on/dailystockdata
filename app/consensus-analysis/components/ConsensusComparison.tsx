'use client';

import { useState, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface ComparisonData {
  current: any;
  previous: any | null;
  changes: {
    fvb_change: number;
    hgs_change: number;
    rrs_change: number;
    eps_growth_change: number;
    per_growth_change: number;
    quad_changed: boolean;
    days_diff: number;
  } | null;
  interpretation: {
    overall: 'UPGRADED' | 'DOWNGRADED' | 'STABLE' | 'MIXED';
    signals: string[];
    summary: string;
  } | null;
}

interface ConsensusComparisonProps {
  ticker: string;
  currentDate: string;
}

export default function ConsensusComparison({ ticker, currentDate }: ConsensusComparisonProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  const periods = [
    { label: '약 1일 전', days: 1 },
    { label: '약 1주 전', days: 7 },
    { label: '약 1개월 전', days: 30 },
    { label: '약 3개월 전', days: 90 },
  ];

  // Format Korean date
  const formatKoreanDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00+09:00'); // KST
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];

    return `${year}년 ${month}월 ${day}일 (${weekday})`;
  };

  const fetchComparison = async (days: number) => {
    setLoading(true);
    try {
      const compareDate = new Date(currentDate);
      compareDate.setDate(compareDate.getDate() - days);
      const compareDateStr = compareDate.toISOString().split('T')[0];

      const response = await fetch(
        `/api/consensus/comparison?ticker=${ticker}&current_date=${currentDate}&compare_date=${compareDateStr}`
      );
      const data = await response.json();
      setComparisonData(data);
    } catch (error) {
      console.error('Comparison fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodClick = (days: number, label: string) => {
    setSelectedPeriod(label);
    fetchComparison(days);
  };

  const ChangeIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNeutral = Math.abs(value) < 0.01;

    if (isNeutral) {
      return (
        <div className="flex items-center gap-1 text-gray-500">
          <MinusIcon className="w-4 h-4" />
          <span className="text-sm">변화없음</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpIcon className="w-4 h-4" />
        ) : (
          <ArrowDownIcon className="w-4 h-4" />
        )}
        <span className="text-sm font-semibold">
          {value > 0 ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>
    );
  };

  const getOverallBadge = (overall: string) => {
    switch (overall) {
      case 'UPGRADED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'DOWNGRADED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'STABLE':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'MIXED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getOverallLabel = (overall: string) => {
    switch (overall) {
      case 'UPGRADED': return '📈 컨센서스 상향';
      case 'DOWNGRADED': return '📉 컨센서스 하향';
      case 'STABLE': return '➡️ 컨센서스 안정';
      case 'MIXED': return '🔀 컨센서스 혼조';
      default: return overall;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">컨센서스 변화 추이</h2>
            <p className="text-sm text-gray-600">과거 시점과 비교하여 애널리스트 전망 변화를 분석합니다</p>
          </div>
        </div>

        {/* Current Date Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              기준일: {formatKoreanDate(currentDate)}
            </span>
            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              한국 시간 기준
            </span>
          </div>
        </div>
      </div>

      {/* Period Selection Buttons */}
      <div className="grid grid-cols-2 md:flex gap-2">
        {periods.map((period) => (
          <button
            key={period.label}
            onClick={() => handlePeriodClick(period.days, period.label)}
            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedPeriod === period.label
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">비교 데이터를 불러오는 중...</p>
        </div>
      )}

      {/* Comparison Results */}
      {!loading && comparisonData && (
        <>
          {!comparisonData.previous ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ 선택한 기간의 과거 데이터가 없습니다. 다른 기간을 선택해보세요.
              </p>
            </div>
          ) : (
            <>
              {/* Overall Assessment */}
              {comparisonData.interpretation && comparisonData.changes && (
                <div className={`border-2 rounded-lg p-4 ${getOverallBadge(comparisonData.interpretation.overall)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold">
                      {getOverallLabel(comparisonData.interpretation.overall)}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-700">
                        {comparisonData.changes.days_diff}일 전 대비
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatKoreanDate(comparisonData.previous.snapshot_date)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{comparisonData.interpretation.summary}</p>
                </div>
              )}

              {/* Detailed Changes */}
              {comparisonData.changes && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* FVB Change */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">FVB 점수</span>
                      <ChangeIndicator value={comparisonData.changes.fvb_change} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{comparisonData.previous.fvb_score.toFixed(2)} → {comparisonData.current.fvb_score.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* HGS Change */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">HGS 점수</span>
                      <ChangeIndicator value={comparisonData.changes.hgs_change} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{comparisonData.previous.hgs_score.toFixed(1)} → {comparisonData.current.hgs_score.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* RRS Change */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">RRS 점수</span>
                      <ChangeIndicator value={comparisonData.changes.rrs_change} inverse />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{comparisonData.previous.rrs_score.toFixed(1)} → {comparisonData.current.rrs_score.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* EPS Growth Change */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">EPS 성장률</span>
                      <ChangeIndicator value={comparisonData.changes.eps_growth_change} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{comparisonData.previous.eps_growth_pct.toFixed(1)}% → {comparisonData.current.eps_growth_pct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interpretation Signals */}
              {comparisonData.interpretation && comparisonData.interpretation.signals.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">💡 주요 변화 시그널</p>
                  <ul className="space-y-1">
                    {comparisonData.interpretation.signals.map((signal, idx) => (
                      <li key={idx} className="text-sm text-blue-800">
                        • {signal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Date Info */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm border-t">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">비교 기준</p>
                    <p className="font-medium text-gray-700">
                      {formatKoreanDate(comparisonData.previous.snapshot_date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ({comparisonData.previous.snapshot_date})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">현재 (기준일)</p>
                    <p className="font-medium text-blue-700">
                      {formatKoreanDate(comparisonData.current.snapshot_date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ({comparisonData.current.snapshot_date})
                    </p>
                  </div>
                </div>
                <div className="text-center mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    📊 실제 비교 간격: <span className="font-semibold text-gray-800">{comparisonData.changes?.days_diff}일</span>
                    {comparisonData.changes && comparisonData.changes.days_diff !== parseInt(selectedPeriod?.replace(/[^0-9]/g, '') || '0') && (
                      <span className="text-gray-500 ml-1">
                        (DB에서 가장 근접한 날짜 사용)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Initial State */}
      {!loading && !comparisonData && (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">비교할 기간을 선택하세요</p>
        </div>
      )}
    </div>
  );
}
