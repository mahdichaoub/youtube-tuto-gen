#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const REQUIRED_FILES = [
  'src/agents/fetcher.ts',
  'src/agents/analyst.ts',
  'src/agents/teacher.ts',
  'src/agents/action.ts',
  'src/agents/orchestrator.ts',
  'src/app/api/analyze/route.ts',
  'src/app/api/analyze/[id]/stream/route.ts',
  'src/app/api/reports/[id]/route.ts',
  'src/components/report/ConceptTab.tsx',
  'src/components/report/HighlightsTab.tsx',
  'src/components/report/ModelsTab.tsx',
  'src/components/report/ExamplesTab.tsx',
  'src/components/report/ActionPlanTab.tsx',
  'src/app/(app)/home/page.tsx',
  'src/app/(app)/process/[id]/page.tsx',
  'src/app/(app)/report/[id]/page.tsx',
];

const REQUIRED_EXPORT_CHECKS = [
  { file: 'src/agents/fetcher.ts', pattern: /export\s+async\s+function\s+runFetcher\s*\(/ },
  { file: 'src/agents/analyst.ts', pattern: /export\s+async\s+function\s+runAnalyst\s*\(/ },
  { file: 'src/agents/teacher.ts', pattern: /export\s+async\s+function\s+runTeacher\s*\(/ },
  { file: 'src/agents/action.ts', pattern: /export\s+async\s+function\s+runAction\s*\(/ },
  { file: 'src/agents/orchestrator.ts', pattern: /export\s+async\s+function\s+runPipeline\s*\(/ },
  { file: 'src/app/api/analyze/route.ts', pattern: /export\s+async\s+function\s+POST\s*\(/ },
  { file: 'src/app/api/analyze/[id]/stream/route.ts', pattern: /export\s+async\s+function\s+GET\s*\(/ },
  { file: 'src/app/api/reports/[id]/route.ts', pattern: /export\s+async\s+function\s+GET\s*\(/ },
];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const missing = [];
  for (const file of REQUIRED_FILES) {
    if (!(await exists(file))) {
      missing.push(file);
    }
  }

  const failedPatternChecks = [];
  for (const check of REQUIRED_EXPORT_CHECKS) {
    const content = await readFile(check.file, 'utf8');
    if (!check.pattern.test(content)) {
      failedPatternChecks.push(check.file);
    }
  }

  console.log('Phase 3 validation summary');
  console.log(`- Required files: ${REQUIRED_FILES.length}`);
  console.log(`- Missing files: ${missing.length}`);
  console.log(`- Export signature checks: ${REQUIRED_EXPORT_CHECKS.length}`);
  console.log(`- Failed export checks: ${failedPatternChecks.length}`);

  if (missing.length > 0) {
    console.log('\nMissing files:');
    for (const file of missing) console.log(`  - ${file}`);
  }

  if (failedPatternChecks.length > 0) {
    console.log('\nFiles failing export signature checks:');
    for (const file of failedPatternChecks) console.log(`  - ${file}`);
  }

  if (missing.length > 0 || failedPatternChecks.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('\n✅ Phase 3 structural + route/agent export validation passed.');
}

main().catch((error) => {
  console.error('Validation script failed unexpectedly.');
  console.error(error);
  process.exit(1);
});
