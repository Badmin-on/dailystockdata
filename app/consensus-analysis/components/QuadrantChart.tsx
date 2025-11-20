import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Label } from 'recharts';

interface QuadrantDataPoint {
  ticker: string;
  company_name: string;
  quad_x: number;
  quad_y: number;
  quad_position: string;
  fvb_score: number;
  hgs_score: number;
}

interface QuadrantChartProps {
  data: QuadrantDataPoint[];
  onPointClick?: (ticker: string) => void;
}

export default function QuadrantChart({ data, onPointClick }: QuadrantChartProps) {
  const getColor = (quad: string): string => {
    switch (quad) {
      case 'Q1_GROWTH_RERATING':
        return '#fbbf24'; // 노랑
      case 'Q2_GROWTH_DERATING':
        return '#10b981'; // 초록 (Target)
      case 'Q3_DECLINE_RERATING':
        return '#f59e0b'; // 주황
      case 'Q4_DECLINE_DERATING':
        return '#ef4444'; // 빨강
      default:
        return '#6b7280'; // 회색
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-bold text-gray-900">{data.company_name}</p>
          <p className="text-sm text-gray-600">{data.ticker}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>EPS 성장률: <span className="font-semibold">{data.quad_x.toFixed(1)}%</span></p>
            <p>PER 변화율: <span className="font-semibold">{data.quad_y.toFixed(1)}%</span></p>
            <p>FVB: <span className="font-semibold">{data.fvb_score.toFixed(2)}</span></p>
            <p>HGS: <span className="font-semibold">{data.hgs_score.toFixed(1)}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#fbbf24]"></div>
          <span>Q1 성장+리레이팅</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
          <span className="font-semibold">Q2 성장+디레이팅 ⭐</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
          <span>Q3 역성장+리레이팅</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
          <span>Q4 역성장+디레이팅</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
          {/* Grid */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {/* X축: EPS 성장률 */}
          <XAxis
            type="number"
            dataKey="quad_x"
            name="EPS 성장률"
            unit="%"
            domain={[-50, 100]}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          >
            <Label value="EPS 성장률 (%)" position="bottom" offset={10} style={{ fontSize: 14, fill: '#374151' }} />
          </XAxis>

          {/* Y축: PER 변화율 */}
          <YAxis
            type="number"
            dataKey="quad_y"
            name="PER 변화율"
            unit="%"
            domain={[-50, 100]}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          >
            <Label value="PER 변화율 (%)" angle={-90} position="left" offset={15} style={{ fontSize: 14, fill: '#374151' }} />
          </YAxis>

          {/* 기준선 (0,0) */}
          <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={2} strokeDasharray="3 3" />
          <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} strokeDasharray="3 3" />

          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

          {/* Scatter Plot */}
          <Scatter
            data={data}
            fill="#8884d8"
            shape="circle"
            onClick={(data) => {
              if (onPointClick && data.ticker) {
                onPointClick(data.ticker);
              }
            }}
            cursor="pointer"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry.quad_position)}
                opacity={0.8}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Quadrant Labels (Overlay) */}
      <div className="absolute top-24 right-12 text-xs font-semibold text-yellow-600 opacity-30 pointer-events-none">
        Q1
      </div>
      <div className="absolute bottom-20 right-12 text-xs font-semibold text-green-600 opacity-30 pointer-events-none">
        Q2 ⭐
      </div>
      <div className="absolute top-24 left-12 text-xs font-semibold text-orange-600 opacity-30 pointer-events-none">
        Q3
      </div>
      <div className="absolute bottom-20 left-12 text-xs font-semibold text-red-600 opacity-30 pointer-events-none">
        Q4
      </div>
    </div>
  );
}
