// surfaces/cli/cli_entry.ts
// CLI entrypoint alias — re-exports from cli_main_entry.ts
// This file exists to satisfy imports from CLI command modules that reference './cli_entry'

import { run } from './cli_main_entry';

export * from './cli_main_entry';

if (import.meta.url.endsWith(process.argv[1] ?? '') || (process.argv[1] ?? '').endsWith('cli_entry_bridge.ts') || (process.argv[1] ?? '').endsWith('cmf')) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
