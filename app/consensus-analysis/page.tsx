'use client';

import { useState, useEffect } from 'react';
import { ChartBarIcon, FunnelIcon } from '@heroicons/react/24/outline';
import ConsensusFilters from './components/ConsensusFilters';
import ConsensusGrid from './components/ConsensusGrid';
import QuadrantChart from './components/QuadrantChart';

import { FilterState } from './components/ConsensusFilters';

interface QuadrantStats {
  q1_count: number;
  q2_count: number;
  q3_count: number;
  q4_count: number;
}

export default function ConsensusAnalysisPage() {
  // Smart Default Logic
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  // If Oct(9) or later, default to Next Year Outlook (e.g. 2025 vs 2026)
  // Otherwise, default to Current Year Growth (e.g. 2024 vs 2025)
  const defaultY1 = currentMonth >= 9 ? currentYear : currentYear - 1;
  const defaultY2 = currentMonth >= 9 ? currentYear + 1 : currentYear;

  const [filters, setFilters] = useState<FilterState>({
    date: '', // Will be set to latest available date from DB
    quad: [],
    tags: [],
    minFvb: -999,
    minHgs: -999,
    sortBy: 'fvb_score',
    sortOrder: 'desc',
    target_y1: defaultY1,
    target_y2: defaultY2
  });

  const [metricData, setMetricData] = useState<any[]>([]);
  const [quadrantData, setQuadrantData] = useState<any[]>([]);
  const [quadrantStats, setQuadrantStats] = useState<QuadrantStats>({
    q1_count: 0,
    q2_count: 0,
    q3_count: 0,
    q4_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Initialize with latest available date from DB
  useEffect(() => {
    const initializeDate = async () => {
      try {
        const response = await fetch('/api/consensus/metrics?limit=1');
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const latestDate = data.data[0].snapshot_date;
            setFilters(prev => ({ ...prev, date: latestDate }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch latest date:', error);
        // Fallback to KST date calculation
        const now = new Date();
        const kstOffset = 9 * 60;
        const kstTime = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
        const kstDate = kstTime.toISOString().split('T')[0];
        setFilters(prev => ({ ...prev, date: kstDate }));
      }
    };
    initializeDate();
  }, []);

  useEffect(() => {
    if (filters.date) {
      fetchData();
    }
  }, [filters.date, filters.sortBy, filters.sortOrder, filters.target_y1, filters.target_y2]);

  useEffect(() => {
    applyClientFilters();
  }, [filters.quad, filters.tags, filters.minFvb, filters.minHgs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        date: filters.date,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        target_y1: filters.target_y1.toString(),
        target_y2: filters.target_y2.toString()
      });

      // Fetch metrics and quadrant data in parallel
      const [metricsRes, quadRes] = await Promise.all([
        fetch(`/api/consensus/metrics?${params}`),
        fetch(`/api/consensus/quadrant?date=${filters.date}&target_y1=${filters.target_y1}&target_y2=${filters.target_y2}`)
      ]);

      if (!metricsRes.ok || !quadRes.ok) {
        throw new Error('API 요청 실패');
      }

      const metricsData = await metricsRes.json();
      const quadData = await quadRes.json();

      setMetricData(metricsData.data || []);
      setQuadrantData(quadData.data || []);
      setQuadrantStats(quadData.stats || { q1_count: 0, q2_count: 0, q3_count: 0, q4_count: 0 });
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
      setMetricData([]);
      setQuadrantData([]);
    } finally {
      setLoading(false);
    }
  };

  const applyClientFilters = () => {
    let filtered = [...metricData];

    // Quadrant filter
    if (filters.quad.length > 0) {
      filtered = filtered.filter(item => filters.quad.includes(item.quad_position));
    }

    // FVB filter
    if (filters.minFvb > -999) {
      filtered = filtered.filter(item => item.fvb_score >= filters.minFvb);
    }

    // HGS filter
    if (filters.minHgs > -999) {
      filtered = filtered.filter(item => item.hgs_score >= filters.minHgs);
    }

    // Tags filter would require additional API call or join
    // For now, we'll skip it in client-side filtering

    setMetricData(filtered);
  };

  const handleSort = (field: string) => {
    if (filters.sortBy === field) {
      // Toggle order
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc'
      });
    } else {
      // New field, default to desc
      setFilters({
        ...filters,
        sortBy: field,
        sortOrder: 'desc'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 break-keep">컨센서스 밸류에이션 분석</h1>
                <p className="mt-2 text-sm md:text-base text-gray-600 break-keep">
                  EPS 성장률과 PER 변화율을 비교하여 저평가 기회를 탐지합니다
                </p>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 shrink-0"
              >
                <FunnelIcon className="w-4 h-4" />
                필터
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:block ${showFilters ? 'block' : 'hidden'}`}>
            <ConsensusFilters filters={filters} onFilterChange={setFilters} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Q1 성장+리레이팅</div>
                <div className="mt-2 text-2xl font-bold text-yellow-600">
                  {quadrantStats.q1_count}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Q2 성장+디레이팅 ⭐</div>
                <div className="mt-2 text-2xl font-bold text-green-600">
                  {quadrantStats.q2_count}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Q3 역성장+리레이팅</div>
                <div className="mt-2 text-2xl font-bold text-orange-600">
                  {quadrantStats.q3_count}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Q4 역성장+디레이팅</div>
                <div className="mt-2 text-2xl font-bold text-red-600">
                  {quadrantStats.q4_count}
                </div>
              </div>
            </div>

            {/* Quadrant Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold">4분면 분석</h2>
              </div>
              <QuadrantChart
                data={quadrantData}
                onPointClick={(ticker) => {
                  window.location.href = `/consensus-analysis/${ticker}`;
                }}
              />
            </div>

            {/* Data Grid */}
            <div>
              <ConsensusGrid
                data={metricData}
                loading={loading}
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onSort={handleSort}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
