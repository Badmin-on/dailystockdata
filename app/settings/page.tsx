'use client';

import { useEffect, useState } from 'react';
import {
  Cog6ToothIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
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

  // 데이터 수집 상태
  const [financialCollecting, setFinancialCollecting] = useState(false);
  const [priceCollecting, setPriceCollecting] = useState(false);
  const [financialCompleted, setFinancialCompleted] = useState(false);
  const [collectionLogs, setCollectionLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

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

  const setLogs = (logs: string[]) => {
    setCollectionLogs(logs);
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    setCollectionLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 재무 데이터 수집 (스트리밍 방식)
  const handleCollectFinancial = async () => {
    setFinancialCollecting(true);
    setFinancialCompleted(false);
    setCollectionLogs([]);
    setCurrentProgress('0/1000');
    setProgressPercent(0);

    try {
      const eventSource = new EventSource('/api/collect-financial-stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'start':
            case 'log':
              addLog(data.message);
              break;

            case 'total':
              setCurrentProgress(`0/${data.total}`);
              addLog(data.message);
              break;

            case 'progress':
              setCurrentProgress(`${data.current}/${data.total}`);
              setProgressPercent(data.percent || 0);
              addLog(data.message);
              break;

            case 'save_progress':
              addLog(data.message);
              break;

            case 'complete':
              addLog(data.message);
              addLog(`📊 총 ${data.stats.saved_companies}개 기업, ${data.stats.saved_financial_records}개 레코드 저장`);
              setFinancialCompleted(true);
              eventSource.close();
              setFinancialCollecting(false);
              break;

            case 'error':
              addLog(data.message);
              eventSource.close();
              setFinancialCollecting(false);
              break;
          }
        } catch (e) {
          console.error('Failed to parse event:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        addLog('❌ 연결 오류 발생');
        eventSource.close();
        setFinancialCollecting(false);
      };

    } catch (error) {
      console.error('Collection error:', error);
      addLog(`❌ 오류: ${error instanceof Error ? error.message : String(error)}`);
      setFinancialCollecting(false);
    }
  };

  // 주가 데이터 수집 (스트리밍 방식)
  const handleCollectPrices = async () => {
    setPriceCollecting(true);
    setCurrentProgress('0/1000');
    setProgressPercent(0);

    try {
      const eventSource = new EventSource('/api/collect-prices-stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'start':
            case 'log':
              addLog(data.message);
              break;

            case 'total':
              setCurrentProgress(`0/${data.total}`);
              addLog(data.message);
              break;

            case 'progress':
              setCurrentProgress(`${data.current}/${data.total}`);
              setProgressPercent(data.percent || 0);
              addLog(data.message);
              break;

            case 'complete':
              addLog(data.message);
              addLog(`📊 ${data.stats.success_count}개 기업 주가 저장 완료`);
              eventSource.close();
              setPriceCollecting(false);
              break;

            case 'error':
              addLog(data.message);
              eventSource.close();
              setPriceCollecting(false);
              break;
          }
        } catch (e) {
          console.error('Failed to parse event:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        addLog('❌ 연결 오류 발생');
        eventSource.close();
        setPriceCollecting(false);
      };

    } catch (error) {
      console.error('Collection error:', error);
      addLog(`❌ 오류: ${error instanceof Error ? error.message : String(error)}`);
      setPriceCollecting(false);
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

        {/* Manual Data Collection */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm border border-blue-500/30 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <ChartBarIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">수동 데이터 수집</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 재무 데이터 수집 */}
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-2">1. 재무 데이터 수집</h3>
              <p className="text-slate-400 text-sm mb-4">
                KOSPI 500 + KOSDAQ 500 = 1,000개 기업<br/>
                소요 시간: 약 20-30분
              </p>
              <button
                onClick={handleCollectFinancial}
                disabled={financialCollecting}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center ${
                  financialCollecting
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : financialCompleted
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {financialCollecting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    수집 중...
                  </>
                ) : financialCompleted ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    수집 완료
                  </>
                ) : (
                  <>
                    <ChartBarIcon className="w-5 h-5 mr-2" />
                    재무 데이터 수집 시작
                  </>
                )}
              </button>

              {/* 진행률 표시 */}
              {financialCollecting && currentProgress && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">진행률</span>
                    <span className="text-blue-400 font-mono font-semibold">
                      {currentProgress} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* 주가 데이터 수집 */}
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-2">2. 주가 데이터 수집</h3>
              <p className="text-slate-400 text-sm mb-4">
                1,000개 기업 당일 주가<br/>
                소요 시간: 약 5-10분
              </p>
              <button
                onClick={handleCollectPrices}
                disabled={priceCollecting || !financialCompleted}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center ${
                  priceCollecting
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : !financialCompleted
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {priceCollecting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    수집 중...
                  </>
                ) : !financialCompleted ? (
                  <>
                    <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                    재무 데이터 먼저 수집 필요
                  </>
                ) : (
                  <>
                    <ClockIcon className="w-5 h-5 mr-2" />
                    주가 데이터 수집 시작
                  </>
                )}
              </button>

              {/* 진행률 표시 */}
              {priceCollecting && currentProgress && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">진행률</span>
                    <span className="text-purple-400 font-mono font-semibold">
                      {currentProgress} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 수집 로그 */}
          {collectionLogs.length > 0 && (
            <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-2">📋 수집 로그</h3>
              <div className="bg-black/50 rounded p-3 max-h-60 overflow-y-auto font-mono text-sm">
                {collectionLogs.map((log, index) => (
                  <div key={index} className="text-slate-300 mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              ℹ️ <strong>주의사항:</strong> 수집 중에는 브라우저 탭을 닫지 마세요.
              재무 데이터 수집이 완료된 후 주가 데이터 수집을 진행할 수 있습니다.
            </p>
          </div>
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
