import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { measurementTicks } from '../src/lib/indicatorViews.js';

test('chart scale has uniform intervals for decimals, negative values and empty series', () => {
  for (const data of [[], [{ resultado: 0.013, meta: 0.018 }], [{ resultado: -12, meta: 9 }]]) {
    const ticks = measurementTicks(data, 0);
    assert.ok(ticks.length >= 2);
    const step = ticks[1] - ticks[0];
    assert.ok(ticks.every((value, index) => !index || Math.abs(value - ticks[index - 1] - step) < 1e-10));
    for (const row of data) for (const value of [row.resultado, row.meta]) assert.ok(value >= ticks[0] && value <= ticks.at(-1));
  }
});

test('requested controls retain search, supplemental reporter and funnel filters', () => {
  const governance = readFileSync(new URL('../src/Governance.jsx', import.meta.url), 'utf8');
  assert.ok(governance.includes('aria-label="Buscar medición"'));
  assert.ok(governance.includes('matchingReports.map(report => <button'));
  assert.ok(!governance.includes('aria-label="Medición"'));
  assert.ok(!governance.includes('Reportar personalmente'));
  assert.ok(governance.includes('if (!delegate) return;'));
  for (const file of ['MeasurementChart.jsx', 'ComparisonLines.jsx', 'BioIndicatorsView.jsx']) {
    assert.ok(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8').includes('<FilterPanel'));
  }
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.ok(!app.includes('Año del valor ponderado'));
  assert.ok(!app.includes('{weighted.label}'));
});
