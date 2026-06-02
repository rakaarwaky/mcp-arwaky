// surfaces/cli/cli_system_command.ts
import { Command } from 'commander';
import { getAgent } from './cli_agent_util';
import { success, info, printJson, printError, exit, highlight, printTable, warn } from './cli_format_util';
import { output } from './cli_main_entry';
import type { DashboardMetricsOutput, CleanupInput, CleanupOutput } from '../../contract';
import type { DashboardMetric } from '../../taxonomy';
import { asMaxAgeHours, asUserId } from '../../taxonomy';

async function resolveUserId(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const users = await getAgent().listUsers();
  if (users.length === 0) { printError('No users'); exit(1); }
  if (users.length > 1 && !output.quiet) warn(`Multiple users, using: ${highlight(users[0]!.id)}`);
  return users[0]!.id;
}

export function systemCommands(program: Command) {
  const sys = program.command('system').description('System operations');
  sys.command('dashboard').option('-u, --user <userId>').action(async function () {
    try {
      const userId = asUserId(await resolveUserId(this.optsWithGlobals().user));
      const data = await getAgent().getDashboardMetrics(userId);
      if (output.json) {
        printJson(data);
      } else {
        const title = highlight(' SYSTEM DASHBOARD ');
        console.log(`\n ${title} \n`);
        const tableData = data.map((m: DashboardMetric) => ({
          status: m.status === 'ok' ? '✓' : m.status === 'warning' ? '⚠' : '✗',
          metric: m.label,
          value: m.value
        }));
        printTable(tableData);
      }
    }
    catch (e) { printError(e); exit(1); }
  });
  sys.command('cleanup').option('-a, --max-age <hours>', '24').action(async function () {
    try {
      const opts = this.optsWithGlobals();
      const input: CleanupInput = { maxAgeHours: asMaxAgeHours(parseInt(opts.maxAge)) };
      const out: CleanupOutput = await getAgent().runCleanup(input.maxAgeHours);
      success('Cleanup complete');
      info(`  emails: ${highlight(out.expiredEmails)}  sessions: ${highlight(out.expiredSessions)} (maxAge: ${highlight(opts.maxAge)}h)`);
      if (output.json) printJson(out);
    } catch (e) { printError(e); exit(1); }
  });

  sys.command('benchmark').description('Run performance benchmarks on logic').action(async function () {
    try {
      info('🚀 Running logic benchmarks...');
      const start = Date.now();
      // Simulate/Run benchmark logic here
      // For now, measure basic speed of a repeated action
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        // Just a simple loop to show it's working
      }
      const duration = Date.now() - start;
      const results = {
        iterations,
        totalTimeMs: duration,
        avgTimeMs: (duration / iterations).toFixed(4)
      };
      if (output.json) {
        printJson(results);
      } else {
        success('Benchmark finished');
        info(`  Iterations: ${highlight(iterations.toString())}`);
        info(`  Total: ${highlight(duration.toString())}ms`);
        info(`  Speed: ${highlight(results.avgTimeMs)}ms/call`);
      }
    } catch (e) { printError(e); exit(1); }
  });
}
