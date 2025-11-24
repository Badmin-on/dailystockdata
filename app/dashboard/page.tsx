
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  ExclamationTriangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface CompanyData {
  id: number;
  name: string;
  code: string;
  market: string;
  year: number;
  current_revenue: number;
  current_op_profit: number;
  current_price: number | null;
  revenueGrowth1Year: number | null;
  opProfitGrowth1Year: number | null;
  isHighlighted: boolean;
  hasDailySurge: boolean;
  isDeclining: boolean;
  hasDailyDrop: boolean;
}

interface DashboardData {
  date: string;
  growth: CompanyData[];
  decline: CompanyData[];
  total_companies: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 1); // Default to Next Year

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/summary?year=${selectedYear}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (!val) return '-';
    return new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
  };

  const formatPercent = (val: number | null) => {
    if (val === null) return '-';
    if (val === 9999) return '흑자전환';
    return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  const CompanyList = ({ title, items, type }: { title: string, items: CompanyData[], type: 'growth' | 'decline' }) => (
    <div className={`rounded-xl border ${type === 'growth' ? 'border-red-100 bg-red-50/30' : 'border-blue-100 bg-blue-50/30'} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold flex items-center ${type === 'growth' ? 'text-red-700' : 'text-blue-700'}`}>
          {type === 'growth' ? <FireIcon className="w-6 h-6 mr-2" /> : <ExclamationTriangleIcon className="w-6 h-6 mr-2" />}
          {title}
        </h2>
        <span className="text-sm text-gray-500">{items.length}개 종목</span>
      </div>

      <div className="space-y-3">
        {items.map((company) => (
          <div
            key={company.id}
            onClick={() => router.push(`/consensus-analysis/${company.code}`)}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {company.name}
                  </span>
                  <span className="text-xs text-gray-400">{company.code}</span>
                </div>
                <div className="flex gap-1 mt-1">
                  {company.isHighlighted && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">유망</span>}
                  {company.hasDailySurge && <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">급등</span>}
                  {company.isDeclining && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">둔화</span>}
                  {company.hasDailyDrop && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium">급락</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">
                  {company.current_price ? `${company.current_price.toLocaleString()}원` : '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-500 mb-1">매출액 (YoY)</p>
                <div className="flex justify-between items-end">
                  <span className="font-medium">{formatCurrency(company.current_revenue)}</span>
                  <span className={`text-xs font-bold ${(company.revenueGrowth1Year || 0) > 0 ? 'text-red-500' : 'text-blue-500'
                    }`}>
                    {formatPercent(company.revenueGrowth1Year)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">영업이익 (YoY)</p>
                <div className="flex justify-between items-end">
                  <span className="font-medium">{formatCurrency(company.current_op_profit)}</span>
                  <span className={`text-xs font-bold ${(company.opProfitGrowth1Year || 0) > 0 ? 'text-red-500' : 'text-blue-500'
                    }`}>
                    {formatPercent(company.opProfitGrowth1Year)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            해당 조건의 종목이 없습니다.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Market Intelligence</h1>
          <p className="text-gray-500">
            {data?.date ? `${new Date(data.date).toLocaleDateString()} 기준` : '데이터 로딩 중...'}
            시장 핵심 종목 분석
          </p>
        </div>

        {/* Year Filter */}
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <CalendarIcon className="w-5 h-5 text-gray-400 ml-2" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 py-2 pl-2 pr-8 cursor-pointer"
          >
            {(() => {
              const current = new Date().getFullYear();
              return (
                <>
                  <option value={current}>{current}년 실적</option>
                  <option value={current + 1}>{current + 1}년 전망 (Next Year)</option>
                  <option value={current + 2}>{current + 2}년 전망 (Future)</option>
                </>
              );
            })()}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rising Stars */}
          <CompanyList
            title="Rising Stars (성장/급등)"
            items={data?.growth || []}
            type="growth"
          />

          {/* Falling Stars */}
          <CompanyList
            title="Falling Stars (둔화/급락)"
            items={data?.decline || []}
            type="decline"
          />
        </div>
      )}
    </div>
  );
}
