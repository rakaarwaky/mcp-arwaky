// surfaces/mcp/mcp_tools_entry.ts
// CloudMailFlare MCP Server — Hardened CLI Wrapper (Hydra Pattern)
// Wraps CLI commands via execFileSync with strict sanitization.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../..');
// Fixed: Pointing to the correct main entry file
const CLI_ENTRY = join(PROJECT_ROOT, 'src/surfaces/cli/cli_main_entry.ts');

// ── Command registry (source of truth: CLI) ──

const COMMANDS: Record<string, { args: string[]; desc: string }> = {
  'auth login': { args: ['email', 'password'], desc: 'Login with email and password' },
  'auth logout': { args: [], desc: 'Logout current session' },
  'auth health': { args: [], desc: 'Check API health' },
  'user list': { args: [], desc: 'List all users' },
  'user create': { args: ['username'], desc: 'Create a new user' },
  'user get': { args: ['userId'], desc: 'Get user by ID' },
  'user update': { args: ['userId', 'email?', 'username?', 'password?'], desc: 'Update user fields' },
  'user delete': { args: ['userId'], desc: 'Soft-delete user' },
  'inbox list': { args: ['user?'], desc: 'List inbox emails' },
  'inbox get': { args: ['emailId', 'user?'], desc: 'Get single email' },
  'inbox wait': { args: ['from?', 'subject?', 'timeout?', 'interval?', 'user?'], desc: 'Wait for new email (long-poll)' },
  'inbox action': { args: ['emailId', 'action', 'user?'], desc: 'Email action: star/archive/mark_read/delete' },
  'settings get': { args: [], desc: 'Get worker settings' },
  'settings set': { args: ['key', 'value'], desc: 'Set worker setting' },
  'apikey list': { args: [], desc: 'List API keys' },
  'apikey create': { args: ['name'], desc: 'Create API key' },
  'apikey revoke': { args: ['keyId'], desc: 'Revoke API key' },
  'apikey verify': { args: ['keyPlain'], desc: 'Verify an API key (returns valid, apiKeyId, userId)' },
  'system dashboard': { args: ['user?'], desc: 'Get dashboard metrics (user-specific if username provided)' },
  'system cleanup': { args: ['maxAge?'], desc: 'Cleanup expired data (default: 24h)' },
  'system benchmark': { args: [], desc: 'Run performance benchmarks on logic' },
  'browser openrouter-signup': { args: ['email', 'password', 'user?'], desc: 'Automate OpenRouter signup via Chrome CDP (local only)' },
  'browser status': { args: [], desc: 'Check Chrome CDP availability' },
};

const VALID_COMMANDS = Object.keys(COMMANDS);
const COMMAND_ENUM = z.enum(VALID_COMMANDS as [string, ...string[]]);

// ── Security & Sanitization ──

// Restricted pattern: alphanumeric, dots, dashes, underscores, @, and limited slashes.
// ABSOLUTELY NO: ; | & $ ( ) < > ` \ " '
const SAFE_ARG_REGEX = /^[a-zA-Z0-9.@+\-_/ \u00C0-\u00FF]+$/;

function sanitizeArg(input: unknown): string {
  if (input === undefined || input === null) return '';
  const str = String(input).trim();
  if (!str) return '';
  
  if (!SAFE_ARG_REGEX.test(str)) {
    throw new Error(`Potentially unsafe argument detected: ${JSON.stringify(str)}`);
  }
  
  // Guard against path traversal attempts if slashes are present
  if (str.includes('..')) {
    throw new Error(`Path traversal attempt detected: ${JSON.stringify(str)}`);
  }

  return str;
}

function sanitizeCommand(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Command must be a string');
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!VALID_COMMANDS.includes(trimmed)) {
    throw new Error(`Unknown command: ${JSON.stringify(trimmed)}. Valid options: ${VALID_COMMANDS.join(', ')}`);
  }
  return trimmed;
}

// ── CLI runner ──

function runCli(args: string[], timeoutMs: number = 30000): string {
  // Sanitize all args before execution
  const safeArgs = args.map(a => sanitizeArg(a));
  try {
    // SECURITY: Use execFileSync with shell: false (default) to prevent shell injects.
    // We use npx to run tsx which runs the CLI main entry.
    const result = execFileSync('npx', ['tsx', CLI_ENTRY, '--json', ...safeArgs], {
      cwd: PROJECT_ROOT,
      timeout: timeoutMs,
      encoding: 'utf-8',
      env: { 
        ...process.env, 
        CLOUD_MAIL_FLARE_URL: process.env.CLOUD_MAIL_FLARE_URL ?? '',
        FORCE_COLOR: '0' // Disable colors for cleaner JSON parsing
      },
    });
    return result.trim();
  } catch (e: any) {
    const stderr = e.stderr?.trim() ?? '';
    const stdout = e.stdout?.trim() ?? '';
    // Strip stack traces from production error bridge
    const errorMessage = (stderr || stdout || e.message).split('\n')[0];
    return JSON.stringify({ 
      error: errorMessage,
      command: `cmf ${safeArgs.join(' ')}` 
    });
  }
}

function getCommandList(): string {
  return Object.entries(COMMANDS)
    .map(([cmd, info]) => `- ${cmd}: ${info.desc}. Args: ${info.args.join(', ') || 'none'}`)
    .join('\n');
}

// ── Server ──

const server = new McpServer({
  name: 'cloud-mail-flare',
  version: '1.0.0',
  description: 'Premium Email Management MCP Server for Cloud Mail Flare (Hardened CLI Wrapper)'
});

// Helper for restricted strings
const safeString = z.string().regex(SAFE_ARG_REGEX, "Contains illegal characters");

// 1. cmf_execute — Primary tool (DISPATCHER)
server.registerTool('cmf_execute', {
  title: 'Execute Command',
  description: `Primary tool to interact with Cloud Mail Flare. Use this to login, manage users, read emails, and configure settings. Subcommands:\n${getCommandList()}`,
  inputSchema: {
    command: COMMAND_ENUM.describe('Command to run (e.g., "user list", "inbox wait", "system dashboard")'),
    email: z.string().email().optional().describe('Email address'),
    password: z.string().min(1).optional().describe('Password'),
    username: safeString.min(1).max(100).optional().describe('Target username'),
    userId: z.string().uuid().optional().describe('Target user ID'),
    emailId: z.string().optional().describe('Target email ID'),
    action: z.enum(['star', 'archive', 'mark_read', 'delete']).optional().describe('Action for inbox action'),
    key: safeString.min(1).max(100).optional().describe('Setting key'),
    value: z.string().min(1).optional().describe('Setting value'),
    name: safeString.min(1).max(100).optional().describe('API key name'),
    keyId: z.string().uuid().optional().describe('API key ID'),
    keyPlain: safeString.min(10).max(200).optional().describe('Plain API key to verify (sk-...)'),
    user: safeString.min(1).optional().describe('User filter (ID/Email)'),
    from: z.string().email().optional().describe('Sender filter'),
    subject: safeString.min(1).max(500).optional().describe('Subject filter'),
    timeout: z.string().regex(/^\d+[smhd]?$/).optional().describe('Timeout (e.g. 60s)'),
    interval: z.string().regex(/^\d+[smhd]?$/).optional().describe('Poll interval (e.g. 5s)'),
    maxAge: z.string().regex(/^\d+$/).optional().describe('Max age for cleanup (hours)'),
  },
}, async (args) => {

  try {
    const cmd = sanitizeCommand(args.command);
    const parts = cmd.split(/\s+/);
    const cliArgs: string[] = [...parts];

    // Kwarg mapping
    const kwargMap: Record<string, string> = {
      user: '--user', from: '--from', subject: '--subject',
      timeout: '--timeout', interval: '--interval',
      maxAge: '--max-age',
    };

    // Positionals for specific commands
    const positionalCommands: Record<string, string[]> = {
      'apikey create': ['name'],
      'apikey revoke': ['keyId'],
      'apikey verify': ['keyPlain'],
      'browser openrouter-signup': ['email', 'password'],
      'user create': ['username'],
      'user get': ['userId'],
      'user update': ['userId'],
      'user delete': ['userId'],
      'inbox get': ['emailId'],
      'inbox action': ['emailId', 'action'],
    };

    const cmdKey = parts.join(' ');
    const positional = positionalCommands[cmdKey] ?? [];

    const argsRecord = args as Record<string, unknown>;

    for (const field of positional) {
      const val = argsRecord[field];
      if (val !== undefined && val !== null) cliArgs.push(sanitizeArg(String(val)));
    }

    // Append flags
    for (const [field, flag] of Object.entries(kwargMap)) {
      if (positional.includes(field)) continue;
      const val = argsRecord[field];
      if (val === undefined || val === null) continue;
      cliArgs.push(flag, sanitizeArg(String(val)));
    }

    // Special handling for auth login/logout
    if (cmdKey === 'auth login') {
      if (args.email) cliArgs.push('--email', sanitizeArg(args.email));
      if (args.password) cliArgs.push('--password', sanitizeArg(args.password));
    }

    const output = runCli(cliArgs);
    return { content: [{ type: 'text' as const, text: output }] };
  } catch (e: any) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: e.message }) }],
      isError: true,
    };
  }
});

// 2. cmf_list_commands — Help tool
server.registerTool('cmf_list_commands', {
  title: 'List Commands',
  description: 'Discover available Cloud Mail Flare subcommands and their parameters.',
  inputSchema: {
    domain: z.enum(['auth', 'user', 'inbox', 'settings', 'apikey', 'system', 'browser']).optional()
      .describe('Filter by domain'),
  },
}, async (args) => {
  if (args.domain) {
    const filtered = Object.entries(COMMANDS)
      .filter(([cmd]) => cmd.startsWith(args.domain!))
      .map(([cmd, info]) => ({ command: cmd, args: info.args, desc: info.desc }));
    return { content: [{ type: 'text' as const, text: JSON.stringify(filtered, null, 2) }] };
  }
  const all = Object.entries(COMMANDS).map(([cmd, info]) => ({
    command: cmd, args: info.args, desc: info.desc,
  }));
  return { content: [{ type: 'text' as const, text: JSON.stringify(all, null, 2) }] };
});

// 3. cmf_skill — documentation tool
server.registerTool('cmf_skill', {
  title: 'Read Documentation',
  description: 'Access workflow guides and advanced usage documentation (SKILL.md).',
  inputSchema: {
    section: z.enum(['all', 'auth', 'user', 'inbox', 'settings', 'apikey', 'system', 'workflows']).optional()
      .describe('Section to read'),
  },
}, async (args) => {
  const skillPath = join(PROJECT_ROOT, 'SKILL.md');
  if (!existsSync(skillPath)) return { content: [{ type: 'text' as const, text: 'SKILL.md not found.' }] };
  const content = readFileSync(skillPath, 'utf-8');
  const section = args.section ?? 'all';
  if (section === 'all') return { content: [{ type: 'text' as const, text: content }] };
  
  const parts = content.split(/\n## /);
  for (const part of parts) {
    if (part.toLowerCase().startsWith(section.toLowerCase())) {
      return { content: [{ type: 'text' as const, text: '## ' + part }] };
    }
  }
  return { content: [{ type: 'text' as const, text: `Section '${section}' not found.` }] };
});

// 4. cmf_status — Health tool
server.registerTool('cmf_status', {
  title: 'Server Status',
  description: 'Check system health and connectivity.',
  inputSchema: {},
}, async () => {
  const healthOutput = runCli(['auth', 'health'], 10000);
  let healthy = false;
  try { healthy = JSON.parse(healthOutput).status === 'healthy'; } catch { }

  const status = {
    server: 'cloud-mail-flare v1.0.0 (Hardened Wrapper)',
    health: healthy ? 'Online' : 'Unreachable',
    tools: 5,
    capabilities: ['Auth', 'UserMgmt', 'Inbox', 'Settings', 'APIKeys', 'Dashboard', 'Cleanup', 'BrowserAutomation'],
  };
  return { content: [{ type: 'text' as const, text: JSON.stringify(status, null, 2) }] };
});

// 5. cmf_cancel — Flow control tool
server.registerTool('cmf_cancel', {
  title: 'Cancel Operation',
  description: 'Cancel any long-running or pending operations (placeholder).',
  inputSchema: {
    job_id: z.string().optional().describe('Target Job ID to cancel'),
  },
}, async (args) => {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: "Cancel signal received", jobId: args.job_id }) }] };
});

// ── Start ──

async function main() {
  await server.connect(new StdioServerTransport());
  console.error('[cmf-mcp] Ready — Hardened CLI Wrapper Online');
}

main().catch(e => {
  console.error('[cmf-mcp] Fatal:', e);
  if (process.env.NODE_ENV !== 'test') process.exit(1);
});
