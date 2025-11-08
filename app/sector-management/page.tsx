'use client';

import { useState, useEffect } from 'react';

interface Sector {
  id: number;
  name: string;
  description: string;
  display_order: number;
  growth_outlook: string;
  color_code: string;
  created_at: string;
  updated_at: string;
}

interface SectorStats {
  sector_id: number;
  sector_name: string;
  description: string;
  growth_outlook: string;
  color_code: string;
  etf_count: number;
  avg_current_price: number;
  avg_ma_120: number;
  avg_divergence: number;
  avg_position_in_52w_range: number;
  avg_growth_score: number;
  sector_valuation: string;
  sector_investment_score: number;
}

interface ETFDetail {
  id: number;
  code: string;
  name: string;
  sector_id: number | null;
  sector_name: string | null;
  sector_color: string | null;
  growth_score: number;
  investment_thesis: string | null;
  current_price: number;
  divergence_120: number;
  position_in_52w_range: number;
  valuation_signal: string;
  position_signal: string;
  investment_score: number;
}

export default function SectorManagementPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorStats, setSectorStats] = useState<SectorStats[]>([]);
  const [etfDetails, setEtfDetails] = useState<ETFDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'assign'>('overview');

  // 섹터 생성/수정 모달 상태
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [sectorForm, setSectorForm] = useState({
    name: '',
    description: '',
    growth_outlook: '중립',
    color_code: '#6B7280'
  });

  // ETF 할당 모달 상태
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedETF, setSelectedETF] = useState<ETFDetail | null>(null);
  const [assignForm, setAssignForm] = useState({
    sector_id: 0,
    growth_score: 50,
    investment_thesis: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 섹터 목록
      const sectorsRes = await fetch('/api/etf-sectors');
      const sectorsData = await sectorsRes.json();
      setSectors(sectorsData);

      // 섹터 통계
      const statsRes = await fetch('/api/etf-sectors/stats');
      const statsData = await statsRes.json();
      setSectorStats(statsData);

      // ETF 상세 정보
      const etfRes = await fetch('/api/etf-details');
      const etfData = await etfRes.json();
      setEtfDetails(etfData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/etf-sectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectorForm)
      });
      const result = await res.json();

      if (res.ok) {
        alert(result.message);
        setShowSectorModal(false);
        resetSectorForm();
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error creating sector:', error);
      alert('섹터 생성 실패');
    }
  };

  const handleUpdateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSector) return;

    try {
      const res = await fetch('/api/etf-sectors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector_id: editingSector.id,
          ...sectorForm
        })
      });
      const result = await res.json();

      if (res.ok) {
        alert(result.message);
        setShowSectorModal(false);
        setEditingSector(null);
        resetSectorForm();
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error updating sector:', error);
      alert('섹터 업데이트 실패');
    }
  };

  const handleDeleteSector = async (sectorId: number, sectorName: string) => {
    if (!confirm(`정말 "${sectorName}" 섹터를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/etf-sectors?sector_id=${sectorId}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (res.ok) {
        alert(result.message);
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error deleting sector:', error);
      alert('섹터 삭제 실패');
    }
  };

  const handleAssignETF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedETF) return;

    try {
      const res = await fetch('/api/etf-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedETF.id,
          ...assignForm
        })
      });
      const result = await res.json();

      if (res.ok) {
        alert(result.message);
        setShowAssignModal(false);
        setSelectedETF(null);
        resetAssignForm();
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error assigning ETF:', error);
      alert('ETF 할당 실패');
    }
  };

  const openEditSector = (sector: Sector) => {
    setEditingSector(sector);
    setSectorForm({
      name: sector.name,
      description: sector.description,
      growth_outlook: sector.growth_outlook,
      color_code: sector.color_code
    });
    setShowSectorModal(true);
  };

  const openAssignETF = (etf: ETFDetail) => {
    setSelectedETF(etf);
    setAssignForm({
      sector_id: etf.sector_id || 0,
      growth_score: etf.growth_score || 50,
      investment_thesis: etf.investment_thesis || ''
    });
    setShowAssignModal(true);
  };

  const resetSectorForm = () => {
    setSectorForm({
      name: '',
      description: '',
      growth_outlook: '중립',
      color_code: '#6B7280'
    });
  };

  const resetAssignForm = () => {
    setAssignForm({
      sector_id: 0,
      growth_score: 50,
      investment_thesis: ''
    });
  };

  const formatNumber = (val: number | null) => {
    if (val == null) return '-';
    return val.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">데이터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ETF 섹터 관리
          </h1>
          <p className="text-gray-600">
            섹터를 생성/수정/삭제하고 ETF를 섹터에 할당하세요
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-semibold ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              섹터 개요
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 font-semibold ${
                activeTab === 'manage'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              섹터 관리
            </button>
            <button
              onClick={() => setActiveTab('assign')}
              className={`px-6 py-3 font-semibold ${
                activeTab === 'assign'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              ETF 할당
            </button>
          </div>
        </div>

        {/* 섹터 개요 탭 */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {sectorStats.map((stat) => (
              <div
                key={stat.sector_id}
                className="bg-white rounded-lg shadow-md p-6"
                style={{ borderLeft: `4px solid ${stat.color_code}` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {stat.sector_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {stat.growth_outlook}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                      {stat.etf_count}개 ETF
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-sm text-gray-600">평균 현재가</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatNumber(stat.avg_current_price)}원
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-sm text-gray-600">평균 120일선 괴리율</div>
                    <div className="text-lg font-bold text-gray-800">
                      {stat.avg_divergence?.toFixed(1) || '-'}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-sm text-gray-600">섹터 평가</div>
                    <div className="text-lg font-bold text-gray-800">
                      {stat.sector_valuation}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-sm text-gray-600">투자 점수</div>
                    <div className="text-lg font-bold text-gray-800">
                      {stat.sector_investment_score}점
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 섹터 관리 탭 */}
        {activeTab === 'manage' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <button
                onClick={() => {
                  setEditingSector(null);
                  resetSectorForm();
                  setShowSectorModal(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                + 새 섹터 생성
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      순서
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      섹터명
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      설명
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      성장 전망
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      색상
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sectors.map((sector) => (
                    <tr key={sector.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {sector.display_order}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                        {sector.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {sector.description?.substring(0, 50)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {sector.growth_outlook}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: sector.color_code }}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => openEditSector(sector)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteSector(sector.id, sector.name)}
                          className="text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ETF 할당 탭 */}
        {activeTab === 'assign' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    종목명
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    코드
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    현재 섹터
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    투자 점수
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    평가 신호
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {etfDetails.map((etf) => (
                  <tr key={etf.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                      {etf.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {etf.code}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {etf.sector_name ? (
                        <span
                          className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                          style={{ backgroundColor: etf.sector_color || '#6B7280' }}
                        >
                          {etf.sector_name}
                        </span>
                      ) : (
                        <span className="text-gray-400">미할당</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">
                      {etf.investment_score}점
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {etf.valuation_signal}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openAssignETF(etf)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        할당/수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 섹터 생성/수정 모달 */}
      {showSectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingSector ? '섹터 수정' : '새 섹터 생성'}
            </h2>
            <form onSubmit={editingSector ? handleUpdateSector : handleCreateSector}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">섹터명</label>
                <input
                  type="text"
                  value={sectorForm.name}
                  onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">설명</label>
                <textarea
                  value={sectorForm.description}
                  onChange={(e) => setSectorForm({ ...sectorForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">성장 전망</label>
                <select
                  value={sectorForm.growth_outlook}
                  onChange={(e) => setSectorForm({ ...sectorForm, growth_outlook: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="매우 높음">매우 높음</option>
                  <option value="높음">높음</option>
                  <option value="중립">중립</option>
                  <option value="낮음">낮음</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">색상</label>
                <input
                  type="color"
                  value={sectorForm.color_code}
                  onChange={(e) => setSectorForm({ ...sectorForm, color_code: e.target.value })}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingSector ? '수정' : '생성'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSectorModal(false);
                    setEditingSector(null);
                    resetSectorForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ETF 할당 모달 */}
      {showAssignModal && selectedETF && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {selectedETF.name} 할당
            </h2>
            <form onSubmit={handleAssignETF}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">섹터 선택</label>
                <select
                  value={assignForm.sector_id}
                  onChange={(e) => setAssignForm({ ...assignForm, sector_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="0">섹터 선택...</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  성장 점수 (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={assignForm.growth_score}
                  onChange={(e) => setAssignForm({ ...assignForm, growth_score: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">투자 논리</label>
                <textarea
                  value={assignForm.investment_thesis}
                  onChange={(e) => setAssignForm({ ...assignForm, investment_thesis: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="이 ETF의 투자 논리를 입력하세요..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  할당
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedETF(null);
                    resetAssignForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
