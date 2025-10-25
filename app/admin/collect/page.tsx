'use client';

import { useState } from 'react';

interface CollectionStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  message: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  stats?: {
    companies?: number;
    duration?: string;
    errors?: number;
  };
  logs?: string[];
}

export default function DataCollectionPage() {
  const [financialStatus, setFinancialStatus] = useState<CollectionStatus>({
    status: 'idle',
    message: '대기 중',
    logs: []
  });

  const [priceStatus, setPriceStatus] = useState<CollectionStatus>({
    status: 'idle',
    message: '대기 중',
    logs: []
  });

  const [isFinancialRunning, setIsFinancialRunning] = useState(false);
  const [isPriceRunning, setIsPriceRunning] = useState(false);

  // 재무 데이터 수집
  const collectFinancialData = async () => {
    setIsFinancialRunning(true);
    setFinancialStatus({
      status: 'running',
      message: '재무 데이터 수집을 시작합니다...',
      logs: ['[시작] 재무 데이터 수집 시작']
    });

    try {
      const response = await fetch('/api/collect-data/manual', {
        method: 'POST',
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              setFinancialStatus(prev => ({
                ...prev,
                status: data.status || prev.status,
                message: data.message || prev.message,
                progress: data.progress,
                stats: data.stats,
                logs: [...(prev.logs || []), data.message].slice(-50) // 최근 50개만
              }));
            }
          }
        }
      }

      setFinancialStatus(prev => ({
        ...prev,
        status: 'completed',
        message: '✅ 재무 데이터 수집 완료!'
      }));

    } catch (error: any) {
      setFinancialStatus({
        status: 'error',
        message: `❌ 오류 발생: ${error.message}`,
        logs: [`[오류] ${error.message}`]
      });
    } finally {
      setIsFinancialRunning(false);
    }
  };

  // 주가 데이터 수집
  const collectPriceData = async () => {
    setIsPriceRunning(true);
    setPriceStatus({
      status: 'running',
      message: '주가 데이터 수집을 시작합니다...',
      logs: ['[시작] 주가 데이터 수집 시작']
    });

    try {
      const response = await fetch('/api/collect-daily-prices/manual', {
        method: 'POST',
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              setPriceStatus(prev => ({
                ...prev,
                status: data.status || prev.status,
                message: data.message || prev.message,
                progress: data.progress,
                stats: data.stats,
                logs: [...(prev.logs || []), data.message].slice(-50)
              }));
            }
          }
        }
      }

      setPriceStatus(prev => ({
        ...prev,
        status: 'completed',
        message: '✅ 주가 데이터 수집 완료!'
      }));

    } catch (error: any) {
      setPriceStatus({
        status: 'error',
        message: `❌ 오류 발생: ${error.message}`,
        logs: [`[오류] ${error.message}`]
      });
    } finally {
      setIsPriceRunning(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🔧 데이터 수집 관리자
          </h1>
          <p className="text-gray-600">
            매일 아침 버튼을 눌러서 데이터를 수집하세요
          </p>
        </div>

        {/* 수집 버튼 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 재무 데이터 수집 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  📊 재무 데이터 수집
                </h2>
                <p className="text-sm text-gray-600">
                  KOSPI 500 + KOSDAQ 500 = 1,000개 기업
                </p>
              </div>
              <div className={`w-4 h-4 rounded-full ${
                financialStatus.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                financialStatus.status === 'completed' ? 'bg-green-500' :
                financialStatus.status === 'error' ? 'bg-red-500' :
                'bg-gray-300'
              }`}></div>
            </div>

            <button
              onClick={collectFinancialData}
              disabled={isFinancialRunning}
              className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg transition-all transform ${
                isFinancialRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-105 shadow-lg'
              }`}
            >
              {isFinancialRunning ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>수집 중...</span>
                </div>
              ) : (
                '🚀 재무 데이터 수집 시작'
              )}
            </button>

            {/* 진행 상황 */}
            {financialStatus.status !== 'idle' && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">
                    {financialStatus.message}
                  </span>
                  {financialStatus.progress && (
                    <span className="text-gray-600">
                      {financialStatus.progress.current} / {financialStatus.progress.total}
                    </span>
                  )}
                </div>

                {financialStatus.progress && (
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${financialStatus.progress.percentage}%` }}
                    ></div>
                  </div>
                )}

                {financialStatus.stats && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {financialStatus.stats.companies !== undefined && (
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {financialStatus.stats.companies}
                        </div>
                        <div className="text-xs text-gray-600">수집 완료</div>
                      </div>
                    )}
                    {financialStatus.stats.duration && (
                      <div className="bg-green-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-green-600">
                          {financialStatus.stats.duration}
                        </div>
                        <div className="text-xs text-gray-600">소요 시간</div>
                      </div>
                    )}
                    {financialStatus.stats.errors !== undefined && (
                      <div className="bg-red-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-red-600">
                          {financialStatus.stats.errors}
                        </div>
                        <div className="text-xs text-gray-600">오류</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 로그 */}
                <div className="bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {financialStatus.logs?.map((log, idx) => (
                    <div key={idx} className="text-xs text-green-400 font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 주가 데이터 수집 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  💰 주가 데이터 수집
                </h2>
                <p className="text-sm text-gray-600">
                  모든 등록된 기업의 최신 주가
                </p>
              </div>
              <div className={`w-4 h-4 rounded-full ${
                priceStatus.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                priceStatus.status === 'completed' ? 'bg-green-500' :
                priceStatus.status === 'error' ? 'bg-red-500' :
                'bg-gray-300'
              }`}></div>
            </div>

            <button
              onClick={collectPriceData}
              disabled={isPriceRunning}
              className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg transition-all transform ${
                isPriceRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105 shadow-lg'
              }`}
            >
              {isPriceRunning ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>수집 중...</span>
                </div>
              ) : (
                '🚀 주가 데이터 수집 시작'
              )}
            </button>

            {/* 진행 상황 */}
            {priceStatus.status !== 'idle' && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">
                    {priceStatus.message}
                  </span>
                  {priceStatus.progress && (
                    <span className="text-gray-600">
                      {priceStatus.progress.current} / {priceStatus.progress.total}
                    </span>
                  )}
                </div>

                {priceStatus.progress && (
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${priceStatus.progress.percentage}%` }}
                    ></div>
                  </div>
                )}

                {priceStatus.stats && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {priceStatus.stats.companies !== undefined && (
                      <div className="bg-green-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-green-600">
                          {priceStatus.stats.companies}
                        </div>
                        <div className="text-xs text-gray-600">수집 완료</div>
                      </div>
                    )}
                    {priceStatus.stats.duration && (
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {priceStatus.stats.duration}
                        </div>
                        <div className="text-xs text-gray-600">소요 시간</div>
                      </div>
                    )}
                    {priceStatus.stats.errors !== undefined && (
                      <div className="bg-red-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-red-600">
                          {priceStatus.stats.errors}
                        </div>
                        <div className="text-xs text-gray-600">오류</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 로그 */}
                <div className="bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {priceStatus.logs?.map((log, idx) => (
                    <div key={idx} className="text-xs text-green-400 font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 안내 사항 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📌 사용 안내
          </h3>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <p className="font-medium text-gray-800">매일 아침 재무 데이터 먼저 수집</p>
                <p className="text-sm">KOSPI 500 + KOSDAQ 500 기업의 컨센서스 데이터 (약 20-30분 소요)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <p className="font-medium text-gray-800">그 다음 주가 데이터 수집</p>
                <p className="text-sm">모든 기업의 최신 종가 데이터 (약 5-7분 소요)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <p className="font-medium text-gray-800">완료 후 대시보드에서 확인</p>
                <p className="text-sm">투자 기회 발굴 페이지에서 최신 데이터로 분석된 결과 확인</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-bold text-gray-800 mb-2">⚠️ 주의 사항</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• 수집 중에는 브라우저 창을 닫지 마세요</li>
              <li>• 재무 데이터 수집이 완료된 후 주가 데이터를 수집하세요</li>
              <li>• 진행 중인 작업은 중단할 수 없습니다 (완료될 때까지 대기)</li>
              <li>• 오류 발생 시 로그를 확인하고 다시 시도하세요</li>
            </ul>
          </div>
        </div>

        {/* 대시보드 링크 */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-all"
          >
            ← 메인 대시보드로 돌아가기
          </a>
        </div>
      </div>
    </main>
  );
}
