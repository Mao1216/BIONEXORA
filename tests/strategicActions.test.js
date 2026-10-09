import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
test('GCG can open objective projects, create actions, edit actions and link projects', () => {
  assert.ok(app.includes("label: 'Proyectos', icon: FolderKanban, visible: isResponsibleManager || isGcg"));
  assert.ok(app.includes("navigateTo('link-project', 'Vincular proyecto'"));
  assert.ok(app.includes('canEdit={isResponsibleManager || isGcg}'));
  assert.ok(app.includes("['new-project', 'edit-action', 'link-project'].includes(view) && !isResponsibleManager && !isGcg"));
  assert.ok(app.includes("supabase.from('projects').insert({ objective_id: objective.id"));
  assert.ok(app.includes("objectiveTab: 'projects'"));
});
test('personal indicator status name is consistent in navigation and heading', () => {
  const portfolio = readFileSync(new URL('../src/IndicatorPortfolio.jsx', import.meta.url), 'utf8');
  assert.equal(app.includes('Estatus IND'), false);
  assert.equal(portfolio.includes('Estatus IND'), false);
  assert.ok(app.includes('Estatus de mis indicadores'));
  assert.ok(portfolio.includes('Estatus de mis indicadores'));
});
test('Aurio is registered in directory and role assignment, preserving existing authentication', () => {
  const migration = readFileSync(new URL('../supabase/migrations/016_aurio_responsible_manager.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('Aurio de la Cruz'));
  assert.ok(migration.includes("('adelacruz@biomont.com.pe', 'gerente_responsable')"));
  assert.ok(migration.includes('update public.profiles'));
  assert.ok(migration.includes('insert into public.organization_people'));
  assert.equal(migration.includes('insert into auth.users'), false);
});
