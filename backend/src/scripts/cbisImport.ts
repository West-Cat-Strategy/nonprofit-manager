import { rawPool } from '@config/database';
import { CbisImportService, type CbisImportMode } from '@modules/cbisImport';

interface CliOptions {
  bundleDir?: string;
  organizationId?: string;
  actorId?: string;
  mode?: CbisImportMode;
  rollbackArtifactPath?: string;
}

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (!arg.startsWith('--')) {
      continue;
    }

    const readValue = (): string => {
      if (!next || next.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return next;
    };

    if (arg === '--bundle') {
      options.bundleDir = readValue();
    } else if (arg === '--organization-id') {
      options.organizationId = readValue();
    } else if (arg === '--actor-id') {
      options.actorId = readValue();
    } else if (arg === '--mode') {
      const mode = readValue();
      if (mode !== 'dry-run' && mode !== 'apply') {
        throw new Error('--mode must be dry-run or apply');
      }
      options.mode = mode;
    } else if (arg === '--backup-path' || arg === '--rollback-artifact-path') {
      options.rollbackArtifactPath = readValue();
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
};

const requireOption = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required option ${name}`);
  }
  return value;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const service = new CbisImportService();
  const result = await service.run({
    bundleDir: requireOption(options.bundleDir, '--bundle'),
    organizationId: requireOption(options.organizationId, '--organization-id'),
    actorId: requireOption(options.actorId, '--actor-id'),
    mode: options.mode ?? 'dry-run',
    rollbackArtifactPath: options.rollbackArtifactPath,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await rawPool.end();
  });
