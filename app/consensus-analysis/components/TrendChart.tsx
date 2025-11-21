import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TrendDataPoint {
  date: string;
  fvb_score: number;
  hgs_score: number;
  rrs_score: number;
  quad_position: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  metric?: 'fvb' | 'hgs' | 'rrs' | 'all';
}

export default function TrendChart({ data, metric = 'all' }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        트렌드 데이터가 없습니다
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <div className="mt-2 space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: <span className="font-semibold">{entry.value.toFixed(2)}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
          tickFormatter={(value) => {
            // Format date as MM-DD
            if (!value) return '';
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />

        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          wrapperStyle={{ fontSize: 14 }}
          iconType="line"
        />

        {/* Reference line at 0 */}
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />

        {/* Lines */}
        {(metric === 'all' || metric === 'fvb') && (
          <Line
            type="monotone"
            dataKey="fvb_score"
            stroke="#3b82f6"
            strokeWidth={2}
            name="FVB Score"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}

        {(metric === 'all' || metric === 'hgs') && (
          <Line
            type="monotone"
            dataKey="hgs_score"
            stroke="#10b981"
            strokeWidth={2}
            name="HGS Score"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}

        {(metric === 'all' || metric === 'rrs') && (
          <Line
            type="monotone"
            dataKey="rrs_score"
            stroke="#ef4444"
            strokeWidth={2}
            name="RRS Score"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
