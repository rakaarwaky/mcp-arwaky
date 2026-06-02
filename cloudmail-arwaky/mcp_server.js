import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const entryPath = join(__dirname, 'src/surfaces/mcp/mcp_tools_entry.ts');

/**
 * Cloud Mail Flare MCP Server Wrapper
 * This script provides a stable JS entry point for MCP clients that force execution via 'node'.
 * It uses 'tsx' to execute the TypeScript entry point with full ESM support.
 */

const args = [
  '--import', 'tsx/esm',
  entryPath,
  ...process.argv.slice(2)
];

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('[CMF-MCP-WRAPPER] Failed to start server:', err);
  process.exit(1);
});
