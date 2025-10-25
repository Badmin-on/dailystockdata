'use client';

import { useEffect, useState } from 'react';
import {
  Cog6ToothIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface Settings {
  collection: {
    enabled: boolean;
    batchSize: number;
    rateLimit: number;
    timeout: number;
  };
  investmentScores: {
    sGrade: number;
    aGrade: number;
    bGrade: number;
    cGrade: number;
  };
  divergenceRanges: {
    optimal: { min: number; max: number };
    good: { min: number; max: number };
    fair: { min: number; max: number };
    caution: { min: number; max: number };
    warning: { min: number; max: number };
    danger: { min: number; max: number };
  };
  consensusThresholds: {
    significant: number;
    high: number;
    medium: number;
    low: number;
  };
  ui: {
    defaultLimit: number;
    refreshInterval: number;
    chartColors: {
      revenue: string;
      operatingProfit: string;
      stockPrice: string;
    };
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Cog6ToothIcon className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
            ⚙️ 설정
          </h1>
          <p className="text-slate-400">애플리케이션 설정 및 구성</p>
        </div>

        {/* Data Collection Settings */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <ChartBarIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">데이터 수집 설정</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">수집 활성화</p>
              <p className={`text-2xl font-bold ${settings.collection.enabled ? 'text-green-400' : 'text-red-400'}`}>
                {settings.collection.enabled ? '✅ 활성화' : '❌ 비활성화'}
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">배치 크기</p>
              <p className="text-2xl font-bold text-white">
                {settings.collection.batchSize}개
              </p>
              <p className="text-slate-500 text-sm mt-2">한 번에 처리할 기업 수</p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Rate Limit</p>
              <p className="text-2xl font-bold text-white">
                {settings.collection.rateLimit}req/s
              </p>
              <p className="text-slate-500 text-sm mt-2">초당 요청 수</p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Timeout</p>
              <p className="text-2xl font-bold text-white">
                {settings.collection.timeout / 1000}초
              </p>
              <p className="text-slate-500 text-sm mt-2">최대 대기 시간</p>
            </div>
          </div>
        </div>

        {/* Investment Score Thresholds */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheckIcon className="h-6 w-6 text-green-400" />
            <h2 className="text-2xl font-bold text-white">투자 점수 임계값</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">S급</p>
              <p className="text-3xl font-bold text-purple-400">
                {settings.investmentScores.sGrade}점
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">A급</p>
              <p className="text-3xl font-bold text-blue-400">
                {settings.investmentScores.aGrade}점
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">B급</p>
              <p className="text-3xl font-bold text-green-400">
                {settings.investmentScores.bGrade}점
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">C급</p>
              <p className="text-3xl font-bold text-yellow-400">
                {settings.investmentScores.cGrade}점
              </p>
            </div>
          </div>
        </div>

        {/* Divergence Ranges */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <ClockIcon className="h-6 w-6 text-orange-400" />
            <h2 className="text-2xl font-bold text-white">이격도 범위 설정</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <p className="text-white font-semibold">최적 매수 구간</p>
                <p className="text-slate-400 text-sm">Optimal</p>
              </div>
              <p className="text-green-400 font-bold text-lg">
                {settings.divergenceRanges.optimal.min}% ~ {settings.divergenceRanges.optimal.max}%
              </p>
            </div>

            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <p className="text-white font-semibold">양호한 매수 구간</p>
                <p className="text-slate-400 text-sm">Good</p>
              </div>
              <p className="text-blue-400 font-bold text-lg">
                {settings.divergenceRanges.good.min}% ~ {settings.divergenceRanges.good.max}%
              </p>
            </div>

            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <p className="text-white font-semibold">보통 구간</p>
                <p className="text-slate-400 text-sm">Fair</p>
              </div>
              <p className="text-yellow-400 font-bold text-lg">
                {settings.divergenceRanges.fair.min}% ~ {settings.divergenceRanges.fair.max}%
              </p>
            </div>

            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <p className="text-white font-semibold">주의 구간</p>
                <p className="text-slate-400 text-sm">Caution</p>
              </div>
              <p className="text-orange-400 font-bold text-lg">
                {settings.divergenceRanges.caution.min}% ~ {settings.divergenceRanges.caution.max}%
              </p>
            </div>

            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <p className="text-white font-semibold">경고 구간</p>
                <p className="text-slate-400 text-sm">Warning</p>
              </div>
              <p className="text-red-400 font-bold text-lg">
                {settings.divergenceRanges.warning.min}% ~ {settings.divergenceRanges.warning.max}%
              </p>
            </div>

            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div>
                <p className="text-white font-semibold">위험 구간 (과열)</p>
                <p className="text-slate-400 text-sm">Danger</p>
              </div>
              <p className="text-red-600 font-bold text-lg">
                {settings.divergenceRanges.danger.min}% ~ {settings.divergenceRanges.danger.max}%
              </p>
            </div>
          </div>
        </div>

        {/* Consensus Thresholds */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <BellIcon className="h-6 w-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">컨센서스 변화 임계값</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">급상승</p>
              <p className="text-3xl font-bold text-red-400">
                ≥{settings.consensusThresholds.significant}%
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">높음</p>
              <p className="text-3xl font-bold text-orange-400">
                ≥{settings.consensusThresholds.high}%
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">중간</p>
              <p className="text-3xl font-bold text-yellow-400">
                ≥{settings.consensusThresholds.medium}%
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">낮음</p>
              <p className="text-3xl font-bold text-green-400">
                ≥{settings.consensusThresholds.low}%
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-400 mb-2">ℹ️ 설정 정보</h3>
          <ul className="text-slate-300 space-y-2">
            <li>• 현재는 <strong>읽기 전용</strong> 모드입니다</li>
            <li>• 설정 변경 기능은 곧 추가될 예정입니다</li>
            <li>• 일부 설정은 관리자만 변경할 수 있습니다</li>
            <li>• 설정 변경 시 즉시 적용됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
