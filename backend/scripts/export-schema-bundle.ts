import fs from 'fs';
import path from 'path';
import { schemaRegistry } from '../src/ingest/schemaRegistry';

interface BundleField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'uuid' | 'enum';
  required?: boolean;
  aliases?: string[];
  enum_values?: string[];
  constraints?: Record<string, unknown>;
}

interface BundleTable {
  name: string;
  aliases: string[];
  fields: BundleField[];
}

interface SchemaBundle {
  version: string;
  generated_at: string;
  tables: BundleTable[];
}

const enumHints: Record<string, string[]> = {
  'donations.payment_method': ['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other'],
  'donations.payment_status': ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
  'donations.recurring_frequency': ['weekly', 'monthly', 'quarterly', 'annually', 'one_time'],
};

function buildBundle(): SchemaBundle {
  const date = new Date();
  const version = `${date.toISOString().slice(0, 10)}.1`;

  const tables: BundleTable[] = schemaRegistry.map((table) => ({
    name: table.table,
    aliases: table.aliases ?? [],
    fields: table.fields.map((field) => ({
      name: field.field,
      type: field.type,
      required: field.required,
      aliases: field.aliases ?? [],
      enum_values: field.type === 'enum' ? enumHints[`${table.table}.${field.field}`] ?? [] : undefined,
      constraints: {},
    })),
  }));

  return {
    version,
    generated_at: date.toISOString(),
    tables,
  };
}

function main(): void {
  const bundle = buildBundle();
  const outputPath = path.resolve(__dirname, '..', 'schema-bundle.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Schema bundle exported to ${outputPath}`);
}

main();
