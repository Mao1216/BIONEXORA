import test from 'node:test';
import assert from 'node:assert/strict';
import { filterIndicators, measurementSeries, measurementTicks, reportedProgress, creationYear } from '../src/lib/indicatorViews.js';
import { requestGroups, requestStatus } from '../src/lib/requestViews.js';

test('avance counts reported indicators regardless of target and without duplicates', () => {
  assert.deepEqual(reportedProgress([{ id: 1 }, { id: 2 }, { id: 3 }], [{ indicatorId: 1, status: 'Fuera de meta' }, { indicatorId: 1 }, { indicatorId: 2, status: 'En meta' }, { indicatorId: 99 }]), { reported: 2, total: 3, progress: 67 });
  assert.equal(reportedProgress([], []).progress, 0);
});

test('filters combine code/name, objective and responsible person', () => {
  const indicators = [{ id: 1, code: 'IND-26001', name: 'Productividad', objectiveId: 3, ownerId: 'molin@biomont.com.pe', created_at: '2026-10-06T12:00:00Z' }, { id: 2, code: 'IND-25001', name: 'Ventas', objectiveId: 4, ownerId: 'jcardenas@biomont.com.pe', created_at: '2025-08-01T12:00:00Z' }];
  assert.deepEqual(filterIndicators(indicators, { search: 'IND-26001', objectiveId: '3', responsibleId: 'molin@biomont.com.pe' }).map(item => item.id), [1]);
  assert.deepEqual(filterIndicators(indicators, { search: 'productividad', responsibleId: 'jcardenas@biomont.com.pe' }).map(item => item.id), []);
  assert.equal(filterIndicators(indicators, { search: 'Productividad', objectiveId: '4' }).length, 0);
  assert.equal(creationYear({ created_at: '2027-01-01T02:00:00Z' }), '2026');
});

test('chart sorts measurement periods, preserves zero, and never invents historical targets', () => {
  const series = measurementSeries([{ id: 2, period: 'Febrero,2026', result: 0, measurement_target: 90 }, { id: 1, period: 'Enero,2026', result: 85 }]);
  assert.deepEqual(series.map(row => row.resultado), [85, 0]);
  assert.equal(series[0].meta, null);
  assert.equal(series[1].meta, 90);
});

test('Y axis includes current and historical target values even outside measured results', () => {
  const ticks = measurementTicks([{ resultado: 23, meta: 75 }], 90);
  assert.ok(ticks.includes(75));
  assert.ok(ticks.includes(90));
  assert.ok(ticks.at(-1) >= 90);
  assert.ok(measurementTicks([{ resultado: -12, meta: -5 }], 0).includes(0));
});

test('initial request view only shows En revisión; history contains only resolved requests', () => {
  const requests = [{ id: 1, status: 'Pendiente' }, { id: 2, status: 'Aprobado' }, { id: 3, status: 'Rechazado' }];
  assert.deepEqual(requestGroups(requests, false).map(item => item.id), [1]);
  assert.deepEqual(requestGroups(requests, true).map(item => item.id), [2, 3]);
  assert.equal(requestStatus('Pendiente'), 'En revisión');
});
