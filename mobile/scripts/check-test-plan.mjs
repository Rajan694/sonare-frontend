import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testPlanPath = path.join(rootDir, 'TEST-PLAN.md');
if (!fs.existsSync(testPlanPath)) {
  console.error('Error: TEST-PLAN.md not found at ' + testPlanPath);
  process.exit(1);
}

const testPlanContent = fs.readFileSync(testPlanPath, 'utf-8');

// Match test IDs in TEST-PLAN.md: `MOB-(DATA|LIB|STORE|NAT|NAV|COMP|SCREEN)-[0-9]{3}`
const planIdMatches = testPlanContent.match(/`MOB-[A-Z]+(?:-[A-Z]+)?-[0-9]{3}`/g) || [];
const planIds = new Set(planIdMatches.map((m) => m.replace(/`/g, '')));

// Expand range notations if any: e.g. `MOB-DATA-001` to `MOB-DATA-010`
const rangeMatches = testPlanContent.matchAll(/`?(MOB-[A-Z]+(?:-[A-Z]+)?)-([0-9]{3})`?\s+to\s+`?\1-([0-9]{3})`?/g);
for (const match of rangeMatches) {
  const prefix = match[1];
  const start = parseInt(match[2], 10);
  const end = parseInt(match[3], 10);
  for (let i = start; i <= end; i++) {
    planIds.add(`${prefix}-${String(i).padStart(3, '0')}`);
  }
}

if (planIds.size === 0) {
  console.error('Error: No test IDs found in TEST-PLAN.md');
  process.exit(1);
}

// Find all test files in __tests__/
function getTestFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTestFiles(filePath));
    } else if (
      file.endsWith('.test.ts') ||
      file.endsWith('.test.tsx') ||
      file.endsWith('.spec.ts') ||
      file.endsWith('.spec.tsx')
    ) {
      results.push(filePath);
    }
  }
  return results;
}

const testFiles = getTestFiles(path.join(rootDir, '__tests__'));
const codeIds = new Set();
const duplicateCodeIds = new Set();

for (const file of testFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  // Match string literals in it(...) or test(...)
  const literalMatches = content.matchAll(/(?:it|test)(?:\.\w+)?\s*\(\s*['"`](MOB-[A-Z]+(?:-[A-Z]+)?-[0-9]{3})/g);
  for (const match of literalMatches) {
    const id = match[1];
    if (codeIds.has(id)) {
      duplicateCodeIds.add(id);
    }
    codeIds.add(id);
  }
}

if (duplicateCodeIds.size > 0) {
  console.error('Error: Duplicate test IDs in test files:', Array.from(duplicateCodeIds));
  process.exit(1);
}

let hasError = false;

// Missing in code (in plan but not in tests)
const missingInTests = [];
for (const planId of planIds) {
  if (!codeIds.has(planId)) {
    missingInTests.push(planId);
  }
}

// Missing in plan (in tests but not in plan)
const missingInPlan = [];
for (const codeId of codeIds) {
  if (!planIds.has(codeId)) {
    missingInPlan.push(codeId);
  }
}

if (missingInTests.length > 0) {
  console.error(`Error: ${missingInTests.length} test IDs in TEST-PLAN.md are missing from test files:`);
  console.error(missingInTests.join(', '));
  hasError = true;
}

if (missingInPlan.length > 0) {
  console.error(`Error: ${missingInPlan.length} test IDs in test files are missing from TEST-PLAN.md:`);
  console.error(missingInPlan.join(', '));
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log(`✓ Test plan check passed: ${planIds.size} tests matched perfectly between TEST-PLAN.md and test files.`);
