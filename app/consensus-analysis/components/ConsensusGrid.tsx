import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface Company {
  id: number;
  name: string;
  code: string;
}

interface MetricRow {
  snapshot_date: string;
  ticker: string;
  company_id: number;
  company_name?: string;
  company_code?: string;
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
  companies?: Company;
}

interface ConsensusGridProps {
  data: MetricRow[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export default function ConsensusGrid({ data, loading, sortBy, sortOrder, onSort }: ConsensusGridProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600">조건에 맞는 종목이 없습니다.</p>
      </div>
    );
  }

  const getQuadBadgeColor = (quad: string): string => {
    switch (quad) {
      case 'Q1_GROWTH_RERATING':
        return 'bg-yellow-100 text-yellow-800';
      case 'Q2_GROWTH_DERATING':
        return 'bg-green-100 text-green-800 font-bold';
      case 'Q3_DECLINE_RERATING':
        return 'bg-orange-100 text-orange-800';
      case 'Q4_DECLINE_DERATING':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuadLabel = (quad: string): string => {
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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'desc' ? (
      <ArrowDownIcon className="w-4 h-4 inline ml-1" />
    ) : (
      <ArrowUpIcon className="w-4 h-4 inline ml-1" />
    );
  };

  const handleRowClick = (ticker: string) => {
    router.push(`/consensus-analysis/${ticker}`);
  };

  return (
    <div>
      {/* 모바일 카드 뷰 (md 미만 화면) */}
      <div className="md:hidden space-y-4">
        {data.map((row) => (
          <div
            key={row.ticker}
            className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleRowClick(row.ticker)}
          >
            {/* 헤더: 종목명 + 4분면 */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-lg text-gray-900">
                  {row.company_name || row.ticker}
                </div>
                <div className="text-sm text-gray-500">{row.ticker}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getQuadBadgeColor(row.quad_position)}`}>
                {getQuadLabel(row.quad_position)}
              </span>
            </div>

            {/* 메트릭 그리드 */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-xs text-gray-500">EPS 성장률</div>
                <div className={`text-lg font-bold ${row.eps_growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {row.eps_growth_pct?.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">PER 변화율</div>
                <div className={`text-lg font-bold ${row.per_growth_pct >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {row.per_growth_pct?.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* 점수 표시 */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs text-gray-500">FVB</div>
                <div className="text-sm font-semibold text-blue-600">{row.fvb_score?.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">HGS</div>
                <div className="text-sm font-semibold text-green-600">{row.hgs_score?.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">RRS</div>
                <div className="text-sm font-semibold text-red-600">{row.rrs_score?.toFixed(1)}</div>
              </div>
            </div>

            {/* 상세보기 화살표 */}
            <div className="flex items-center justify-end mt-3 text-blue-600 text-sm font-medium">
              상세보기 <ChevronRightIcon className="w-4 h-4 ml-1" />
            </div>
          </div>
        ))}
      </div>

      {/* 데스크탑 테이블 뷰 (md 이상 화면) */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  종목명
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('eps_growth_pct')}
                >
                  EPS 성장률 <SortIcon field="eps_growth_pct" />
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('per_growth_pct')}
                >
                  PER 변화율 <SortIcon field="per_growth_pct" />
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('fvb_score')}
                >
                  FVB <SortIcon field="fvb_score" />
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('hgs_score')}
                >
                  HGS <SortIcon field="hgs_score" />
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('rrs_score')}
                >
                  RRS <SortIcon field="rrs_score" />
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  4분면
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상세보기
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row) => (
                <tr
                  key={row.ticker}
                  className="hover:bg-blue-50 transition-colors group"
                >
                  {/* 종목명 */}
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => handleRowClick(row.ticker)}
                  >
                    <div className="font-medium text-gray-900 group-hover:text-blue-600">
                      {row.company_name || row.ticker}
                    </div>
                    <div className="text-sm text-gray-500">{row.ticker}</div>
                  </td>

                  {/* EPS 성장률 */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`font-semibold ${row.eps_growth_pct >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                      {row.eps_growth_pct?.toFixed(1)}%
                    </span>
                  </td>

                  {/* PER 변화율 */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`font-semibold ${row.per_growth_pct >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                    >
                      {row.per_growth_pct?.toFixed(1)}%
                    </span>
                  </td>

                  {/* FVB Score */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div
                        className="h-2 rounded"
                        style={{
                          width: `${Math.min(Math.abs(row.fvb_score) * 30, 60)}px`,
                          backgroundColor: row.fvb_score > 0 ? '#10b981' : '#ef4444'
                        }}
                      />
                      <span className="font-mono text-sm">{row.fvb_score?.toFixed(2)}</span>
                    </div>
                  </td>

                  {/* HGS Score */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`font-mono text-sm ${row.hgs_score > 20 ? 'font-bold text-green-600' : 'text-gray-700'
                        }`}
                    >
                      {row.hgs_score?.toFixed(1)}
                    </span>
                  </td>

                  {/* RRS Score */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`font-mono text-sm ${row.rrs_score > 30 ? 'font-bold text-red-600' : 'text-gray-700'
                        }`}
                    >
                      {row.rrs_score?.toFixed(1)}
                    </span>
                  </td>

                  {/* 4분면 */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${getQuadBadgeColor(row.quad_position)}`}>
                      {getQuadLabel(row.quad_position)}
                    </span>
                  </td>

                  {/* 상세보기 버튼 */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleRowClick(row.ticker)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors group-hover:scale-105 transform"
                    >
                      상세보기
                      <ChevronRightIcon className="w-4 h-4 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with row count */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            총 <span className="font-semibold">{data.length}</span>개 종목
          </p>
        </div>
      </div>
    </div>
  );
}
