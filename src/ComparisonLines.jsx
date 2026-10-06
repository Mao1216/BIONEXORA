import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MONTHS, parseReportPeriod } from './lib/reporting';
import { comparisonLines } from './lib/comparisonLines';

const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
function Filters({ title, color, indicators, years, value, onChange }) {
  const change = key => event => onChange({ ...value, [key]: event.target.value });
  return <section aria-label={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h2 className={`font-semibold ${color}`}>{title}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
      <label className="text-sm font-medium text-slate-600">Año<select aria-label={`${title}: Año`} className={field} value={value.year} onChange={change('year')}><option value="">Todos</option>{years.map(year => <option key={year}>{year}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-600">Mes<select aria-label={`${title}: Mes`} className={field} value={value.month} onChange={change('month')}><option value="">Todos</option>{MONTHS.map(month => <option key={month} value={month.toLowerCase()}>{month}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-600">Indicador<select aria-label={`${title}: Indicador`} className={field} value={value.indicatorId} onChange={change('indicatorId')}><option value="">Seleccionar</option>{indicators.map(indicator => <option key={indicator.id} value={indicator.id}>{indicator.code ? `${indicator.code} · ` : ''}{indicator.name}</option>)}</select></label>
    </div>
  </section>;
}

export default function ComparisonLines({ indicators, reports }) {
  const [a, setA] = useState({ indicatorId: '', year: '', month: '' });
  const [b, setB] = useState({ indicatorId: '', year: '', month: '' });
  const years = [...new Set(reports.map(report => parseReportPeriod(report.period)?.year).filter(Boolean))].sort().reverse();
  const indicatorA = indicators.find(indicator => String(indicator.id) === a.indicatorId);
  const indicatorB = indicators.find(indicator => String(indicator.id) === b.indicatorId);
  const separateUnits = Boolean(indicatorA && indicatorB && indicatorA.unit !== indicatorB.unit);
  const data = comparisonLines(reports, a, b);
  const ready = Boolean(a.indicatorId && b.indicatorId);
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
    <header><h2 className="text-lg font-bold text-slate-900">Comparativa de indicadores</h2><p className="text-sm text-slate-500 mt-1">Dos selecciones independientes en una misma gráfica de líneas.</p></header>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><Filters title="Comparativa · periodo A" color="text-blue-700" indicators={indicators} years={years} value={a} onChange={setA} /><Filters title="Comparativa · periodo B" color="text-red-700" indicators={indicators} years={years} value={b} onChange={setB} /></div>
    <p className="text-xs text-slate-500">{a.year && b.year ? 'Los años seleccionados se comparan por el mismo mes. El detalle de cada punto conserva su año.' : 'Selecciona un año en ambos filtros para superponer los meses de años distintos; con Todos se usa la fecha real.'}{separateUnits && ' Las unidades son diferentes: A usa el eje izquierdo y B el derecho.'}</p>
    {ready && data.length ? <div className="h-80" aria-label="Comparativa de indicadores con dos líneas"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 16 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="period" tick={{ fontSize: 11 }} />
      <YAxis yAxisId="a" tick={{ fontSize: 11 }} label={{ value: indicatorA?.unit || '', angle: -90, position: 'insideLeft' }} />
      {separateUnits && <YAxis yAxisId="b" orientation="right" tick={{ fontSize: 11 }} label={{ value: indicatorB?.unit || '', angle: 90, position: 'insideRight' }} />}
      <Tooltip formatter={(value, name, item) => { const key = item.dataKey; const indicator = key === 'a' ? indicatorA : indicatorB; return [`${value} ${indicator?.unit || ''} · ${item.payload[`${key}Period`] || ''}`, name]; }} />
      <Legend /><Line yAxisId="a" type="linear" dataKey="a" name={`Comparativa A · ${indicatorA?.name || ''}`} stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
      <Line yAxisId={separateUnits ? 'b' : 'a'} type="linear" dataKey="b" name={`Comparativa B · ${indicatorB?.name || ''}`} stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
    </LineChart></ResponsiveContainer></div> : <p className="py-14 text-center text-slate-500">{ready ? 'No hay mediciones para los filtros seleccionados.' : 'Selecciona un indicador en cada comparativa para ver las dos líneas.'}</p>}
    {ready && ['a', 'b'].some(key => !data.some(row => row[key] !== null)) && <p className="text-sm text-amber-700">Una de las selecciones no tiene mediciones para estos filtros; sus valores no se sustituyen por cero.</p>}
  </section>;
}
