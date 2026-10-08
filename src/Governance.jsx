import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { indicatorAccess } from './lib/responsibility';

const box = 'bg-white border border-slate-200 rounded-lg p-3 space-y-2';
const field = 'border border-slate-300 rounded-lg p-2 text-sm w-full';
const button = 'bg-blue-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50';
const compactDetails = 'bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm';

export { default as ComparisonCharts } from './ComparisonLines';

export function AssignedIndicators({ indicators, objectives, ownIds, isSuperAdmin = false, onSelect }) {
  const assigned = indicators.filter(i => indicatorAccess(i, objectives.find(o => o.id === i.objectiveId), ownIds, isSuperAdmin).canReport);
  return <div className="space-y-5"><h1 className="text-2xl font-bold">Indicadores asignados</h1><p className="text-slate-500">Reporta tus indicadores o delega el reporte. Las modificaciones requieren aprobación de GCG.</p>{assigned.map(i => <button key={i.id} className={`${box} w-full text-left hover:border-blue-400`} onClick={() => onSelect(i)}><h2 className="font-semibold">{i.name}</h2><p className="text-sm">Meta: {i.comparator} {i.target} {i.unit} · {i.status}</p></button>)}{!assigned.length && <p>No tienes indicadores asignados.</p>}</div>;
}

export function BioIndicators({ objectives, indicators, reports }) {
  const [search, setSearch] = useState('');
  return <div className="space-y-5"><h1 className="text-2xl font-bold">Bio Indicadores</h1><p className="text-slate-500">Portafolio institucional · solo visualización para todos los usuarios.</p><input aria-label="Buscar objetivo o indicador" placeholder="Buscar objetivo o indicador" className={field} value={search} onChange={e => setSearch(e.target.value)}/>{objectives.filter(o => `${o.name} ${indicators.filter(i => i.objectiveId === o.id).map(i => i.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(o => <section key={o.id} className={box}><h2 className="font-bold">{o.name}</h2><p>{o.description}</p><p className="text-sm text-slate-500">Vigencia: {o.validityStartYear || '—'} a {o.validityEndYear || '—'} · Avance: {o.progress}%</p>{indicators.filter(i => i.objectiveId === o.id).map(i => <article key={i.id} className="border-t pt-4"><h3 className="font-semibold">{i.name}</h3><p className="text-sm">Meta: {i.comparator} {i.target} {i.unit} · {i.frequency}</p><p className="text-sm text-slate-500">Fórmula: {i.formula || '—'}</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Periodo</th><th className="text-left">Resultado</th><th className="text-left">Estado</th></tr></thead><tbody>{reports.filter(r => r.indicatorId === i.id).map(r => <tr key={r.id}><td>{r.period}</td><td>{r.result} {i.unit}</td><td>{r.status}</td></tr>)}</tbody></table></div></article>)}{!indicators.some(i => i.objectiveId === o.id) && <p className="text-slate-500">Sin indicadores.</p>}</section>)}{!objectives.length && <p>No hay objetivos registrados.</p>}</div>;
}

export function IndicatorControls({ indicator, reports, isGcg, canManage, users, session, onReload, onError, onNotify }) {
  const [kind, setKind] = useState('target');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [reportId, setReportId] = useState('');
  const [comparator, setComparator] = useState(indicator.comparator);
  const [historicalTarget, setHistoricalTarget] = useState('');
  const selectedReport = reports.find(r => String(r.id) === reportId);
  const needsHistoricalTarget = kind === 'report' && selectedReport && selectedReport.measurement_target == null;
  const [delegate, setDelegate] = useState(indicator.reporter_email || '');
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState([]);
  const [definition, setDefinition] = useState({ name: indicator.name, resource: indicator.resource || '', formula: indicator.formula || '', unit: indicator.unit, frequency: indicator.frequency, review_frequency: indicator.reviewFrequency || indicator.frequency, owner_email: indicator.ownerId || '' });
  useEffect(() => {
    if (!isGcg) { setAudit([]); return; }
    let active = true;
    supabase.from('indicator_change_audit').select('id,kind,reason,changed_email,created_at').eq('indicator_id', indicator.id).order('created_at', { ascending: false }).then(({ data }) => { if (active) setAudit(data || []); });
    return () => { active = false; };
  }, [indicator.id, isGcg]);
  const saveDefinition = async e => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.rpc('apply_gcg_indicator_change', { indicator: indicator.id, change_kind: 'definition', target_report: null, proposed: definition, change_reason: 'Actualización de definición por GCG' });
    setBusy(false);
    if (error) onError(error.message); else { await onReload(); const { data } = await supabase.from('indicator_change_audit').select('id,kind,reason,changed_email,created_at').eq('indicator_id', indicator.id).order('created_at', { ascending: false }); setAudit(data || []); onNotify('Definición actualizada por GCG.'); }
  };
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    const proposed = kind === 'target' ? { target: Number(value), comparator } : kind === 'report' ? { result: Number(value) } : kind === 'delete_report' ? {} : { name: value };
    if (needsHistoricalTarget) {
      if (historicalTarget === '') { setBusy(false); onError('Indica la meta histórica para la revisión de GCG.'); return; }
      proposed.measurement_target = Number(historicalTarget);
      proposed.measurement_comparator = comparator;
    }
    const direct = isGcg;
    const { error } = direct
      ? await supabase.rpc('apply_gcg_indicator_change', { indicator: indicator.id, change_kind: kind, target_report: ['report', 'delete_report'].includes(kind) ? Number(reportId) : null, proposed, change_reason: reason })
      : await supabase.from('indicator_change_requests').insert({ indicator_id: indicator.id, report_id: ['report', 'delete_report'].includes(kind) ? Number(reportId) : null, kind, proposed, reason, requested_by: session.user.id });
    setBusy(false);
    if (error) { onError(error.message); return; }
    setValue(''); setReason(''); setReportId(''); await onReload(); if (direct) { const { data } = await supabase.from('indicator_change_audit').select('id,kind,reason,changed_email,created_at').eq('indicator_id', indicator.id).order('created_at', { ascending: false }); setAudit(data || []); } onNotify(direct ? 'Cambio aplicado y guardado en el historial.' : 'Solicitud enviada a GCG. El registro vigente no cambia.');
  };
  const assign = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('assign_indicator_reporter', { indicator: indicator.id, reporter: delegate || null });
    setBusy(false);
    if (error) onError(error.message); else { await onReload(); onNotify('Responsable de reporte actualizado.'); }
  };
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start text-sm [&_summary]:text-sm [&_summary]:font-medium [&_form]:mt-3">
    {needsHistoricalTarget && <div className={box}><p className="text-sm text-amber-800">Esta medición anterior no tiene meta histórica. Indica la meta que correspondía; GCG debe verificarla al aprobar la corrección.</p><label className="text-sm">Meta histórica propuesta<input type="number" step="any" className={field} value={historicalTarget} onChange={e => setHistoricalTarget(e.target.value)}/></label><label className="text-sm">Comparador histórico<select className={field} value={comparator} onChange={e => setComparator(e.target.value)}>{['>=','>','<=','<','='].map(c => <option key={c}>{c}</option>)}</select></label></div>}
    {isGcg && <details className={box}><summary className="cursor-pointer font-semibold">Editar definición · GCG</summary><form onSubmit={saveDefinition} className="space-y-3">
      {Object.entries({ name: 'Nombre', resource: 'Recursos', formula: 'Fórmula', unit: 'Unidad' }).map(([key,label]) => <label key={key} className="block text-sm">{label}<input required={key === 'name' || key === 'unit'} className={field} value={definition[key]} onChange={e => setDefinition({ ...definition, [key]: e.target.value })}/></label>)}
      {['frequency','review_frequency'].map(key => <label key={key} className="block text-sm">{key === 'frequency' ? 'Frecuencia de medición' : 'Frecuencia de revisión'}<select className={field} value={definition[key]} onChange={e => setDefinition({ ...definition, [key]: e.target.value })}>{['Mensual','Bimestral','Trimestral','Semestral','Anual'].map(f => <option key={f}>{f}</option>)}</select></label>)}
      <label className="block text-sm">Responsable del reporte<select required className={field} value={definition.owner_email} onChange={e => setDefinition({ ...definition, owner_email: e.target.value })}><option value="">Seleccionar</option>{users.filter(u => u.role === 'gerente_responsable').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><p className="text-xs text-slate-500">Cada cambio realizado por GCG queda registrado en el historial.</p><button className={button} disabled={busy}>Guardar definición</button>
    </form></details>}
    <details className={box}><summary className="cursor-pointer font-semibold">{isGcg ? 'Modificar indicador' : 'Solicitar modificación a GCG'}</summary><form onSubmit={submit} className="space-y-3"><select aria-label="Tipo de modificación" className={field} value={kind} onChange={e => {setKind(e.target.value); setValue(''); setReportId('');}}><option value="target">Cambiar meta</option><option value="report">Corregir medición registrada</option><option value="delete_report">Eliminar reporte</option><option value="definition">Cambiar nombre del indicador</option></select>{kind === 'target' && <select aria-label="Comparador propuesto" className={field} value={comparator} onChange={e => setComparator(e.target.value)}>{['>=','>','<=','<','='].map(c => <option key={c}>{c}</option>)}</select>}{['report', 'delete_report'].includes(kind) && <><select aria-label="Medición" required className={field} value={reportId} onChange={e => setReportId(e.target.value)}><option value="">Selecciona la medición</option>{reports.map(r => <option key={r.id} value={r.id}>{r.period}: {r.result}</option>)}</select>{selectedReport && <p className="text-xs text-slate-500">Periodo solicitado: <strong>{selectedReport.period}</strong></p>}</>}{kind !== 'delete_report' && <input aria-label="Valor propuesto" required type={kind === 'definition' ? 'text' : 'number'} step="any" className={field} placeholder="Nuevo valor propuesto" value={value} onChange={e => setValue(e.target.value)}/>}<textarea aria-label="Motivo" required className={field} placeholder="Motivo de la modificación" value={reason} onChange={e => setReason(e.target.value)}/><button disabled={busy} className={button}>{isGcg ? 'Guardar cambio' : 'Enviar solicitud'}</button></form></details>
    {isGcg && <details className={box}><summary className="cursor-pointer font-semibold">Historial de cambios</summary><div className="space-y-2 text-xs text-slate-600">{audit.map(entry => <article key={entry.id} className="border-t border-slate-100 pt-2"><strong>{({ target: 'Meta', report: 'Medición', delete_report: 'Eliminación de reporte', definition: 'Definición' })[entry.kind] || entry.kind}</strong> · {new Date(entry.created_at).toLocaleString('es-PE')}<br />{entry.reason}<br /><span className="text-slate-400">{entry.changed_email}</span></article>)}{!audit.length && <p>No hay cambios directos registrados.</p>}</div></details>}
    {!isGcg && canManage && <details className={box}><summary className="cursor-pointer font-semibold">Asignar responsable de reporte</summary><select aria-label="Responsable del reporte" className={field} value={delegate} onChange={e => setDelegate(e.target.value)}><option value="">Reportar personalmente</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select><button disabled={busy} className={button} onClick={assign}>Guardar responsable</button></details>}
  </div>;
}

export { default as ChangeRequests } from './ChangeRequestsView';
