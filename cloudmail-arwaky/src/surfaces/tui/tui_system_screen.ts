import { select, text, isCancel, spinner, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAgent } from '../cli/cli_agent_util';
import { asMaxAgeHours, asUserId } from '../../taxonomy';

export async function handleSystemMenu() {
  const action = await select({
    message: pc.bgCyan(pc.black(' SYSTEM OPERATIONS ')) + ' Select action:',
    options: [
      { value: 'dashboard', label: 'View Dashboard Metrics' },
      { value: 'cleanup', label: 'Run System Cleanup' },
      { value: 'back', label: pc.gray('<- Back to Main Menu') }
    ]
  });

  if (isCancel(action) || action === 'back') return;

  switch (action) {
    case 'dashboard': {
      const s = spinner();
      s.start('Fetching metrics...');
      try {
        const users = await getAgent().listUsers();
        const userId = asUserId(users[0]?.id ?? '');
        const metrics = await getAgent().getDashboardMetrics(userId);
        s.stop(pc.green('✓ Dashboard loaded'));
        
        let output = '\n';
        for (const m of metrics) {
          const icon = m.status === 'ok' ? pc.green('✓') : m.status === 'warning' ? pc.yellow('⚠') : pc.red('✗');
          const value = m.status === 'warning' ? pc.yellow(pc.bold(m.value)) : pc.cyan(pc.bold(m.value));
          output += `${icon} ${pc.white(m.label.padEnd(25))} ${value}\n`;
        }
        note(output, pc.cyan('System Metrics Summary'));
      } catch (e: any) {
        s.stop(pc.red('Fetch failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'cleanup': {
      const maxAgeStr = await text({ message: 'Max Age (hours) for cleanup:', initialValue: '24' });
      if (isCancel(maxAgeStr)) return;
      const maxAge = parseInt(maxAgeStr);

      const s = spinner();
      s.start('Running cleanup...');
      try {
        const out = await getAgent().runCleanup(asMaxAgeHours(maxAge));
        s.stop(pc.green('✓ Cleanup complete'));
        note(`${pc.cyan('Expired Emails:')} ${pc.bold(out.expiredEmails)}\n${pc.cyan('Expired Sessions:')} ${pc.bold(out.expiredSessions)}`, pc.cyan('Cleanup Result'));
      } catch (e: any) {
        s.stop(pc.red('Cleanup failed.'));
        note(e.message, 'Error');
      }
      break;
    }
  }
}
