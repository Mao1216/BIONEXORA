import FilterPanel from './FilterPanel';
import { displayUnit } from './lib/units';
import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { measurementSeries, measurementTicks } from './lib/indicatorViews';
import { parseReportPeriod } from './lib/reporting';
import { supabase } from './lib/supabase';

const isInTarget = (value, target, comparator) => {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(target))) return false;
  switch (comparator) {
    case '>': return Number(value) > Number(target);
    case '>=': return Number(value) >= Number(target);
    case '<': return Number(value) < Number(target);
    case '<=': return Number(value) <= Number(target);
    case '=': return Number(value) === Number(target);
    default: return false;
  }
};

export default function MeasurementChart({ indicator, reports }) {
  const years = useMemo(() => [...new Set(reports.map(report => parseReportPeriod(report.period)?.year).filter(Boolean))].sort((a, b) => b - a), [reports]);
  const [year, setYear] = useState('');
  const [history, setHistory] = useState([]);
  useEffect(() => { let active = true; setHistory([]); supabase.from('indicator_target_history').select('*').eq('indicator_id', indicator.id).order('created_at').then(({ data }) => { if (active) setHistory(data || []); }); return () => { active = false; }; }, [indicator.id]);
  useEffect(() => { if (year && !years.includes(year)) setYear(''); }, [year, years]);
  const selectedReports = year ? reports.filter(report => parseReportPeriod(report.period)?.year === year) : reports;
  const resolvedReports = selectedReports.map(report => {
    if (report.measurement_target != null) return report;
    const recordedAt = report.created_at || report.registered_date || report.date;
    const nextChange = recordedAt && history.find(change => new Date(change.created_at) > new Date(recordedAt));
    return { ...report, measurement_target: nextChange ? nextChange.target : indicator.target };
  });
  const data = measurementSeries(resolvedReports);
  const ticks = measurementTicks(data, indicator.target);
  const ResultDot = ({ cx, cy, payload }) => {
    if (!Number.isFinite(Number(payload?.resultado))) return null;
    const color = isInTarget(payload.resultado, payload.meta ?? indicator.target, payload.comparator || indicator.comparator) ? '#16a34a' : '#dc2626';
    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#ffffff" strokeWidth={2} />;
  };
  if (!data.length) return <p className="py-16 text-center text-slate-500">Sin mediciones registradas.</p>;
  return <section aria-label={`Gráfica de medición de ${indicator.name}`}>
    <FilterPanel label="Filtros de tendencia"><div className="flex items-center gap-2 text-sm"><label htmlFor="measurement-year" className="font-medium text-slate-600">Año</label><select id="measurement-year" aria-label="Filtrar tendencia por año" className="rounded-lg border border-slate-300 bg-white px-3 py-2" value={year} onChange={event => setYear(event.target.value)}><option value="">Todos los años</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></div></FilterPanel>
    <div className="h-80"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 24, right: 30, left: 16, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" padding={{ left: 24, right: 24 }} tickMargin={10} tick={{ fontSize: 11 }} />
        <YAxis ticks={ticks} interval={0} domain={[ticks[0], ticks[ticks.length - 1]]} width={80} tickMargin={12} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value, name) => [`${value} ${displayUnit(indicator.unit)}`, name]} />
        <Legend />
        <Line type="stepAfter" dataKey="meta" name="Meta de la medición" stroke="#111827" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 2, fill: '#111827', stroke: '#111827' }} connectNulls={false} />
        <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#1d4ed8" strokeWidth={3} dot={<ResultDot />} />
      </LineChart>
    </ResponsiveContainer></div>
    {selectedReports.some(row => row.measurement_target == null) && <p className="text-xs text-slate-500">Para registros sin meta guardada se usa el historial de cambios disponible o la meta actual como referencia.</p>}
  </section>;
}
