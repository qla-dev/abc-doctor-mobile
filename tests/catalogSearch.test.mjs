import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesCatalogSearch } from '../lib/catalogSearch.ts';

const modes = [
  { name: 'Consultant', description: 'Clinical advice', key: 'consultant' },
  { name: 'Study buddy', description: null, key: 'study_buddy' },
];
const workflows = [
  { name: 'Initial ER assessment', purpose: 'Identify urgent problems' },
  { name: 'ER-to-inpatient handover', purpose: 'Transfer responsibility to a receiving clinician' },
];

test('blank search keeps every mode and workflow visible', () => {
  for (const item of [...modes, ...workflows]) {
    assert.equal(matchesCatalogSearch('  ', item.name, item.description, item.purpose), true);
  }
});

test('finds modes by name or key and workflows by name or purpose', () => {
  assert.deepEqual(modes.filter(m => matchesCatalogSearch('STUDY', m.name, m.description, m.key)).map(m => m.key), ['study_buddy']);
  assert.deepEqual(workflows.filter(w => matchesCatalogSearch('receiving clinician', w.name, w.purpose)).map(w => w.name), ['ER-to-inpatient handover']);
  assert.equal(matchesCatalogSearch('handover er', workflows[1].name), true);
  assert.equal(matchesCatalogSearch('handover urgent', workflows[1].name, workflows[1].purpose), false);
});

test('Bosnian and German searches work without accents', () => {
  assert.equal(matchesCatalogSearch('vjezbe', 'Vježbe'), true);
  assert.equal(matchesCatalogSearch('ubungen', 'Übungen'), true);
  assert.equal(matchesCatalogSearch('poredenje', 'Poređenje'), true);
});
