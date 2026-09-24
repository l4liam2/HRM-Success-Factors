// Self-check for the PDF report (src/components/reportPdf.js). Run: npm run check:report
// Catches factor renames that would silently drop a priority's action items, filename slug
// regressions, and layout crashes at the edges (every answer at one level, or all "not sure").
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildReport, reportFilename, factorIndex } from './src/components/reportPdf.js';

const assessment = JSON.parse(readFileSync('public/assessment.json', 'utf8'));
const mapData = JSON.parse(readFileSync('public/data.json', 'utf8'));
const findStages = (n) => (n.name === 'Maturity stages' ? n.children : (n.children || []).map(findStages).find(r => r?.length));
const maturityLevels = findStages(mapData);

const factorNode = factorIndex(mapData);
for (const q of assessment.dimensions.flatMap(d => d.questions))
  assert.ok(factorNode(q.factor)?.actionItems?.length, `factor "${q.factor}" has no mind-map node with action items`);

const day = new Date(2026, 0, 5);
assert.equal(reportFilename('Société Générale, Inc.', day), 'security-awareness-maturity-societe-generale-inc-2026-01-05.pdf');
assert.equal(reportFilename('  ', day), 'security-awareness-maturity-2026-01-05.pdf');

for (const level of [1, 2, 3, 4, 5, null]) {
  const items = assessment.dimensions.flatMap(d => d.questions.slice(0, 3).map(q => ({
    dim: d.key, dimLabel: d.label, weight: d.weight, factor: q.factor, text: q.text,
    answer: level && q.descriptors[level - 1], points: level, best: q.descriptors[4],
  })));
  const dims = assessment.dimensions.map(d => ({
    key: d.key, label: d.label, weight: d.weight, score: 3 * (level ?? 0), max: level ? 15 : 0,
    skipped: level ? 0 : 3, level, pct: level && level / 5,
  }));
  const results = { dims, overallLevel: level, overallPct: level && level / 5 };
  const doc = buildReport({ results, items, maturityLevels, mapData, mode: 'quick', preparedFor: 'Acme 株式会社' });
  assert.ok(doc.getNumberOfPages() >= 3, `level ${level}: only ${doc.getNumberOfPages()} pages`);
}
console.log('report checks passed');
