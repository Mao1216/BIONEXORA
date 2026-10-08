import { displayUnit } from './lib/units';
import React from 'react';
import { Filter } from 'lucide-react';
import MeasurementChart from './MeasurementChart';
import { filterIndicators } from './lib/indicatorViews';
import { parseReportPeriod } from './lib/reporting';
import { personName } from './lib/personNames';

const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';

export function IndicatorFilterMenu({ objectives, indicators, users = [], filters, onChange }) {
  const responsibles = [...new Map(indicators.map(item => {
    const id = item.ownerId || item.owner_email || item.reporter_email || '';
    return id ? [String(id), personName(id, users)] : null;
  }).filter(Boolean))].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const apply = next => {
    const matches = filterIndicators(indicators, next);
    const selectedStillMatches = matches.some(item => String(item.id) === String(next.indicatorId));
    onChange({ ...next, indicatorId: selectedStillMatches ? next.indicatorId : (matches[0] ? String(matches[0].id) : '') });
  };
  const change = key => event => apply({ ...filters, [key]: event.target.value });
  const matches = filterIndicators(indicators, filters);
  return <details className="relative ml-auto shrink-0">
    <summary aria-label="Filtros de indicadores" title="Filtros de indicadores" className="flex cursor-pointer list-none items-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"><Filter className="h-5 w-5" /><span className="sr-only">Filtros de indicadores</span></summary>
    <div className="absolute right-0 top-full z-[60] mt-2 w-[min(92vw,48rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">Filtros de indicadores</p>{(filters.search || filters.objectiveId || filters.responsibleId || filters.indicatorId) && <button type="button" className="text-sm font-medium text-blue-700" onClick={() => onChange({ search: '', objectiveId: '', responsibleId: '', indicatorId: '' })}>Limpiar</button>}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="text-sm font-medium text-slate-700">Nombre o código<input className={input} placeholder="Ej.: productividad o IND-26001" value={filters.search} onChange={change('search')} /><span className="mt-1 block text-xs font-normal text-slate-500">{matches.length} indicador{matches.length === 1 ? '' : 'es'} encontrado{matches.length === 1 ? '' : 's'}</span></label>
        <label className="text-sm font-medium text-slate-700">Objetivo<select className={input} value={filters.objectiveId} onChange={change('objectiveId')}><option value="">Todos los objetivos</option>{objectives.map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Responsable<select className={input} value={filters.responsibleId} onChange={change('responsibleId')}><option value="">Todos los responsables</option>{responsibles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">Indicador<select className={input} value={filters.indicatorId} onChange={change('indicatorId')}><option value="">Seleccionar indicador ({matches.length} disponibles)</option>{matches.map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.name}</option>)}</select></label>
    </div>
  </details>;
}

export default function BioIndicatorsView({ objectives, indicators, reports, users = [], filters }) {
  const list = filterIndicators(indicators, filters);
  const indicator = list.find(item => String(item.id) === String(filters.indicatorId));
  const objective = objectives.find(item => item.id === indicator?.objectiveId);
  const rows = reports.filter(report => report.indicatorId === indicator?.id).sort((a, b) => (parseReportPeriod(b.period)?.order || 0) - (parseReportPeriod(a.period)?.order || 0) || Number(b.id) - Number(a.id));
  const latest = rows[0];
  return <div className="fade-in space-y-6">
    <header><p className="text-sm font-semibold text-red-600 uppercase">Visualizaciones · Solo lectura</p><h1 className="text-3xl font-bold text-slate-900 mt-1">Indicadores</h1><p className="text-slate-500 mt-2">Usa el embudo superior para filtrar el portafolio y seleccionar el indicador que deseas consultar.</p></header>
    {!list.length && <p className="rounded-xl bg-white border p-8 text-center text-slate-500">No hay indicadores que coincidan con estos filtros.</p>}
    {indicator ? <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <div><p className="text-sm text-slate-500">{objective?.code} · {objective?.name}</p><p className="text-xs font-semibold text-blue-700 mt-4">{indicator.code}</p><h2 className="text-2xl font-bold text-slate-900 mt-1">{indicator.name}</h2><p className="text-slate-500 mt-3 break-words">Fórmula: {indicator.formula || '—'}</p><p className="text-sm text-slate-500 mt-2">Frecuencia: {indicator.frequency}</p></div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center"><p className="text-sm text-slate-500">Última medición · {latest?.period || 'Sin reporte'}</p><p className="text-4xl font-bold text-slate-900 mt-3">{latest?.result ?? '—'} <span className="text-xl">{displayUnit(indicator.unit)}</span></p><p className={`text-sm font-semibold mt-2 ${['En meta','Sin datos'].includes(latest?.status) ? 'text-green-700' : 'text-amber-700'}`}>{latest?.status || 'Sin reporte'}</p><p className="text-xs text-slate-500 mt-3">Meta actual: {indicator.comparator} {indicator.target} {displayUnit(indicator.unit)}</p></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-semibold text-slate-900 mb-4">Mediciones del indicador</h3><MeasurementChart indicator={indicator} reports={rows} /></section>
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><h3 className="p-5 border-b font-semibold">Historial de mediciones</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Periodo</th><th className="p-4">Resultado</th><th className="p-4">Estado</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-4">{row.period}</td><td className="p-4 font-medium">{row.result == null ? 'Sin datos' : row.result + ' ' + displayUnit(indicator.unit)}</td><td className="p-4">{row.status}</td></tr>)}{!rows.length && <tr><td colSpan="3" className="p-8 text-center text-slate-500">Sin mediciones.</td></tr>}</tbody></table></div></section>
    </div> : list.length > 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">Selecciona un indicador desde el embudo superior para ver su ficha, gráfica e historial.</p>}
  </div>;
}
