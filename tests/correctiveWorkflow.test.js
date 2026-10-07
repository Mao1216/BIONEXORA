import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionIndicators, latestMeasurement, taskEditable, taskNotifiable, efficacyFromFollowup, validateEvidence } from '../src/lib/correctiveWorkflow.js';

const origin = { id: 1, indicatorId: 1, period: 'Enero,2026', status: 'Fuera de meta', created_at: '2026-01-31' };
const analysis = { status: 'En proceso', approved_at: null };
test('cada tarea se notifica independientemente, únicamente con avance guardado en 100', () => {
  assert.equal(taskNotifiable({ progress: 100, review_status: 'Borrador' }, analysis), true);
  assert.equal(taskNotifiable({ progress: 99, review_status: 'Borrador' }, analysis), false);
  assert.equal(taskNotifiable({ progress: 100, review_status: 'Observado' }, analysis), true);
});
test('tareas enviadas y aprobadas quedan bloqueadas', () => {
  for (const review_status of ['En revisión', 'Aprobado']) {
    assert.equal(taskEditable({ review_status }, analysis), false);
    assert.equal(taskNotifiable({ progress: 100, review_status }, analysis), false);
  }
  assert.equal(taskEditable({ review_status: 'Borrador' }, { ...analysis, approved_at: '2026-02-01' }), false);
});
test('alertas usan la última medición y distinguen causas existentes', () => {
  const reports = [origin, { ...origin, id: 2, period: 'Febrero,2026', status: 'En meta' }];
  assert.equal(latestMeasurement(reports, '1').id, 2);
  assert.equal(attentionIndicators([{ id: 1, status: 'Fuera de meta' }], reports, []).length, 0);
  assert.equal(attentionIndicators([{ id: '1' }], [origin], [])[0].label, 'Sin análisis de causa');
  assert.equal(attentionIndicators([{ id: 1 }], [origin], [{ report_id: '1' }])[0].label, 'Con análisis de causa');
});
test('sin tareas aprobadas ni medición posterior la eficacia sigue en proceso', () => {
  assert.equal(efficacyFromFollowup(analysis, origin, []).status, 'En proceso');
  assert.equal(efficacyFromFollowup({ ...analysis, approved_at: '2026-02-02' }, origin, []).status, 'En proceso');
});
test('no evalúa mediciones anteriores a completar las correcciones', () => {
  const reports = [{ ...origin, id: 2, period: 'Febrero,2026', status: 'En meta', created_at: '2026-02-01' }];
  assert.equal(efficacyFromFollowup({ ...analysis, approved_at: '2026-02-02' }, origin, reports).status, 'En proceso');
});
test('primera medición posterior dentro de meta indica eficaz, fuera requiere verificación', () => {
  const approved = { ...analysis, approved_at: '2026-02-02' };
  const next = { ...origin, id: 2, period: 'Marzo,2026', status: 'En meta', created_at: '2026-03-01' };
  assert.equal(efficacyFromFollowup(approved, origin, [next]).status, 'Eficaz');
  assert.equal(efficacyFromFollowup(approved, origin, [{ ...next, status: 'Fuera de meta' }]).status, 'Pendiente de verificación');
  assert.equal(efficacyFromFollowup(approved, origin, [{ ...next, indicatorId: 2 }]).status, 'En proceso');
});
test('decisión manual de GCG permanece y medición automática corregida puede reevaluarse', () => {
  const next = { ...origin, period: 'Marzo,2026', created_at: '2026-03-01' };
  const decided = { status: 'No eficaz', approved_at: '2026-02-01', efficacy_decided_by: 'gcg' };
  assert.equal(efficacyFromFollowup(decided, origin, [next]).status, 'No eficaz');
  assert.equal(efficacyFromFollowup({ ...decided, status: 'Eficaz', efficacy_decided_by: null }, origin, [next]).status, 'Pendiente de verificación');
});
test('evidencias rechazan archivos vacíos y mayores a 20 MB', () => {
  assert.throws(() => validateEvidence({ size: 0 }));
  assert.throws(() => validateEvidence({ size: 20 * 1024 * 1024 + 1 }));
  assert.equal(validateEvidence({ size: 20 * 1024 * 1024 }).size, 20971520);
});
