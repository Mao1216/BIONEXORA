import test from 'node:test';
import assert from 'node:assert/strict';
import { accountIdentities, indicatorAccess } from '../src/lib/responsibility.js';

test('matches directory IDs and normalized account emails', () => {
  const ids = accountIdentities(' Manager@Example.com ', [{ id: 'person-1', email: 'manager@example.com' }]);
  assert.equal(indicatorAccess({}, { ownerId: 'person-1' }, ids).canManage, true);
  assert.equal(indicatorAccess({ ownerId: 'MANAGER@example.com' }, null, ids).canManage, true);
});

test('objective manager inherits every indicator and retains access after delegation', () => {
  const objective = { ownerId: 'manager@example.com' };
  for (const indicator of [{}, { ownerId: 'someone-else', reporter_email: 'delegate@example.com' }]) {
    assert.deepEqual(indicatorAccess(indicator, objective, ['manager@example.com']), { canManage: true, canReport: true });
  }
});

test('delegate may report but cannot manage; unrelated accounts have no access', () => {
  const indicator = { reporter_email: 'delegate@example.com' };
  assert.deepEqual(indicatorAccess(indicator, null, ['delegate@example.com']), { canManage: false, canReport: true });
  assert.deepEqual(indicatorAccess(indicator, null, ['other@example.com']), { canManage: false, canReport: false });
});

test('superadministrator sees all indicators; missing emails never match unlinked people', () => {
  assert.equal(indicatorAccess({}, null, [], true).canReport, true);
  assert.deepEqual(accountIdentities(undefined, [{ id: 'unlinked' }]), []);
  assert.equal(indicatorAccess({}, {}, []).canReport, false);
});
