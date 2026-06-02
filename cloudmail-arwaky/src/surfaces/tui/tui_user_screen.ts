import { select, text, isCancel, password as promptPassword, spinner, note, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { getAgent } from '../cli/cli_agent_util';
import { asName, asUserId, createEmailAddress, asPassword } from '../../taxonomy';
import type { EmailAddress, Name, Password } from '../../taxonomy';

export async function handleUserMenu() {
  const action = await select({
    message: pc.bgCyan(pc.black(' USER MANAGEMENT ')) + ' Select action:',
    options: [
      { value: 'list', label: 'List Users' },
      { value: 'create', label: 'Create User' },
      { value: 'get', label: 'Get User Details' },
      { value: 'update', label: 'Update User' },
      { value: 'delete', label: 'Delete User' },
      { value: 'back', label: pc.gray('<- Back to Main Menu') }
    ]
  });

  if (isCancel(action) || action === 'back') return;

  switch (action) {
    case 'list': {
      const s = spinner();
      s.start('Fetching users...');
      try {
        const users = await getAgent().listUsers();
        s.stop(pc.green(`✓ Found ${pc.bold(users.length)} users`));
        
        if (users.length > 0) {
          const lines = users.map(u => 
            `${pc.cyan('ID:')} ${pc.bold(u.id)} | ${pc.cyan('Email:')} ${u.email?.full ?? u.email} | ${pc.cyan('Name:')} ${u.displayName ?? '-'} | ${pc.cyan('Created:')} ${String(u.createdAt).slice(0, 10)}`
          ).join('\n');
          note(lines, pc.cyan('Users List'));
        } else {
          note('No users found.');
        }
      } catch (e: any) {
        s.stop(pc.red('Error listing users'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'create': {
      const username = await text({ message: 'Username:' });
      if (isCancel(username)) return;

      const s = spinner();
      s.start('Creating user...');
      try {
        const user = await getAgent().createUser(asName(username));
        s.stop(pc.green(`✓ User created: ${pc.bold(username)}`));
        note(JSON.stringify(user, null, 2), pc.cyan('New User Details'));
      } catch (e: any) {
        s.stop(pc.red('Creation failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'get': {
      const userId = await text({ message: 'User ID:' });
      if (isCancel(userId)) return;

      const s = spinner();
      s.start('Fetching user...');
      try {
        const user = await getAgent().getUser(asUserId(userId));
        s.stop(pc.green('User fetched'));
        if (!user) {
          note('User not found', 'Result');
        } else {
          note(JSON.stringify(user, null, 2), 'User Details');
        }
      } catch (e: any) {
        s.stop(pc.red('Fetch failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'update': {
      const userId = await text({ message: 'User ID to update:' });
      if (isCancel(userId)) return;

      const email = await text({ message: 'New Email (optional, press Enter to skip):' });
      if (isCancel(email)) return;
      
      const name = await text({ message: 'New Name (optional, press Enter to skip):' });
      if (isCancel(name)) return;
      
      const pw = await promptPassword({ message: 'New Password (optional, press Enter to skip):' });
      if (isCancel(pw)) return;

      const updates: { email?: EmailAddress; displayName?: Name; password?: Password } = {};
      if (email) updates.email = createEmailAddress(email);
      if (name) updates.displayName = asName(name);
      if (pw) updates.password = asPassword(pw);

      if (Object.keys(updates).length === 0) {
        note('No updates provided. Skipping.');
        return;
      }

      const s = spinner();
      s.start('Updating user...');
      try {
        const user = await getAgent().updateUser(asUserId(userId), updates);
        s.stop(pc.green('User updated'));
        note(JSON.stringify(user, null, 2), 'Updated User');
      } catch (e: any) {
        s.stop(pc.red('Update failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'delete': {
      const userId = await text({ message: 'User ID to delete:' });
      if (isCancel(userId)) return;

      const shouldDelete = await confirm({
        message: pc.red(`Are you sure you want to soft-delete user ${userId}?`)
      });
      if (isCancel(shouldDelete) || !shouldDelete) return;

      const s = spinner();
      s.start('Deleting user...');
      try {
        const out = await getAgent().softDeleteUser(asUserId(userId));
        if (out.deleted) {
          s.stop(pc.green(`✓ User ${pc.bold(userId)} deleted.`));
        } else {
          s.stop(pc.yellow(`Deletion failed: ${out.reason}`));
        }
        note(JSON.stringify(out, null, 2), 'Result');
      } catch (e: any) {
        s.stop(pc.red('Deletion failed.'));
        note(e.message, 'Error');
      }
      break;
    }
  }
}
