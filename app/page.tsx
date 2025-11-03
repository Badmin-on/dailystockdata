'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DBStatus {
  success: boolean;
  message: string;
  tables?: {
    companies: number;
    financial_data: number;
    daily_stock_prices: number;
  };
  sample_companies?: any[];
}

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<DBStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/test-db');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 text-gray-800">
          📊 YoonStock 대시보드
        </h1>
        <p className="text-center text-gray-600 mb-12">
          실시간 주식 재무제표 및 주가 모니터링
        </p>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">데이터 로딩 중...</p>
          </div>
        ) : status?.success ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {status.message}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {status.tables?.companies.toLocaleString() || 0}
                  </div>
                  <div className="text-gray-600 font-medium">등록 기업</div>
                </div>
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {status.tables?.financial_data.toLocaleString() || 0}
                  </div>
                  <div className="text-gray-600 font-medium">재무 데이터</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-6 text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {status.tables?.daily_stock_prices.toLocaleString() || 0}
                  </div>
                  <div className="text-gray-600 font-medium">주가 데이터</div>
                </div>
              </div>

              {/* 대시보드 바로가기 버튼 */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/monitor')}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg hover:from-purple-600 hover:to-purple-800 font-bold text-lg shadow-xl transition-all transform hover:scale-105"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">📊</span>
                    <div className="text-left">
                      <div>모니터링 대시보드</div>
                      <div className="text-xs font-normal opacity-90">데이터 수집 현황 + Top 20</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/opportunities')}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 font-bold text-lg shadow-xl transition-all transform hover:scale-105"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">🎯</span>
                    <div className="text-left">
                      <div>투자 기회 발굴</div>
                      <div className="text-xs font-normal opacity-90">컨센서스 + 이격도 분석</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg shadow-lg transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">📈</span>
                    <div className="text-left">
                      <div>기본 대시보드</div>
                      <div className="text-xs font-normal opacity-90">재무제표 변화 모니터링</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {status.sample_companies && status.sample_companies.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  📈 등록된 기업 샘플
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">회사명</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">종목코드</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">시장</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {status.sample_companies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{company.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{company.code}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.market === 'KOSPI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                              {company.market}
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
        ) : (
          <div className="bg-red-50 rounded-lg shadow-md p-12 text-center">
            <p className="text-red-600 text-lg font-medium">❌ 데이터베이스 연결 실패</p>
            <p className="text-gray-600 mt-2">{status?.message || '알 수 없는 오류'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
