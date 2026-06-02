// surfaces/cli/cli_main_entry.ts — CLI entry point with global output mode and program config

import { Command } from 'commander';
import { banner } from './cli_format_util';
import { authCommands } from './cli_auth_command';
import { userCommands } from './cli_user_command';
import { inboxCommands } from './cli_inbox_command';
import { settingsCommands } from './cli_settings_command';
import { systemCommands } from './cli_system_command';
import { browserCommands } from './cli_browser_command';
import { completionCommand } from './cli_completion_util';
import { exportCommands } from './cli_export_command';
import { configCommands } from './cli_config_command';

import { recordMetric, formatPrometheusMetrics } from './cli_metrics_collector';

export const output = { 
  json: false, 
  quiet: false, 
  verbose: false, 
  logFormat: 'text', 
  retries: 3, 
  retryDelay: 1000, 
  metrics: false,
  profile: undefined as string | undefined
};

let startTime = 0;

export const program = new Command()
  .name('cmf')
  .description('Cloud Mail Flare CLI')
  .version('0.1.0')
  .option('--json', 'Output JSON', false)
  .option('--quiet', 'Suppress non-JSON output', false)
  .option('-v, --verbose', 'Show verbose debug output', false)
  .option('--profile <name>', 'Configuration profile to use')
  .option('--log-format <format>', 'Log format (text|json)', 'text')
  .option('--retries <n>', 'Max retries for network calls', '3')
  .option('--retry-delay <ms>', 'Initial retry delay in ms', '1000')
  .option('--metrics', 'Show performance metrics', false)
  .hook('preAction', (_thisCommand, actionCommand) => {
    const opts = actionCommand.optsWithGlobals ? actionCommand.optsWithGlobals() : actionCommand.opts();
    output.json = opts.json ?? false;
    output.quiet = opts.quiet ?? false;
    output.verbose = opts.verbose ?? false;
    output.profile = opts.profile;
    output.logFormat = opts.logFormat ?? 'text';
    output.retries = parseInt(opts.retries, 10);
    output.retryDelay = parseInt(opts.retryDelay, 10);
    output.metrics = opts.metrics ?? false;
    if (!output.quiet && !output.json) banner();
    startTime = Date.now();
  })
  .hook('postAction', (_thisCommand, actionCommand) => {
    const duration = Date.now() - startTime;
    const names = [];
    let curr: any = actionCommand;
    while (curr && curr.name() !== 'cmf') {
      names.unshift(curr.name());
      curr = curr.parent;
    }
    const commandPath = names.join(' ');
    
    recordMetric({
      command: commandPath || 'root',
      durationMs: duration,
      success: true,
      timestamp: new Date().toISOString()
    });
    
    if (output.metrics) {
      console.log('\n--- METRICS ---');
      console.log(formatPrometheusMetrics());
    }
  });

authCommands(program);
userCommands(program);
inboxCommands(program);
settingsCommands(program);
systemCommands(program);
browserCommands(program);
completionCommand(program);
exportCommands(program);
configCommands(program);

export async function run(argv: string[] = process.argv) {
  await program.parseAsync(argv);
}

if (import.meta.url.endsWith(process.argv[1] ?? '') || (process.argv[1] ?? '').endsWith('cli_main_entry.ts')) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
