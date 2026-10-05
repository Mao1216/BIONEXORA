import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('comparisons are restricted to the GCG monitor', () => {
  assert.match(app, /isGcg && <ComparisonCharts/);
});

test('GCG review uses change requests instead of indicator approval', () => {
  assert.match(app, /currentView === 'gcg-review' && isGcg && <ChangeRequests isGcg/);
  assert.doesNotMatch(app, /<GcgReviewView/);
});

test('GCG has direct creation access and selects a valid objective', () => {
  assert.match(app, /isGcg && <button onClick=\{\(\) => navigateTo\('new-indicator', 'Crear indicador'\)/);
  assert.match(app, /if \(!isGcg \|\| !obj\)/);
  assert.match(app, /objective_id: obj.id/);
  assert.match(app, /if \(view === 'new-indicator' && !params.objectiveId\) setSelectedObjectiveId\(null\)/);
});

test('requests in Visualizations are hidden from GCG', () => {
  assert.match(app, /!isGcg && <button onClick=\{\(\) => navigateTo\('change-requests'/);
});
