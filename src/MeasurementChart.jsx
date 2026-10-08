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

function MeasurementTooltip({ active, payload, label, unit, defaultComparator }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row || row.resultado == null) return null;
  const comparator = row.comparator || defaultComparator;
  const inTarget = isInTarget(row.resultado, row.meta, comparator);
  return <div className="min-w-56 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl">
    <p className="font-semibold text-slate-900">{label}</p>
    <div className="mt-3 space-y-2 text-sm">
      <p className="flex items-center justify-between gap-5 text-slate-600"><span>Meta de la medición</span><strong className="text-slate-900">{comparator} {row.meta} {unit}</strong></p>
      <p className="flex items-center justify-between gap-5 text-slate-600"><span>Resultado</span><strong className="text-blue-700">{row.resultado} {unit}</strong></p>
      <p className={`mt-2 flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${inTarget ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}><span className={`h-2 w-2 rounded-full ${inTarget ? 'bg-green-500' : 'bg-red-500'}`}></span>{inTarget ? 'En meta' : 'Fuera de meta'}</p>
    </div>
  </div>;
}

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
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-green-600"></i>Resultado en meta</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-red-600"></i>Resultado fuera de meta</span><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-slate-900"></i>Meta de la medición</span></div>
    <div className="h-[21rem] rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 24, right: 34, left: 18, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" padding={{ left: 24, right: 24 }} tickMargin={12} tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#94a3b8' }} />
        <YAxis ticks={ticks} interval={0} domain={[ticks[0], ticks[ticks.length - 1]]} width={80} tickMargin={14} tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#94a3b8' }} />
        <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} content={<MeasurementTooltip unit={displayUnit(indicator.unit)} defaultComparator={indicator.comparator} />} />
        <Legend />
        <Line type="stepAfter" dataKey="meta" name={`Meta (${indicator.comparator})`} stroke="#111827" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 2.5, fill: '#111827', stroke: '#111827' }} connectNulls={false} />
        <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#1d4ed8" strokeWidth={3} dot={props => <ResultDot {...props} />} activeDot={props => <ResultDot {...props} r={6} />} />
      </LineChart>
    </ResponsiveContainer></div>
    {selectedReports.some(row => row.measurement_target == null) && <p className="text-xs text-slate-500">Para registros sin meta guardada se usa el historial de cambios disponible o la meta actual como referencia.</p>}
  </section>;
}
