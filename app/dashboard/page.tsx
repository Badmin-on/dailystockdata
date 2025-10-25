'use client';

import React, { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  CircleStackIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface Stats {
  total_companies: number;
  companies_with_prices: number;
  total_financial_records: number;
  total_price_records: number;
  latest_financial_date: string;
  latest_price_date: string;
  price_collection_rate: string;
  financial_coverage: string;
}

interface MarketStats {
  kospi: { total: number };
  kosdaq: { total: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [markets, setMarkets] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/data-status');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.overall);
        setMarkets(data.markets);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: '전체 기업 수',
      value: stats?.total_companies?.toLocaleString() || '0',
      change: null,
      icon: BuildingOfficeIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-500/10 to-blue-600/10',
      borderColor: 'border-blue-500/20'
    },
    {
      name: '재무 데이터',
      value: stats?.total_financial_records?.toLocaleString() || '0',
      change: stats?.financial_coverage || '0%',
      icon: ChartBarIcon,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-500/10 to-green-600/10',
      borderColor: 'border-green-500/20'
    },
    {
      name: '주가 데이터',
      value: stats?.total_price_records?.toLocaleString() || '0',
      change: stats?.price_collection_rate || '0%',
      icon: ArrowTrendingUpIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-500/10 to-purple-600/10',
      borderColor: 'border-purple-500/20'
    },
    {
      name: '주가 보유 기업',
      value: stats?.companies_with_prices?.toLocaleString() || '0',
      change: null,
      icon: BanknotesIcon,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-500/10 to-orange-600/10',
      borderColor: 'border-orange-500/20'
    }
  ];

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">대시보드</h1>
        <p className="text-slate-400">YoonStock Pro 데이터 현황 및 통계</p>
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.bgColor} border ${card.borderColor} backdrop-blur-sm`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {card.change && (
                    <span className="text-xs font-semibold text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                      {card.change}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">{card.name}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 시장별 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <CircleStackIcon className="w-6 h-6 mr-2 text-blue-400" />
            시장별 기업 수
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">KP</span>
                </div>
                <div>
                  <p className="text-sm text-slate-400">KOSPI</p>
                  <p className="text-2xl font-bold text-white">{markets?.kospi.total?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">KQ</span>
                </div>
                <div>
                  <p className="text-sm text-slate-400">KOSDAQ</p>
                  <p className="text-2xl font-bold text-white">{markets?.kosdaq.total?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 업데이트 정보 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <ClockIcon className="w-6 h-6 mr-2 text-green-400" />
            최근 업데이트
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <p className="text-sm text-slate-400 mb-1">재무 데이터</p>
              <p className="text-lg font-semibold text-white">
                {stats?.latest_financial_date ? new Date(stats.latest_financial_date).toLocaleDateString('ko-KR') : 'N/A'}
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <p className="text-sm text-slate-400 mb-1">주가 데이터</p>
              <p className="text-lg font-semibold text-white">
                {stats?.latest_price_date ? new Date(stats.latest_price_date).toLocaleDateString('ko-KR') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 액세스 메뉴 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 p-6">
        <h2 className="text-xl font-bold text-white mb-4">빠른 액세스</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/monitor"
            className="p-4 bg-gradient-to-br from-blue-600/10 to-blue-500/10 border border-blue-500/20 rounded-lg hover:border-blue-500/50 transition-all group"
          >
            <ChartBarIcon className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">실시간 모니터링</h3>
            <p className="text-sm text-slate-400">주가 및 재무 데이터 실시간 확인</p>
          </a>
          <a
            href="/opportunities"
            className="p-4 bg-gradient-to-br from-green-600/10 to-green-500/10 border border-green-500/20 rounded-lg hover:border-green-500/50 transition-all group"
          >
            <ArrowTrendingUpIcon className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">투자 기회</h3>
            <p className="text-sm text-slate-400">컨센서스 변화 및 괴리율 분석</p>
          </a>
          <a
            href="/date-comparison"
            className="p-4 bg-gradient-to-br from-purple-600/10 to-purple-500/10 border border-purple-500/20 rounded-lg hover:border-purple-500/50 transition-all group"
          >
            <ClockIcon className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">날짜별 비교</h3>
            <p className="text-sm text-slate-400">특정 기간 재무 데이터 비교</p>
          </a>
        </div>
      </div>
    </div>
  );
}
