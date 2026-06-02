// surfaces/cli/cli_auth_command.ts
import { Command } from 'commander';
import { getAgent, setToken, currentToken } from './cli_agent_util';
import { success, printJson, printError, exit, highlight } from './cli_format_util';
import { output } from './cli_main_entry';
import type { AuthLoginInput, AuthLoginOutput, AuthHealthOutput } from '../../contract';
import { createEmailAddress, asPassword, asUserAgent, asClientIp } from '../../taxonomy';

export function authCommands(program: Command) {
  const auth = program.command('auth').description('Authentication');
  auth.command('login').argument('<email>').argument('<password>')
    .action(async (email: string, password: string) => {
      try {
        const input: AuthLoginInput = { email: createEmailAddress(email), password: asPassword(password), userAgent: asUserAgent('cmf-cli'), clientIp: asClientIp('127.0.0.1') };
        const output: AuthLoginOutput = await getAgent().login(input.email, input.password, { userAgent: input.userAgent, clientIp: input.clientIp });
        success(`Logged in as ${highlight(email)}`); printJson(output);
      } catch (e) {
        printError(e, 'Check your credentials or run `cmf auth health` to verify API availability.');
        exit(1);
      }
    });
  auth.command('logout').action(async () => {
    try { if (currentToken) { await getAgent().logout(currentToken); setToken(null); } success('Logged out'); }
    catch (e) { printError(e); exit(1); }
  });
  auth.command('health').action(async () => {
    try {
      const output: AuthHealthOutput = await getAgent().healthCheck();
      success(`API healthy (${highlight('premium')})`); printJson(output);
    } catch (e) {
      printError(e, 'The backend might be down. Verify `api.baseUrl` in `cmf config show`.');
      exit(1);
    }
  });
}
