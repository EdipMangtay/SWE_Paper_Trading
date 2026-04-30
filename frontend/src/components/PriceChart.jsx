// src/components/PriceChart.jsx
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { fmtUSD } from './format.js';

export default function PriceChart({ data, height = 240, color = '#10B981' }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-60 grid place-items-center text-white/40 text-sm">
        Waiting for chart data…
      </div>
    );
  }

  const formatted = data.map((p) => ({
    time: new Date(p.time).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit' }),
    price: p.price
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{ fill: '#ffffff60', fontSize: 11 }} stroke="#ffffff10" minTickGap={40} />
        <YAxis
          tick={{ fill: '#ffffff60', fontSize: 11 }}
          stroke="#ffffff10"
          domain={['auto', 'auto']}
          tickFormatter={(v) => fmtUSD(v, { digits: v < 1 ? 4 : 0 })}
          width={70}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#ffffff80' }}
          formatter={(v) => [fmtUSD(v), 'Price']}
        />
        <Area type="monotone" dataKey="price" stroke={color} fill="url(#grad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
