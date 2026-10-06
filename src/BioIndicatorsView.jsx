import React, { useState } from 'react';
import MeasurementChart from './MeasurementChart';
import { creationYear, filterIndicators } from './lib/indicatorViews';
import { parseReportPeriod } from './lib/reporting';

const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
export default function BioIndicatorsView({ objectives, indicators, reports }) {
  const [search, setSearch] = useState('');
  const [objectiveId, setObjectiveId] = useState('');
  const [year, setYear] = useState('');
  const [indicatorId, setIndicatorId] = useState('');
  const list = filterIndicators(indicators, { search, objectiveId, year });
  const indicator = list.find(item => String(item.id) === indicatorId);
  const objective = objectives.find(item => item.id === indicator?.objectiveId);
  const years = [...new Set(indicators.map(creationYear).filter(Boolean))].sort().reverse();
  const rows = reports.filter(report => report.indicatorId === indicator?.id).sort((a, b) => (parseReportPeriod(b.period)?.order || 0) - (parseReportPeriod(a.period)?.order || 0) || Number(b.id) - Number(a.id));
  const latest = rows[0];
  const resetSelection = setter => event => { setter(event.target.value); setIndicatorId(''); };
  return <div className="fade-in space-y-6">
    <header><p className="text-sm font-semibold text-red-600 uppercase">Visualizaciones · Solo lectura</p><h1 className="text-3xl font-bold text-slate-900 mt-1">Indicadores</h1><p className="text-slate-500 mt-2">Filtra el portafolio y selecciona el indicador que deseas consultar.</p></header>
    <section aria-label="Filtros de indicadores" className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="text-sm font-medium text-slate-700">Nombre o código<input className={input} placeholder="Ej.: productividad o IND-26001" value={search} onChange={resetSelection(setSearch)} /></label>
        <label className="text-sm font-medium text-slate-700">Objetivo<select className={input} value={objectiveId} onChange={resetSelection(setObjectiveId)}><option value="">Todos los objetivos</option>{objectives.map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Año de creación<select className={input} value={year} onChange={resetSelection(setYear)}><option value="">Todos los años</option>{years.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="block text-sm font-medium text-slate-700">Indicador<select className={input} value={indicatorId} onChange={event => setIndicatorId(event.target.value)}><option value="">Seleccionar indicador ({list.length} disponibles)</option>{list.map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.name}</option>)}</select></label>
      {(search || objectiveId || year || indicatorId) && <button className="text-sm font-medium text-blue-700" onClick={() => { setSearch(''); setObjectiveId(''); setYear(''); setIndicatorId(''); }}>Limpiar filtros</button>}
    </section>
    {!list.length && <p className="rounded-xl bg-white border p-8 text-center text-slate-500">No hay indicadores que coincidan con estos filtros.</p>}
    {indicator ? <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <div><p className="text-sm text-slate-500">{objective?.code} · {objective?.name}</p><p className="text-xs font-semibold text-blue-700 mt-4">{indicator.code}</p><h2 className="text-2xl font-bold text-slate-900 mt-1">{indicator.name}</h2><p className="text-slate-500 mt-3 break-words">Fórmula: {indicator.formula || '—'}</p><p className="text-sm text-slate-500 mt-2">Frecuencia: {indicator.frequency}</p></div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center"><p className="text-sm text-slate-500">Última medición · {latest?.period || 'Sin reporte'}</p><p className="text-4xl font-bold text-slate-900 mt-3">{latest?.result ?? '—'} <span className="text-xl">{indicator.unit}</span></p><p className={`text-sm font-semibold mt-2 ${latest?.status === 'En meta' ? 'text-green-700' : 'text-amber-700'}`}>{latest?.status || 'Sin reporte'}</p><p className="text-xs text-slate-500 mt-3">Meta actual: {indicator.comparator} {indicator.target} {indicator.unit}</p></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-semibold text-slate-900 mb-4">Mediciones del indicador</h3><MeasurementChart indicator={indicator} reports={rows} /></section>
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><h3 className="p-5 border-b font-semibold">Historial de mediciones</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Periodo</th><th className="p-4">Resultado</th><th className="p-4">Meta histórica</th><th className="p-4">Estado</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-4">{row.period}</td><td className="p-4 font-medium">{row.result} {indicator.unit}</td><td className="p-4">{row.measurement_target == null ? 'No registrada' : `${row.measurement_comparator || ''} ${row.measurement_target} ${indicator.unit}`}</td><td className="p-4">{row.status}</td></tr>)}{!rows.length && <tr><td colSpan="4" className="p-8 text-center text-slate-500">Sin mediciones.</td></tr>}</tbody></table></div></section>
    </div> : list.length > 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">Selecciona un indicador en los filtros para ver su ficha, gráfica e historial.</p>}
  </div>;
}
