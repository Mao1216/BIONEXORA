import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { measurementSeries, measurementTicks } from './lib/indicatorViews';
import { parseReportPeriod } from './lib/reporting';

export default function MeasurementChart({ indicator, reports }) {
  const years = useMemo(() => [...new Set(reports.map(report => parseReportPeriod(report.period)?.year).filter(Boolean))].sort((a, b) => b - a), [reports]);
  const [year, setYear] = useState('');
  useEffect(() => { if (year && !years.includes(Number(year))) setYear(''); }, [year, years]);
  const data = measurementSeries(year ? reports.filter(report => parseReportPeriod(report.period)?.year === Number(year)) : reports);
  const ticks = measurementTicks(data, indicator.target);
  if (!data.length) return <p className="py-16 text-center text-slate-500">Sin mediciones registradas.</p>;
  return <section aria-label={`Gráfica de medición de ${indicator.name}`}>
    <div className="mb-4 flex items-center gap-2 text-sm"><label htmlFor="measurement-year" className="font-medium text-slate-600">Año</label><select id="measurement-year" aria-label="Filtrar tendencia por año" className="rounded-lg border border-slate-300 bg-white px-3 py-2" value={year} onChange={event => setYear(event.target.value)}><option value="">Todos los años</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
    <div className="h-80"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 24, right: 30, left: 16, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis ticks={ticks} interval={0} domain={[ticks[0], ticks[ticks.length - 1]]} width={80} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value, name) => [`${value} ${indicator.unit}`, name]} />
        <Legend />
        <Line type="stepAfter" dataKey="meta" name="Meta de la medición" stroke="#16a34a" strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer></div>
    {data.some(row => row.meta === null) && <p className="text-xs text-slate-500">Las mediciones antiguas sin meta histórica no muestran una meta atribuida.</p>}
  </section>;
}
