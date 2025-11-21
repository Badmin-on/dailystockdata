import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface FilterState {
  date: string;
  quad: string[];
  tags: string[];
  minFvb: number;
  minHgs: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  target_y1: number;
  target_y2: number;
}

interface ConsensusFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function ConsensusFilters({ filters, onFilterChange }: ConsensusFiltersProps) {
  const quadrants = [
    { value: 'Q1_GROWTH_RERATING', label: 'Q1 성장+리레이팅', color: 'yellow' },
    { value: 'Q2_GROWTH_DERATING', label: 'Q2 성장+디레이팅 ⭐', color: 'green' },
    { value: 'Q3_DECLINE_RERATING', label: 'Q3 역성장+리레이팅', color: 'orange' },
    { value: 'Q4_DECLINE_DERATING', label: 'Q4 역성장+디레이팅', color: 'red' }
  ];

  const availableTags = [
    'HEALTHY_DERATING',
    'STRUCTURAL_IMPROVEMENT',
    'OVERHEAT_WARNING',
    'TURNAROUND_CANDIDATE',
    'HIGH_GROWTH',
    'VALUE_TRAP_WARNING',
    'MOMENTUM_SHIFT'
  ];

  const sortOptions = [
    { value: 'fvb_score', label: 'FVB 점수' },
    { value: 'hgs_score', label: 'HGS 점수' },
    { value: 'rrs_score', label: 'RRS 점수' },
    { value: 'eps_growth_pct', label: 'EPS 성장률' },
    { value: 'per_growth_pct', label: 'PER 변화율' }
  ];

  const handleQuadToggle = (quad: string) => {
    const newQuad = filters.quad.includes(quad)
      ? filters.quad.filter(q => q !== quad)
      : [...filters.quad, quad];
    onFilterChange({ ...filters, quad: newQuad });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const resetFilters = () => {
    onFilterChange({
      date: new Date().toISOString().split('T')[0],
      quad: [],
      tags: [],
      minFvb: -999,
      minHgs: -999,
      sortBy: 'fvb_score',
      sortOrder: 'desc',
      target_y1: new Date().getFullYear(),
      target_y2: new Date().getFullYear() + 1
    });
  };

  const getQuadColor = (color: string) => {
    const colors: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      red: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[color] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">필터</h2>
        </div>
        <button
          onClick={resetFilters}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <XMarkIcon className="w-4 h-4" />
          초기화
        </button>
      </div>

      {/* Date Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          기준일
        </label>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => onFilterChange({ ...filters, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Year Comparison Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          비교 기준 (성장률/변화율)
        </label>
        <select
          value={`${filters.target_y1}-${filters.target_y2}`}
          onChange={(e) => {
            const [y1, y2] = e.target.value.split('-').map(Number);
            onFilterChange({ ...filters, target_y1: y1, target_y2: y2 });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(() => {
            const currentYear = new Date().getFullYear();
            return (
              <>
                <option value={`${currentYear - 1}-${currentYear}`}>
                  {currentYear}년 성장 ({currentYear - 1} vs {currentYear}) - 실적 확인
                </option>
                <option value={`${currentYear}-${currentYear + 1}`}>
                  {currentYear + 1}년 전망 ({currentYear} vs {currentYear + 1}) - 주가 선행
                </option>
              </>
            );
          })()}
        </select>
      </div>

      {/* Quadrant Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          4분면 선택
        </label>
        <div className="grid grid-cols-2 gap-2">
          {quadrants.map((quad) => (
            <button
              key={quad.value}
              onClick={() => handleQuadToggle(quad.value)}
              className={`px-2 py-2 text-xs md:text-sm font-medium rounded-md border-2 transition-all break-keep ${filters.quad.includes(quad.value)
                ? getQuadColor(quad.color)
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
            >
              {quad.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          태그 필터
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagToggle(tag)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${filters.tags.includes(tag)
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
            >
              {tag.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Score Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            최소 FVB
          </label>
          <input
            type="number"
            step="0.1"
            value={filters.minFvb === -999 ? '' : filters.minFvb}
            onChange={(e) => onFilterChange({ ...filters, minFvb: e.target.value ? parseFloat(e.target.value) : -999 })}
            placeholder="제한 없음"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            최소 HGS
          </label>
          <input
            type="number"
            step="1"
            value={filters.minHgs === -999 ? '' : filters.minHgs}
            onChange={(e) => onFilterChange({ ...filters, minHgs: e.target.value ? parseFloat(e.target.value) : -999 })}
            placeholder="제한 없음"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          정렬 기준
        </label>
        <div className="flex gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => onFilterChange({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">높은 순</option>
            <option value="asc">낮은 순</option>
          </select>
        </div>
      </div>

      {/* User Guide */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">📘 사용 가이드</h3>

        <div className="space-y-3 text-xs text-gray-600">
          {/* 핵심 지표 */}
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="font-semibold text-blue-900 mb-2">🎯 핵심 지표</p>
            <ul className="space-y-1.5 ml-2">
              <li><span className="font-medium">FVB:</span> 펀더멘털 vs 밸류에이션 균형 (-2~+2, 높을수록 저평가)</li>
              <li><span className="font-medium">HGS:</span> 건전 성장 점수 (0~100, 30+ 우수)</li>
              <li><span className="font-medium">RRS:</span> 리레이팅 리스크 점수 (0~100, 30+ 주의)</li>
            </ul>
          </div>

          {/* 4분면 */}
          <div className="bg-green-50 p-3 rounded-md">
            <p className="font-semibold text-green-900 mb-2">📊 4분면 분석</p>
            <ul className="space-y-1.5 ml-2">
              <li><span className="font-medium text-green-700">Q2 성장+디레이팅 ⭐:</span> 목표 영역 (실적↑ PER↓)</li>
              <li><span className="font-medium text-yellow-700">Q1 성장+리레이팅:</span> 과열 가능성 (실적↑ PER↑)</li>
              <li><span className="font-medium text-orange-700">Q3 역성장+리레이팅:</span> 턴어라운드 기대</li>
              <li><span className="font-medium text-red-700">Q4 역성장+디레이팅:</span> 위험 영역 (실적↓ PER↓)</li>
            </ul>
          </div>

          {/* 투자 전략 */}
          <div className="bg-yellow-50 p-3 rounded-md">
            <p className="font-semibold text-yellow-900 mb-2">💡 투자 전략</p>
            <ul className="space-y-1.5 ml-2">
              <li><span className="font-medium">Q2 영역:</span> FVB 높고 HGS 30+ 종목 우선 검토</li>
              <li><span className="font-medium">Q1 영역:</span> RRS 30+ 시 과열 신호, 신중 접근</li>
              <li><span className="font-medium">태그 활용:</span> HEALTHY_DERATING, STRUCTURAL_IMPROVEMENT 주목</li>
              <li><span className="font-medium">경고 태그:</span> OVERHEAT_WARNING, VALUE_TRAP_WARNING 회피</li>
            </ul>
          </div>

          {/* 필터 사용법 */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="font-semibold text-gray-900 mb-2">⚙️ 필터 활용</p>
            <ul className="space-y-1.5 ml-2">
              <li>4분면 선택으로 투자 스타일별 종목 탐색</li>
              <li>최소 FVB/HGS로 퀄리티 스크리닝 (예: FVB≥0.5, HGS≥30)</li>
              <li>태그 조합으로 세부 조건 필터링 가능</li>
              <li>정렬 기준 변경으로 상위 종목 빠른 확인</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
