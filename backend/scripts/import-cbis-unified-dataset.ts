import path from 'path';
import fs from 'fs';
import pool from '../src/config/database';
import { cbisUnifiedImport } from '../src/services/cbisUnifiedImportService';

const printUsage = (): void => {
  // eslint-disable-next-line no-console
  console.error('Usage: npm run cbis:import -- --source-dir <path> [--dry-run] [--report-file <path>]');
};

const parseArgs = (): { sourceDir: string; dryRun: boolean; reportPath?: string } => {
  const args = process.argv.slice(2);
  let sourceDir = '';
  let dryRun = false;
  let reportPath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--source-dir') {
      sourceDir = args[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--report-file') {
      reportPath = args[index + 1];
      index += 1;
      continue;
    }
  }

  if (!sourceDir) {
    printUsage();
    throw new Error('Missing required --source-dir argument');
  }

  const resolvedSourceDir = path.resolve(sourceDir);
  if (!fs.existsSync(resolvedSourceDir)) {
    throw new Error(`Source directory does not exist: ${resolvedSourceDir}`);
  }

  return {
    sourceDir: resolvedSourceDir,
    dryRun,
    reportPath,
  };
};

async function main(): Promise<void> {
  const options = parseArgs();
  const report = await cbisUnifiedImport.run(pool, {
    sourceDir: options.sourceDir,
    dryRun: options.dryRun,
    reportPath: options.reportPath,
    actorUserId: null,
  });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
