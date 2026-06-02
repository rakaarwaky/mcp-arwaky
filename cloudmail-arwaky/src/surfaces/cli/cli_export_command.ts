// surfaces/cli/cli_export_command.ts
// Data export commands — export emails, audit logs, etc.

import { Command } from 'commander';
import { getAgent } from './cli_agent_util';
import { printResult, printError, debug } from './cli_format_util';
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { Email } from '../../taxonomy/email_mail_entity';
import type { AuditLog } from '../../taxonomy/audit_log_entity';
import { asUserId } from '../../taxonomy';

export function exportCommands(program: Command) {
  const exportCmd = program.command('export').description('Export data from Cloud Mail Flare');

  exportCmd
    .command('emails')
    .description('Export emails as JSON or CSV')
    .option('--userId <id>', 'User ID to export emails for')
    .option('-f, --format <format>', 'Export format (json|csv)', 'json')
    .option('-o, --output <path>', 'Output file path')
    .action(async (options) => {
      try {
        if (!options.userId) {
          throw new Error('User ID is required. Use --userId <id>');
        }

        debug(`Exporting emails for user: ${options.userId} in ${options.format} format`);
        const agent = getAgent();
        const inbox = await agent.getUserInbox(asUserId(options.userId));
        const emails: Email[] = inbox.emails;

        let content = '';
        if (options.format === 'csv') {
          const headers = ['id', 'from', 'to', 'subject', 'date', 'hasAttachments'];
          const rows = emails.map((e: Email) => [
            String(e.id),
            e.from.email.full,
            e.to.map(t => t.email.full).join(';'),
            `"${(e.subject || '').replace(/"/g, '""')}"`,
            e.receivedAt,
            String(e.attachments.length > 0)
          ].join(','));
          content = [headers.join(','), ...rows].join('\n');
        } else {
          content = JSON.stringify(emails, null, 2);
        }

        if (options.output) {
          writeFileSync(options.output, content);
          printResult({ message: `Exported ${emails.length} emails to ${options.output}` });
        } else {
          console.log(content);
        }
      } catch (err) {
        printError(err, 'Check your User ID and network connection.');
      }
    });

  exportCmd
    .command('audit-logs')
    .description('Export audit logs as JSON or CSV')
    .option('--userId <id>', 'User ID to export logs for')
    .option('--limit <n>', 'Maximum number of logs to export', '1000')
    .option('-f, --format <format>', 'Export format (json|csv)', 'json')
    .option('-o, --output <path>', 'Output file path')
    .action(async (options) => {
      try {
        if (!options.userId) {
          throw new Error('User ID is required. Use --userId <id>');
        }

        debug(`Exporting audit logs for user: ${options.userId} (limit: ${options.limit})`);
        const agent = getAgent();
        const logs = await agent.getUserAuditLogs(asUserId(options.userId), parseInt(options.limit, 10));

        let content = '';
        if (options.format === 'csv') {
          const headers = ['id', 'timestamp', 'eventType', 'userId', 'targetId', 'ipAddress'];
          const rows = logs.map((l: AuditLog) => [
            l.id,
            l.timestamp,
            l.eventType,
            l.userId || '',
            l.targetId || '',
            l.ipAddress || ''
          ].join(','));
          content = [headers.join(','), ...rows].join('\n');
        } else {
          content = JSON.stringify(logs, null, 2);
        }

        if (options.output) {
          writeFileSync(options.output, content);
          printResult({ message: `Exported ${logs.length} audit logs to ${options.output}` });
        } else {
          console.log(content);
        }
      } catch (err) {
        printError(err);
      }
    });
}
