// surfaces/cli/cli_user_command.ts
import { Command } from 'commander';
import { getAgent } from './cli_agent_util';
import { success, info, printTable, printJson, printError, exit, highlight } from './cli_format_util';
import { output } from './cli_main_entry';
import type { UserListOutput, UserCreateInput, UserGetInput, UserGetOutput, UserUpdateInput } from '../../contract';
import type { SoftDeleteResult } from '../../taxonomy';
import { asName, asUserId, createEmailAddress, asPassword } from '../../taxonomy';

export function userCommands(program: Command) {
  const user = program.command('user').description('User management');
  user.command('list').action(async () => {
    try {
      const out: UserListOutput = { users: await getAgent().listUsers() };
      if (output.json) { printJson(out); return; }
      if (out.users.length === 0) {
        info('No users found. Suggestion: run `cmf user create <username>` to create your first user.');
        return;
      }
      printTable(out.users.map((u: any) => ({ id: u.id, email: u.email?.full ?? u.email, name: u.displayName ?? '-', created: u.createdAt?.slice(0, 10) ?? '-' })));
    } catch (e) {
      printError(e, 'Check your connection or run `cmf auth health`');
      exit(1);
    }
  });
  user.command('create').argument('<username>').action(async (username: string) => {
    try {
      const input: UserCreateInput = { username: asName(username) };
      success(`User created: ${highlight(username)}`); printJson(await getAgent().createUser(input.username));
    } catch (e) { printError(e); exit(1); }
  });
  user.command('get').argument('<userId>').action(async (userId: string) => {
    try {
      const input: UserGetInput = { userId: asUserId(userId) };
      const out: UserGetOutput = { user: await getAgent().getUser(input.userId) };
      if (!out.user) { printError('Not found'); exit(1); }
      printJson(out);
    } catch (e) { printError(e); exit(1); }
  });
  user.command('update').argument('<userId>').option('-e, --email <email>').option('-n, --name <name>').option('-p, --password <password>')
    .action(async function (userId: string) {
      try {
        const opts = this.optsWithGlobals();
        const input: UserUpdateInput = {
          userId: asUserId(userId),
          updates: {
            ...(opts.email && { email: createEmailAddress(opts.email) }),
            ...(opts.name && { displayName: asName(opts.name) }),
            ...(opts.password && { password: asPassword(opts.password) }),
          },
        };
        if (Object.keys(input.updates).length === 0) { printError('No updates'); exit(1); }
        success(`User ${highlight(userId)} updated`); printJson({ user: await getAgent().updateUser(input.userId, input.updates) });
      } catch (e) { printError(e); exit(1); }
    });
  user.command('delete').argument('<userId>').option('--dry-run', 'Preview changes without applying them').action(async function (userId: string) {
    try {
      const opts = this.opts();
      if (opts.dryRun) {
        info(`[DRY RUN] Would delete user: ${highlight(userId)}`);
        return;
      }
      const out = await getAgent().softDeleteUser(asUserId(userId));
      if (out.deleted) success(`Deleted: ${highlight(userId)}`); else printError(`Failed: ${out.reason}`);
      printJson(out);
    } catch (e) {
      printError(e, 'Verify the user ID or check your permissions');
      exit(1);
    }
  });
}
