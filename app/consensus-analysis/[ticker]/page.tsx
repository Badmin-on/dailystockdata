'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import TrendChart from '../components/TrendChart';
import TagBadge from '../components/TagBadge';
import ConsensusComparison from '../components/ConsensusComparison';

interface Company {
  id: number;
  name: string;
  ticker: string;
  market?: string;
}

interface LatestMetric {
  snapshot_date: string;
  ticker: string;
  calc_status: string;
  eps_y1: number;
  eps_y2: number;
  per_y1: number;
  per_y2: number;
  eps_growth_pct: number;
  per_growth_pct: number;
  fvb_score: number;
  hgs_score: number;
  rrs_score: number;
  quad_position: string;
  quad_x: number;
  quad_y: number;
  target_y1: number;
  target_y2: number;
}

interface DiffLog {
  signal_tags: string[];
  is_overheat: boolean;
  is_target_zone: boolean;
  is_turnaround: boolean;
  fvb_diff_d1: number | null;
  hgs_diff_d1: number | null;
  rrs_diff_d1: number | null;
  fvb_diff_m1: number | null;
}

interface Alert {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params?.ticker as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [latestMetric, setLatestMetric] = useState<LatestMetric | null>(null);
  const [diffLog, setDiffLog] = useState<DiffLog | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticker) {
      fetchCompanyData();
    }
  }, [ticker]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/consensus/company/${ticker}`);
      if (!response.ok) {
        throw new Error('데이터를 불러오지 못했습니다');
      }

      const data = await response.json();
      setCompany(data.company);
      setLatestMetric(data.latest_metric);

      // Extract diff data from changes
      const diffData: DiffLog = {
        signal_tags: data.latest_metric?.signal_tags || [],
        is_overheat: data.latest_metric?.is_overheat || false,
        is_target_zone: data.latest_metric?.is_target_zone || false,
        is_turnaround: data.latest_metric?.is_turnaround || false,
        fvb_diff_d1: data.changes?.daily?.fvb || null,
        hgs_diff_d1: data.changes?.daily?.hgs || null,
        rrs_diff_d1: data.changes?.daily?.rrs || null,
        fvb_diff_m1: data.changes?.monthly?.fvb || null,
      };
      setDiffLog(diffData);

      setHistory(data.historical || []);
      setAlerts(generateAlerts(data.latest_metric, diffData));
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = (metric: LatestMetric | null, diff: DiffLog | null): Alert[] => {
    if (!metric || !diff) return [];

    const alerts: Alert[] = [];

    if (diff.is_target_zone) {
      alerts.push({
        type: 'TARGET_ZONE',
        message: 'Q2 Target Zone: 실적 성장 중 저평가 진입 구간입니다',
        severity: 'info'
      });
    }

    if (diff.is_overheat) {
      alerts.push({
        type: 'OVERHEAT',
        message: '과열 경고: 실적 대비 주가가 과도하게 상승했습니다',
        severity: 'danger'
      });
    }

    if (diff.is_turnaround) {
      alerts.push({
        type: 'TURNAROUND',
        message: '턴어라운드: 적자에서 흑자로 전환되었습니다',
        severity: 'warning'
      });
    }

    if (metric.fvb_score > 0.3) {
      alerts.push({
        type: 'HIGH_FVB',
        message: '높은 FVB: 실적 성장이 밸류에이션보다 빠릅니다',
        severity: 'info'
      });
    }

    return alerts;
  };

  const getQuadrantLabel = (quad: string): string => {
    switch (quad) {
      case 'Q1_GROWTH_RERATING':
        return 'Q1 성장+리레이팅';
      case 'Q2_GROWTH_DERATING':
        return 'Q2 성장+디레이팅 ⭐';
      case 'Q3_DECLINE_RERATING':
        return 'Q3 역성장+리레이팅';
      case 'Q4_DECLINE_DERATING':
        return 'Q4 역성장+디레이팅';
      default:
        return quad;
    }
  };

  const getQuadrantColor = (quad: string): string => {
    switch (quad) {
      case 'Q1_GROWTH_RERATING':
        return 'bg-yellow-100 text-yellow-800';
      case 'Q2_GROWTH_DERATING':
        return 'bg-green-100 text-green-800';
      case 'Q3_DECLINE_RERATING':
        return 'bg-orange-100 text-orange-800';
      case 'Q4_DECLINE_DERATING':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!company || !latestMetric) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">종목 데이터를 찾을 수 없습니다</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-6 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            돌아가기
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              <p className="mt-1 text-gray-600">
                {ticker}{company.market ? ` · ${company.market}` : ''}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  분석 기준일: {new Date(latestMetric.snapshot_date + 'T00:00:00+09:00').toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                    timeZone: 'Asia/Seoul'
                  })}
                </span>
                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  한국 시간
                </span>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg ${getQuadrantColor(latestMetric.quad_position)}`}>
              <div className="text-sm font-semibold">
                {getQuadrantLabel(latestMetric.quad_position)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  alert.severity === 'danger'
                    ? 'bg-red-100 text-red-800'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                <p className="font-medium">{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* FVB Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">FVB Score</h3>
            <div className="text-3xl font-bold text-blue-600">
              {latestMetric.fvb_score.toFixed(2)}
            </div>
            {diffLog?.fvb_diff_d1 !== null && diffLog?.fvb_diff_d1 !== undefined && (
              <p className={`text-sm mt-2 ${diffLog.fvb_diff_d1 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                전일 대비: {diffLog.fvb_diff_d1 > 0 ? '+' : ''}{diffLog.fvb_diff_d1.toFixed(2)}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              실적 vs 밸류에이션 균형
            </p>
          </div>

          {/* HGS Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">HGS Score</h3>
            <div className="text-3xl font-bold text-green-600">
              {latestMetric.hgs_score.toFixed(1)}
            </div>
            {diffLog?.hgs_diff_d1 !== null && diffLog?.hgs_diff_d1 !== undefined && (
              <p className={`text-sm mt-2 ${diffLog.hgs_diff_d1 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                전일 대비: {diffLog.hgs_diff_d1 > 0 ? '+' : ''}{diffLog.hgs_diff_d1.toFixed(1)}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              건전 성장 점수
            </p>
          </div>

          {/* RRS Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">RRS Score</h3>
            <div className="text-3xl font-bold text-red-600">
              {latestMetric.rrs_score.toFixed(1)}
            </div>
            {diffLog?.rrs_diff_d1 !== null && diffLog?.rrs_diff_d1 !== undefined && (
              <p className={`text-sm mt-2 ${diffLog.rrs_diff_d1 >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                전일 대비: {diffLog.rrs_diff_d1 > 0 ? '+' : ''}{diffLog.rrs_diff_d1.toFixed(1)}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              리레이팅 위험 점수
            </p>
          </div>
        </div>

        {/* Financial Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-gray-600" />
            재무 데이터
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">EPS {latestMetric.target_y1}년</p>
              <p className="text-xl font-semibold mt-1">{latestMetric.eps_y1.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">EPS {latestMetric.target_y2}년</p>
              <p className="text-xl font-semibold mt-1">{latestMetric.eps_y2.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">EPS 성장률</p>
              <p className={`text-xl font-semibold mt-1 ${latestMetric.eps_growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {latestMetric.eps_growth_pct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">PER 변화율</p>
              <p className={`text-xl font-semibold mt-1 ${latestMetric.per_growth_pct >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {latestMetric.per_growth_pct.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {diffLog && diffLog.signal_tags && diffLog.signal_tags.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TagIcon className="w-6 h-6 text-gray-600" />
              시그널 태그
            </h2>
            <div className="flex flex-wrap gap-2">
              {diffLog.signal_tags.map((tag, index) => (
                <TagBadge key={index} tag={tag} size="md" />
              ))}
            </div>
          </div>
        )}

        {/* Consensus Comparison */}
        <ConsensusComparison
          ticker={ticker}
          currentDate={latestMetric.snapshot_date}
        />

        {/* Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6 text-gray-600" />
            지표 트렌드 (최근 90일)
          </h2>
          <TrendChart data={history} />
        </div>
      </div>
    </div>
  );
}
