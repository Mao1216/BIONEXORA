import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { sameId, taskEditable, taskNotifiable, validateEvidence } from './lib/correctiveWorkflow';
import { parseReportPeriod } from './lib/reporting';

const panel = 'rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4';
const field = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900';
const primary = 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50';
const date = value => value ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium' }).format(new Date(value)) : '—';
function Status({ children }) { return <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{children}</span>; }
async function rpc(name, params) { const { data, error } = await supabase.rpc(name, params); if (error) throw error; return data; }
function useOperation(onReload) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async operation => {
    setBusy(true); setError('');
    try { await operation(); await onReload(); return true; }
    catch (failure) { await onReload(); setError(failure.message || 'No se pudo guardar. Reintenta.'); return false; }
    finally { setBusy(false); }
  };
  return { busy, run, error };
}
function ErrorMessage({ message }) { return message ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</p> : null; }
function ModuleState({ workflow }) {
  return <>{workflow.loading && <p className="text-sm text-slate-500">Cargando análisis y tareas…</p>}{workflow.error ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{workflow.error}<button onClick={workflow.reload} className="ml-3 underline">Reintentar</button></div> : <button className={secondary} disabled={workflow.loading} onClick={workflow.reload}>Actualizar estado</button>}</>;
}
function EvidenceList({ evidence }) {
  const [error, setError] = useState('');
  const download = async item => {
    setError('');
    const { data, error: failure } = await supabase.storage.from('corrective-evidence').download(item.storage_path);
    if (failure) { setError(failure.message); return; }
    const url = URL.createObjectURL(data); const link = document.createElement('a');
    link.href = url; link.download = item.file_name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div><p className="text-xs font-semibold text-slate-600 mb-2">Evidencias</p>{evidence.length ? <ul className="space-y-1">{evidence.map(item => <li key={item.id}><button className="text-sm text-blue-700 underline break-all text-left" onClick={() => download(item)}>{item.file_name}</button><span className="text-xs text-slate-500 ml-2">{Math.ceil(item.file_size / 1024)} KB</span></li>)}</ul> : <p className="text-xs text-slate-500">Sin archivos adjuntos.</p>}<ErrorMessage message={error} /></div>;
}
function CauseForm({ report, analysis, onReload, onClose }) {
  const [cause, setCause] = useState(analysis?.cause || '');
  const operation = useOperation(onReload);
  return <form className={panel} onSubmit={async event => { event.preventDefault(); if (await operation.run(() => rpc('save_cause_analysis', { measurement: report.id, cause_text: cause }))) onClose(); }}>
    <h3 className="font-semibold">Análisis de causa · {report.period}</h3>
    <label className="block text-sm">Describe la causa y el análisis realizado<textarea aria-label="Análisis de causa" required rows={5} className={`${field} mt-2`} value={cause} onChange={event => setCause(event.target.value)} /></label>
    <ErrorMessage message={operation.error} /><div className="flex flex-wrap justify-end gap-2"><button type="button" className={secondary} disabled={operation.busy} onClick={onClose}>Cancelar</button><button className={primary} disabled={operation.busy || !cause.trim()}>Guardar análisis de causa</button></div>
  </form>;
}
function ActionForm({ analysis, action, onReload, onClose }) {
  const [name, setName] = useState(action?.name || ''); const [description, setDescription] = useState(action?.description || '');
  const operation = useOperation(onReload);
  return <form className={panel} onSubmit={async event => { event.preventDefault(); if (await operation.run(() => rpc(action ? 'update_corrective_action' : 'add_corrective_action', { ...(action ? { action: action.id } : { analysis: analysis.id }), action_name: name, action_description: description }))) onClose(); }}><h4 className="font-semibold">{action ? 'Corregir acción correctiva' : 'Nueva acción correctiva'}</h4><label className="block text-sm">Nombre de la acción<input aria-label="Nombre de la acción" required className={`${field} mt-1`} value={name} onChange={event => setName(event.target.value)} /></label><label className="block text-sm">Descripción de la acción<textarea aria-label="Descripción de la acción" required className={`${field} mt-1`} value={description} onChange={event => setDescription(event.target.value)} /></label><ErrorMessage message={operation.error} /><div className="flex justify-end gap-2"><button type="button" className={secondary} disabled={operation.busy} onClick={onClose}>Cancelar</button><button className={primary} disabled={operation.busy}>Guardar acción correctiva</button></div></form>;
}
function TaskForm({ action, task, onReload, onClose }) {
  const [name, setName] = useState(task?.name || ''); const [description, setDescription] = useState(task?.description || ''); const [progress, setProgress] = useState(task?.progress ?? 0);
  const operation = useOperation(onReload);
  return <form className={panel} onSubmit={async event => { event.preventDefault(); if (await operation.run(() => rpc('save_corrective_task', { action: action.id, task: task?.id || null, task_name: name, task_description: description, task_progress: Number(progress) }))) onClose(); }}><h4 className="font-semibold">{task ? 'Editar tarea correctiva' : 'Nueva tarea correctiva'}</h4><label className="block text-sm">Nombre de la tarea<input aria-label="Nombre de la tarea" required className={`${field} mt-1`} value={name} onChange={event => setName(event.target.value)} /></label><label className="block text-sm">Descripción de la tarea<textarea aria-label="Descripción de la tarea" required className={`${field} mt-1`} value={description} onChange={event => setDescription(event.target.value)} /></label><label className="block text-sm">Porcentaje de avance<input aria-label="Porcentaje de avance" required type="number" min="0" max="100" step="1" className={`${field} mt-1`} value={progress} onChange={event => setProgress(event.target.value)} /></label><p className="text-xs text-slate-500">Escribe y guarda 100 cuando termines. Después podrás notificar esta tarea a GCG.</p><ErrorMessage message={operation.error} /><div className="flex justify-end gap-2"><button type="button" className={secondary} disabled={operation.busy} onClick={onClose}>Cancelar</button><button className={primary} disabled={operation.busy}>Guardar tarea</button></div></form>;
}
function TaskCard({ task, action, analysis, workflow, canManage }) {
  const [editing, setEditing] = useState(false); const [files, setFiles] = useState([]); const [fileKey, setFileKey] = useState(0);
  const operation = useOperation(workflow.reload);
  const editable = canManage && taskEditable(task, analysis);
  const evidence = workflow.evidence.filter(item => sameId(item.task_id, task.id));
  const upload = async () => {
    files.forEach(validateEvidence);
    for (const file of files) {
      const path = `${task.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('corrective-evidence').upload(path, file, { upsert: false });
      if (error) throw error;
      try { await rpc('register_corrective_evidence', { task: task.id, path, original_name: file.name, bytes: file.size }); setFiles(previous => previous.filter(item => item !== file)); }
      catch (failure) { await supabase.storage.from('corrective-evidence').remove([path]); throw failure; }
    }
    setFiles([]); setFileKey(value => value + 1);
  };
  return <article className="rounded-lg border border-slate-200 p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><h5 className="font-semibold text-sm">Tarea #{task.id} · {task.name}</h5><Status>{task.review_status}</Status></div><p className="text-sm whitespace-pre-wrap break-words text-slate-600">{task.description}</p><p className="text-sm">Avance guardado: <strong>{task.progress}%</strong></p>{task.review_note && <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap">GCG: {task.review_note}</p>}<EvidenceList evidence={evidence} /><ErrorMessage message={operation.error} />
    {editable && <><div className="flex flex-wrap gap-2"><button className={secondary} disabled={operation.busy} onClick={() => setEditing(value => !value)}>Editar tarea</button><button className={primary} disabled={operation.busy || editing || files.length > 0 || !taskNotifiable(task, analysis)} onClick={() => operation.run(() => rpc('notify_corrective_task', { task: task.id }))}>Notificar</button></div>{editing && <TaskForm key={`${task.id}-${task.updated_at}`} action={action} task={task} onReload={workflow.reload} onClose={() => setEditing(false)} />}<div className="space-y-2"><label className="block text-sm">Adjuntar evidencias (máximo 20 MB por archivo)<input key={fileKey} aria-label={`Evidencias tarea ${task.id}`} type="file" multiple className="block w-full mt-2 text-sm" onChange={event => setFiles(Array.from(event.target.files || []))} disabled={operation.busy} /></label><button className={secondary} disabled={operation.busy || !files.length} onClick={() => operation.run(upload)}>Subir evidencias</button></div></>}
  </article>;
}
function ActionCard({ action, analysis, workflow, canManage }) {
  const [addingTask, setAddingTask] = useState(false); const [editingAction, setEditingAction] = useState(false);
  const editable = canManage && analysis.status === 'En proceso' && !analysis.approved_at;
  return <section className="space-y-3 border-t border-slate-200 pt-4"><div className="flex flex-wrap justify-between gap-3"><div><h4 className="font-semibold">Acción #{action.id} · {action.name}</h4><p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{action.description}</p></div>{editable && <div className="flex flex-wrap gap-2">{!workflow.tasks.some(task => sameId(task.action_id,action.id) && ['En revisión','Aprobado'].includes(task.review_status)) && <button className={secondary} onClick={() => setEditingAction(value=>!value)}>Corregir acción</button>}<button className={secondary} onClick={() => setAddingTask(value => !value)}>Añadir tarea</button></div>}</div>{editingAction && <ActionForm analysis={analysis} action={action} onReload={workflow.reload} onClose={()=>setEditingAction(false)} />}{addingTask && <TaskForm action={action} onReload={workflow.reload} onClose={() => setAddingTask(false)} />}{workflow.tasks.filter(task => sameId(task.action_id, action.id)).map(task => <TaskCard key={task.id} {...{ task, action, analysis, workflow, canManage }} />)}{!workflow.tasks.some(task => sameId(task.action_id, action.id)) && <p className="text-sm text-slate-500">Añade las tareas de esta acción correctiva.</p>}</section>;
}
function AnalysisCard({ analysis, report, workflow, canManage }) {
  const [adding, setAdding] = useState(false); const [editingCause, setEditingCause] = useState(false);
  const actions = workflow.actions.filter(action => sameId(action.analysis_id, analysis.id));
  const editable = canManage && analysis.status === 'En proceso' && !analysis.approved_at;
  const causeEditable = editable && !workflow.tasks.some(task => actions.some(action => sameId(action.id, task.action_id)) && ['En revisión','Aprobado'].includes(task.review_status));
  return <article className={panel}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Análisis #{analysis.id} · {report.period}</h3><Status>{analysis.status}</Status></div><p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{analysis.cause}</p>{analysis.approved_at && analysis.status === 'En proceso' && <p className="text-sm text-slate-500">Tareas aprobadas. Esperando la siguiente medición registrada después de completar las correcciones.</p>}{analysis.status === 'Pendiente de verificación' && <p className="text-sm text-amber-800">La medición posterior volvió a salir fuera de meta. Registra un nuevo análisis para que GCG compare las causas.</p>}{editable && <div className="flex flex-wrap gap-2">{causeEditable && <button className={secondary} onClick={() => setEditingCause(value => !value)}>Editar análisis</button>}<button className={primary} onClick={() => setAdding(value => !value)}>Establecer acción correctiva</button></div>}{editingCause && <CauseForm report={report} analysis={analysis} onReload={workflow.reload} onClose={() => setEditingCause(false)} />}{adding && <ActionForm analysis={analysis} onReload={workflow.reload} onClose={() => setAdding(false)} />}{actions.map(action => <ActionCard key={action.id} {...{ action, analysis, workflow, canManage }} />)}<details className="border-t pt-3"><summary className="cursor-pointer text-sm">Historial del análisis</summary><ul className="mt-3 space-y-2 text-xs text-slate-600">{workflow.events.filter(event => sameId(event.analysis_id, analysis.id)).map(event => <li key={event.id}>{date(event.created_at)} · {event.event}{event.task_id ? ` · Tarea #${event.task_id}` : ''}{event.note ? ` · ${event.note}` : ''}</li>)}</ul></details></article>;
}
export function IndicatorCorrectiveWorkflow({ indicator, reports, workflow, canManage }) {
  const [creatingFor, setCreatingFor] = useState(null);
  const deviations = reports.filter(report => report.status === 'Fuera de meta').sort((a,b) => (parseReportPeriod(b.period)?.order ?? 0)-(parseReportPeriod(a.period)?.order ?? 0));
  return <section aria-label="Análisis de causa y acciones correctivas" className="space-y-4"><h2 className="text-lg font-semibold text-slate-900">Análisis de causa y acciones correctivas</h2><ModuleState workflow={workflow} />{!workflow.error && deviations.map(report => {
    const analysis = workflow.analyses.find(item => sameId(item.report_id, report.id));
    return analysis ? <AnalysisCard key={report.id} {...{ analysis, report, workflow, canManage }} /> : <article key={report.id} className={panel}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{report.period} · {report.result} {indicator.unit}</h3><Status>Sin análisis de causa</Status></div>{canManage && <button className={primary} onClick={() => setCreatingFor(report.id)}>Realizar análisis de causa</button>}{sameId(creatingFor, report.id) && <CauseForm report={report} onReload={workflow.reload} onClose={() => setCreatingFor(null)} />}</article>;
  })}{!workflow.error && !deviations.length && <p className="text-sm text-slate-500">No hay mediciones fuera de meta. No se requiere análisis de causa.</p>}</section>;
}
function TaskVerification({ task, workflow, indicators, objectives, reports }) {
  const action = workflow.actions.find(item => sameId(item.id, task.action_id)); const analysis = workflow.analyses.find(item => sameId(item.id, action?.analysis_id)); const report = reports.find(item => sameId(item.id, analysis?.report_id)); const indicator = indicators.find(item => sameId(item.id, report?.indicatorId)); const objective = objectives.find(item => sameId(item.id, indicator?.objectiveId));
  const [comment, setComment] = useState(''); const operation = useOperation(workflow.reload);
  return <article className={panel}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Tarea #{task.id} · {task.name}</h2><Status>{task.review_status}</Status></div><dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Objetivo</dt><dd>{objective?.code} · {objective?.name}</dd></div><div><dt className="text-slate-500">Indicador / desviación</dt><dd>{indicator?.code} · {indicator?.name} · {report?.period}: {report?.result} {indicator?.unit}</dd></div><div><dt className="text-slate-500">Análisis #{analysis?.id}</dt><dd className="whitespace-pre-wrap break-words">{analysis?.cause}</dd></div><div><dt className="text-slate-500">Acción #{action?.id} · {action?.name}</dt><dd className="whitespace-pre-wrap">{action?.description}</dd></div></dl><p className="text-sm whitespace-pre-wrap">{task.description}</p><p className="text-sm">Avance: <strong>{task.progress}%</strong> · Notificada: {date(task.notified_at)}</p><EvidenceList evidence={workflow.evidence.filter(item => sameId(item.task_id, task.id))} />{task.review_note && <p className="text-sm">Observación GCG: {task.review_note}</p>}<ErrorMessage message={operation.error} />{task.review_status === 'En revisión' && <><label className="block text-sm">Comentario de verificación<textarea aria-label={`Comentario tarea ${task.id}`} className={`${field} mt-1`} value={comment} onChange={event => setComment(event.target.value)} /></label><div className="flex justify-end gap-3"><button className={secondary} disabled={operation.busy || !comment.trim()} onClick={() => operation.run(() => rpc('review_corrective_task', { task: task.id, approve: false, review_comment: comment }))}>Observar</button><button className={primary} disabled={operation.busy} onClick={() => operation.run(() => rpc('review_corrective_task', { task: task.id, approve: true, review_comment: comment }))}>Aprobar</button></div></>}</article>;
}
function EfficacyVerification({ analysis, workflow, indicators, objectives, reports }) {
  const original = reports.find(item => sameId(item.id, analysis.report_id)); const following = reports.find(item => sameId(item.id, analysis.followup_report_id)); const nextAnalysis = workflow.analyses.find(item => sameId(item.report_id, following?.id)); const indicator = indicators.find(item => sameId(item.id, original?.indicatorId)); const objective = objectives.find(item => sameId(item.id, indicator?.objectiveId));
  const [reason, setReason] = useState(''); const operation = useOperation(workflow.reload);
  return <article className={panel}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Eficacia · Análisis #{analysis.id}</h2><Status>{analysis.status}</Status></div><p className="text-sm">{objective?.code} · {objective?.name}<br />{indicator?.code} · {indicator?.name}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"><section className="bg-slate-50 rounded-lg p-3"><h3 className="font-semibold mb-2">Causa anterior · {original?.period}</h3><p className="whitespace-pre-wrap break-words">{analysis.cause}</p></section><section className="bg-slate-50 rounded-lg p-3"><h3 className="font-semibold mb-2">Nuevo análisis · {following?.period}</h3><p className="whitespace-pre-wrap break-words">{nextAnalysis?.cause || 'El gerente aún no ha registrado el nuevo análisis de causa.'}</p></section></div><label className="block text-sm">Justificación de la decisión<textarea aria-label={`Justificación eficacia ${analysis.id}`} className={`${field} mt-1`} value={reason} onChange={event => setReason(event.target.value)} /></label><ErrorMessage message={operation.error} /><div className="flex flex-wrap justify-end gap-3"><button className={secondary} disabled={!nextAnalysis || !reason.trim() || operation.busy} onClick={() => operation.run(() => rpc('decide_cause_efficacy', { analysis: analysis.id, same_cause: true, decision_reason: reason }))}>Causa similar · No eficaz</button><button className={primary} disabled={!nextAnalysis || !reason.trim() || operation.busy} onClick={() => operation.run(() => rpc('decide_cause_efficacy', { analysis: analysis.id, same_cause: false, decision_reason: reason }))}>Causa diferente · Eficaz</button></div></article>;
}
export function VerificationsView({ workflow, indicators, objectives, reports }) {
  const [history, setHistory] = useState(false);
  const tasks = workflow.tasks.filter(task => history ? ['Aprobado','Observado'].includes(task.review_status) : task.review_status === 'En revisión');
  const pending = workflow.analyses.filter(analysis => analysis.status === 'Pendiente de verificación');
  return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Verificaciones</h1><p className="text-slate-500 mt-2">Revisa cada tarea correctiva y verifica la eficacia del análisis con la siguiente medición.</p></div><button className={secondary} onClick={() => setHistory(value => !value)}>{history ? 'Volver a pendientes' : 'Ver historial de verificaciones'}</button></header><ModuleState workflow={workflow} />{!workflow.error && <>{!history && pending.map(analysis => <EfficacyVerification key={analysis.id} {...{ analysis, workflow, indicators, objectives, reports }} />)}{tasks.map(task => <TaskVerification key={`${task.id}-${task.review_status}`} {...{ task, workflow, indicators, objectives, reports }} />)}{history && workflow.analyses.filter(analysis => ['Eficaz','No eficaz'].includes(analysis.status)).map(analysis => { const report=reports.find(item=>sameId(item.id,analysis.report_id)); const indicator=indicators.find(item=>sameId(item.id,report?.indicatorId)); return <article key={analysis.id} className={panel}><h2 className="font-semibold">Análisis #{analysis.id} · {indicator?.code} · {indicator?.name}</h2><Status>{analysis.status}</Status><p className="text-sm whitespace-pre-wrap">{analysis.cause}</p>{workflow.events.filter(event=>sameId(event.analysis_id,analysis.id)&&(/eficaz/i.test(event.event)||event.event==='Medición posterior evaluada')).map(event=><p key={event.id} className="text-sm text-slate-600">{date(event.created_at)} · {event.event} · {event.note}</p>)}</article>; })}{!tasks.length && (history || !pending.length) && <p className="text-sm text-slate-500">{history ? 'No hay tareas revisadas en el historial.' : 'No hay verificaciones pendientes.'}</p>}</>}</div>;
}
