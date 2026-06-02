import { select, text, isCancel, spinner, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAgent } from '../cli/cli_agent_util';
import { asUserId, asEmailId, asSearchFrom, asSubject, asTimeoutSeconds, asPollIntervalSeconds, asEmailAction } from '../../taxonomy';

async function resolveUserId(): Promise<string | symbol> {
  const s = spinner();
  s.start('Fetching users...');
  try {
    const users = await getAgent().listUsers();
    s.stop();
    if (users.length === 0) {
      note('No users found in the system.', 'Error');
      return Symbol('Cancel');
    }
    if (users.length === 1) {
      return users[0]!.id;
    }
    const selected = await select({
      message: 'Select a user:',
      options: users.map(u => ({ value: u.id, label: u.displayName ?? u.email?.full ?? u.id }))
    }) as string | symbol;
    return selected;
  } catch (e: any) {
    s.stop('Failed to fetch users');
    note(e.message, 'Error');
    return Symbol('Cancel');
  }
}

export async function handleInboxMenu() {
  const action = await select({
    message: pc.bgCyan(pc.black(' INBOX MANAGEMENT ')) + ' Select action:',
    options: [
      { value: 'list', label: 'List Emails' },
      { value: 'get', label: 'Get Email Details' },
      { value: 'wait', label: 'Wait for Email' },
      { value: 'action', label: 'Apply Action on Email' },
      { value: 'back', label: pc.gray('<- Back to Main Menu') }
    ]
  });

  if (isCancel(action) || action === 'back') return;

  switch (action) {
    case 'list': {
      const userId = await resolveUserId();
      if (typeof userId !== 'string') return;
      
      const s = spinner();
      s.start('Fetching inbox...');
      try {
        const result = await getAgent().getUserInbox(asUserId(userId));
        s.stop(pc.green('Inbox fetched'));
        
        if (result.emails.length === 0) {
          note('Inbox is empty.');
          return;
        }

        const lines = result.emails.map((e: any) => 
          `${pc.cyan((e.id ?? '-').slice(0, 12))} | ${pc.bold(String(e.sender?.full ?? e.sender ?? '-').slice(0, 30))} | ${pc.italic(String(e.subject ?? '(no subject)').slice(0, 45))} | ${pc.gray(String(e.receivedAt ?? '-').slice(0, 16))}`
        ).join('\n');
        
        note(lines, pc.cyan(`Inbox for ${pc.bold(userId)} (${result.archivedCount} archived)`));
      } catch (e: any) {
        s.stop(pc.red('Failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'get': {
      const userId = await resolveUserId();
      if (typeof userId !== 'string') return;

      const emailId = await text({ message: 'Email ID:' });
      if (isCancel(emailId)) return;

      const s = spinner();
      s.start('Fetching email...');
      try {
        const email = await getAgent().getEmail(asUserId(userId), asEmailId(emailId));
        s.stop(pc.green('Email fetched'));
        if (!email) {
          note('Not found', 'Result');
        } else {
          note(JSON.stringify(email, null, 2), 'Email Details');
        }
      } catch (e: any) {
        s.stop(pc.red('Failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'wait': {
      const userId = await resolveUserId();
      if (typeof userId !== 'string') return;

      const from = await text({ message: 'From (optional):', placeholder: 'Leave empty to ignore' });
      const subject = await text({ message: 'Subject (optional):', placeholder: 'Leave empty to ignore' });
      const timeout = await text({ message: 'Timeout (seconds):', initialValue: '60' });
      
      if (isCancel(from) || isCancel(subject) || isCancel(timeout)) return;

      const s = spinner();
      s.start(`Waiting for email (timeout: ${timeout}s)...`);
      try {
        const input = {
          userId: asUserId(userId),
          from: from ? asSearchFrom(from) : undefined,
          subject: subject ? asSubject(subject) : undefined,
          timeout: asTimeoutSeconds(parseInt(timeout)),
          pollInterval: asPollIntervalSeconds(5)
        };
        const email = await getAgent().waitForEmail(input.userId, input);
        if (!email) {
          s.stop(pc.red('Timeout elapsed.'));
        } else {
          s.stop(pc.green('✓ Email received!'));
          note(JSON.stringify(email, null, 2), pc.cyan('Received Email Details'));
        }
      } catch (e: any) {
        s.stop(pc.red('Wait failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'action': {
      const userId = await resolveUserId();
      if (typeof userId !== 'string') return;

      const emailId = await text({ message: 'Email ID:' });
      if (isCancel(emailId)) return;

      const emailAction = await select({
        message: 'Select action to apply:',
        options: [
          { value: 'archive', label: 'Archive' },
          { value: 'star', label: 'Star' },
          { value: 'unstar', label: 'Unstar' },
          { value: 'read', label: 'Mark as read' },
          { value: 'unread', label: 'Mark as unread' },
          { value: 'delete', label: 'Delete' },
        ]
      });
      if (isCancel(emailAction)) return;

      const s = spinner();
      s.start(`Applying ${emailAction}...`);
      try {
        const result = await getAgent().applyEmailAction(asUserId(userId), asEmailId(emailId), asEmailAction(emailAction as string));
        s.stop(pc.green(`✓ Action ${pc.bold(String(emailAction))} applied successfully`));
        note(JSON.stringify(result, null, 2), pc.cyan('Action Result'));
      } catch (e: any) {
        s.stop(pc.red('Action failed.'));
        note(e.message, 'Error');
      }
      break;
    }
  }
}
