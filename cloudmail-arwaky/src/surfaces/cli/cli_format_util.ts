import pc from 'picocolors';
import { output } from './cli_main_entry';

const B = (text: string) => pc.bold(text);
const C = (text: string) => pc.cyan(text);
const G = (text: string) => pc.gray(text);
const BK = (text: string) => pc.black(text);
const INV = (text: string) => pc.inverse(text);

export function banner() {
  console.log('\n' + B(pc.bgCyan(BK('  CLOUD MAIL FLARE  '))) + G(' ── Premium Email Gateway') + '\n');
}

function log(level: string, msg: string) {
  if (output.logFormat === 'json') {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message: msg }));
  } else {
    const prefix = level === 'info' ? pc.cyan('ℹ') :
      level === 'warn' ? pc.yellow('⚠') :
        level === 'error' ? pc.red('✗') :
          level === 'success' ? pc.green('✓') : '';
    console.log(`${prefix} ${level === 'success' || level === 'error' ? B(msg) : msg}`);
  }
}

export function success(msg: string) { log('success', msg); }
export function error(msg: string) { log('error', msg); }
export function warn(msg: string) { log('warn', msg); }
export function info(msg: string) { log('info', msg); }
export function debug(msg: string) { if (output.verbose) log('debug', msg); }
export function dim(msg: string) { return G(msg); }
export function bold(msg: string) { return B(msg); }
export function highlight(msg: unknown) { return pc.cyan(B(String(msg))); }
export function mask(text: string | null | undefined): string {
  if (!text) return '-';
  if (text.length <= 8) return text;
  return `****-****-${text.slice(-8)}`;
}

export function printTable(rows: Record<string, unknown>[], columns?: string[]) {
  if (rows.length === 0) {
    info('No results found.');
    return;
  }

  const keys = columns ?? Object.keys(rows[0]!);
  const widths: Record<string, number> = {};

  for (const k of keys) widths[k] = k.length;
  for (const row of rows) {
    for (const k of keys) {
      const val = String(row[k] ?? '-');
      if (val.length > widths[k]!) widths[k] = Math.min(val.length, 50);
    }
  }

  // Header
  const header = keys.map(k => B(k.toUpperCase().padEnd(widths[k]!))).join('   ');
  console.log(C(header));
  console.log(G(keys.map(k => '─'.repeat(widths[k]!)).join('   ')));

  // Rows
  for (const row of rows) {
    console.log(keys.map(k => {
      const val = String(row[k] ?? '-');
      const truncated = val.length > 50 ? val.slice(0, 47) + '...' : val;
      return truncated.padEnd(widths[k]!);
    }).join('   '));
  }
  console.log();
}

export function printJson(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

export function printResult(result: any) {
  if (output.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result === null || result === undefined) {
    info('Operation completed with no result.');
    return;
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    const obj = result as Record<string, any>;

    if (obj.message) success(obj.message);
    if (obj.path) info(`Path: ${obj.path}`);
    if (obj.suggestion) info(`Suggestion: ${obj.suggestion}`);

    const { message, path, suggestion, ...rest } = obj;
    if (Object.keys(rest).length > 0) {
      if (Array.isArray(rest.emails)) {
        printTable(rest.emails);
      } else if (Array.isArray(rest.logs)) {
        printTable(rest.logs);
      } else if (rest.config) {
        console.log(JSON.stringify(rest.config, null, 2));
      } else {
        printTable([rest]);
      }
    }
    return;
  }

  if (Array.isArray(result)) {
    printTable(result);
    return;
  }

  printJson(result);
}

export function printError(e: unknown, suggestion?: string) {
  const msg = e instanceof Error ? e.message : String(e);
  error(msg);
  if (suggestion) info(`Suggestion: ${suggestion}`);
}

export function exit(code: number = 0) {
  process.exit(code);
}
