import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { measurementSeries, measurementTicks } from './lib/indicatorViews';

export default function MeasurementChart({ indicator, reports }) {
  const data = measurementSeries(reports);
  const ticks = measurementTicks(data, indicator.target);
  if (!data.length) return <p className="py-16 text-center text-slate-500">Sin mediciones registradas.</p>;
  return <section aria-label={`Gráfica de medición de ${indicator.name}. Meta actual: ${indicator.target} ${indicator.unit}`}>
    <div className="h-80"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 24, right: 30, left: 16, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis ticks={ticks} interval={0} domain={[ticks[0], ticks[ticks.length - 1]]} width={80} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value, name) => [`${value} ${indicator.unit}`, name]} />
        <Legend />
        <ReferenceLine y={Number(indicator.target)} stroke="#16a34a" strokeDasharray="6 4" label={{ value: `Meta actual: ${indicator.target}`, fill: '#15803d', position: 'insideTopRight', fontSize: 12 }} />
        <Line type="monotone" dataKey="meta" name="Meta de la medición" stroke="#16a34a" strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer></div>
    {data.some(row => row.meta === null) && <p className="text-xs text-slate-500">Las mediciones antiguas sin meta histórica no muestran una meta atribuida.</p>}
  </section>;
}
