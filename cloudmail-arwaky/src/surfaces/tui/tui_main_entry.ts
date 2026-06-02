import { intro, outro, select, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { handleAuthMenu } from './tui_auth_screen.js';
import { handleUserMenu } from './tui_user_screen.js';
import { handleInboxMenu } from './tui_inbox_screen.js';
import { handleSettingsMenu } from './tui_settings_screen.js';
import { handleSystemMenu } from './tui_system_screen.js';
import { handleBrowserMenu } from './tui_browser_screen.js';
import { readFileSync } from 'fs';
import { join } from 'path';

let version = '1.0.0';
try {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  version = pkg.version ?? version;
} catch { /* fallback */ }

// Strip ANSI codes and control characters from error messages
function sanitizeError(msg: string): string {
  return msg
    .replace(/\u001b\[[0-9;]*m/g, '')     // ANSI escape codes
    .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '') // Control chars
    .replace(/[;|&`$(){}[\]\\*?<>\n\r]/g, '') // Shell metacharacters
    .slice(0, 500); // Cap length
}

export async function main() {
  console.log('\n' + pc.bold(pc.bgCyan(pc.black('  CLOUD MAIL FLARE TUI  '))) + pc.gray(` v${version}`) + '\n');
  intro(pc.cyan('Welcome to the premium email management experience.'));

  while (true) {
    const domain = await select({
      message: 'Select an area to interact with:',
      options: [
        { value: 'inbox', label: 'Inbox', hint: 'Read, list, wait for emails' },
        { value: 'auth', label: 'Authentication', hint: 'Login, verify code, health check' },
        { value: 'user', label: 'User Management', hint: 'List, create, update users' },
        { value: 'settings', label: 'Settings & API Keys', hint: 'Manage settings and keys' },
        { value: 'system', label: 'System', hint: 'Dashboard and cleanup operations' },
        { value: 'browser', label: 'Browser Automation', hint: 'Chrome CDP automation (local only)' },
        { value: 'exit', label: pc.gray('Exit') },
      ],
    });

    if (isCancel(domain) || domain === 'exit') {
      outro('Goodbye!');
      process.exit(0);
    }

    try {
      switch (domain) {
        case 'auth':
          await handleAuthMenu();
          break;
        case 'inbox':
          await handleInboxMenu();
          break;
        case 'user':
          await handleUserMenu();
          break;
        case 'settings':
          await handleSettingsMenu();
          break;
        case 'system':
          await handleSystemMenu();
          break;
        case 'browser':
          await handleBrowserMenu();
          break;
      }
    } catch (e: any) {
      const safe = sanitizeError(e?.message ?? String(e));
      console.error(pc.red(`\nAn error occurred: ${safe}\n`));
    }
  }
}

// Start TUI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
