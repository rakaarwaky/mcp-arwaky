// surfaces/cli/cli_inbox_command.ts
import { Command } from 'commander';
import { getAgent } from './cli_agent_util';
import { success, info, printTable, printJson, printError, exit, warn, highlight } from './cli_format_util';
import { output } from './cli_main_entry';
import type { InboxListOutput, EmailGetInput, EmailGetOutput, EmailWaitInput, EmailActionInput } from '../../contract';
import { asUserId, asEmailId, asSearchFrom, asSubject, asTimeoutSeconds, asPollIntervalSeconds, asEmailAction } from '../../taxonomy';

async function resolveUserId(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const users = await getAgent().listUsers();
  if (users.length === 0) { printError('No users'); exit(1); }
  if (users.length > 1 && !output.quiet) warn(`Multiple users, using: ${highlight(users[0]!.id)}`);
  return users[0]!.id;
}

export function inboxCommands(program: Command) {
  const inbox = program.command('inbox').description('Email inbox');
  inbox.command('list').option('-u, --user <userId>').action(async function () {
    try {
      const userId = await resolveUserId(this.optsWithGlobals().user);
      const result = await getAgent().getUserInbox(asUserId(userId));
      const out: InboxListOutput = { userId: asUserId(userId), emails: result.emails, archivedCount: result.archivedCount };
      if (output.json) { printJson(out); return; }
      if (out.emails.length === 0) { info('Inbox empty'); return; }
      printTable(out.emails.map((e: any) => ({ id: (e.id ?? '-').slice(0, 12), from: String(e.sender?.full ?? e.sender ?? '-').slice(0, 30), subject: String(e.subject ?? '(no subject)').slice(0, 45), date: String(e.receivedAt ?? '-').slice(0, 16) })));
      if (out.archivedCount > 0) info(`${out.archivedCount} archived`);
    } catch (e) {
      printError(e, 'Use `cmf user list` to find valid user IDs or `cmf auth health` to check connectivity.');
      exit(1);
    }
  });
  inbox.command('get').argument('<emailId>').option('-u, --user <userId>').action(async function (emailId: string) {
    try {
      const userId = await resolveUserId(this.optsWithGlobals().user);
      const input: EmailGetInput = { emailId: asEmailId(emailId), userId: asUserId(userId) };
      const out: EmailGetOutput = { email: await getAgent().getEmail(input.userId!, input.emailId) };
      if (!out.email) { printError('Not found'); exit(1); }
      printJson(out);
    } catch (e) {
      printError(e, 'Verify that the email ID exists and belongs to the specified user.');
      exit(1);
    }
  });
  inbox.command('wait').option('-f, --from <sender>').option('-s, --subject <text>').option('-t, --timeout <sec>', '60').option('-i, --interval <sec>', '5').option('-u, --user <userId>')
    .action(async function () {
      try {
        const opts = this.optsWithGlobals();
        const userId = await resolveUserId(opts.user);
        const input: EmailWaitInput = { userId: asUserId(userId), from: opts.from ? asSearchFrom(opts.from) : undefined, subject: opts.subject ? asSubject(opts.subject) : undefined, timeout: asTimeoutSeconds(parseInt(opts.timeout)), pollInterval: asPollIntervalSeconds(parseInt(opts.interval)) };
        info(`Waiting for email ${opts.from ? `from ${highlight(opts.from)}` : ''} ${opts.subject ? `with subject ${highlight(opts.subject)}` : ''} (${opts.timeout}s)...`);
        const email = await getAgent().waitForEmail(input.userId, input);
        if (!email) { printError('Timeout'); exit(1); }
        success('Received!'); printJson({ email, timedOut: false });
      } catch (e) {
        printError(e, 'Increase the timeout with `--timeout <sec>` if the network is slow.');
        exit(1);
      }
    });
  inbox.command('action').argument('<emailId>').argument('<action>').option('-u, --user <userId>').action(async function (emailId: string, action: string) {
    try {
      const userId = await resolveUserId(undefined);
      const input: EmailActionInput = { userId: asUserId(userId), emailId: asEmailId(emailId), action: asEmailAction(action) };
      const result = await getAgent().applyEmailAction(input.userId, input.emailId, input.action);
      success(`${highlight(action)} applied to ${highlight(emailId)}`); printJson({ updated: result.updated, email: result.email, reason: result.reason });
    } catch (e) {
      printError(e, 'Check if the action is supported and the email ID is correct.');
      exit(1);
    }
  });
}
