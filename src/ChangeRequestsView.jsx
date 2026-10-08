import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { requestGroups, requestStatus } from './lib/requestViews';

const labels = { target: 'Meta', comparator: 'Comparador', result: 'Resultado', name: 'Nombre', measurement_target: 'Meta histórica', measurement_comparator: 'Comparador histórico' };
function Values({ values }) {
  return <dl className="space-y-2">{Object.entries(values || {}).map(([key, value]) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500">{labels[key] || key}</dt><dd className="font-medium text-slate-900 break-words">{String(value ?? '—')}</dd></div>)}{!Object.keys(values || {}).length && <p className="text-slate-400">Sin datos.</p>}</dl>;
}

export default function ChangeRequestsView({ isGcg, indicators, onReload, onError }) {
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [comments, setComments] = useState({});
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('indicator_change_requests').select('*').order('created_at', { ascending: false });
    if (error) { setErrorMessage(error.message); onError(error.message); } else { setRequests(data || []); setErrorMessage(''); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const review = async (id, approve) => {
    setBusyId(id);
    const { error } = await supabase.rpc('review_indicator_change', { request_id: id, approve, review_comment: comments[id] || null });
    if (error) onError(error.message); else { await load(); await onReload(); }
    setBusyId(null);
  };
  const visible = requestGroups(requests, history);
  const formatDate = date => date ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium' }).format(new Date(date)) : '—';
  return <div className="fade-in space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><p className="text-sm font-semibold text-red-600 uppercase">{isGcg ? 'Solicitudes de revisión' : 'Solicitudes'}</p><h1 className="text-2xl font-bold text-slate-900 mt-1">{history ? 'Historial de solicitudes' : 'Solicitudes de modificación'}</h1><p className="text-slate-500 mt-2">{history ? 'Solicitudes aprobadas o rechazadas por GCG.' : 'Los cambios enviados permanecen en revisión hasta que GCG los apruebe o rechace.'}</p></div><button className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setHistory(value => !value)}>{history ? 'Volver a solicitudes en revisión' : 'Ver historial de solicitudes'}</button></header>
    {loading ? <p className="p-8 text-center text-slate-500">Cargando solicitudes…</p> : errorMessage ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"><p>No se pudieron cargar las solicitudes: {errorMessage}</p><button className="mt-3 underline" onClick={load}>Reintentar</button></div> : <>
      <p className="text-sm text-slate-500">{visible.length} {history ? 'solicitudes resueltas' : 'solicitudes en revisión'}</p>
      {visible.map(request => {
        const indicator = indicators.find(item => item.id === request.indicator_id);
        const status = requestStatus(request.status);
        return <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between gap-3"><div><p className="text-xs font-semibold text-blue-700">Solicitud #{request.id} · {indicator?.code}</p><h2 className="text-lg font-semibold text-slate-900 mt-1">{indicator?.name || 'Indicador no disponible'}</h2><p className="text-sm text-slate-500 mt-1">{request.kind === 'target' ? 'Cambio de meta' : request.kind === 'report' ? 'Corrección de medición' : request.kind === 'delete_report' ? 'Eliminación de reporte' : 'Cambio de nombre'} · Enviada: {formatDate(request.created_at)}</p><p className="text-sm text-slate-600 mt-1">Solicitada por: <strong>{request.requested_email || 'Usuario registrado'}</strong>{request.proposed?.period ? ` · Periodo: ${request.proposed.period}` : ''}</p></div><span className={`h-fit self-start rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'Aprobado' ? 'bg-green-50 text-green-700' : request.status === 'Rechazado' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{status}</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><section className="rounded-xl bg-slate-50 border border-slate-200 p-4"><h3 className="font-semibold mb-3">Valor al enviar la solicitud</h3><Values values={request.previous} /></section><section className="rounded-xl bg-blue-50 border border-blue-100 p-4"><h3 className="font-semibold mb-3">Cambio propuesto</h3><Values values={request.proposed} /></section></div>
          <div><h3 className="text-sm font-semibold text-slate-700">Motivo</h3><p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{request.reason}</p></div>
          {history && <><p className="text-xs text-slate-500">Revisada: {formatDate(request.reviewed_at)}</p>{request.review_comment && <p className="text-sm text-slate-600">Comentario GCG: {request.review_comment}</p>}</>}
          {isGcg && !history && <div className="space-y-3 border-t pt-4"><label className="block text-sm font-medium text-slate-700">Comentarios de revisión{comments[request.id] ? '' : ' (obligatorio al rechazar)'}<textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={comments[request.id] || ''} onChange={event => setComments(current => ({ ...current, [request.id]: event.target.value }))} /></label><div className="flex flex-wrap justify-end gap-3"><button disabled={busyId !== null || !(comments[request.id] || '').trim()} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50" onClick={() => review(request.id, false)}>Rechazar</button><button disabled={busyId !== null} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={() => review(request.id, true)}>{busyId === request.id ? 'Procesando…' : 'Aprobar cambio'}</button></div></div>}
        </article>;
      })}
      {!visible.length && <p className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">{history ? 'Todavía no hay solicitudes aprobadas o rechazadas.' : 'No hay solicitudes en revisión.'}</p>}
    </>}
  </div>;
}
