import { select, text, isCancel, password as promptPassword, spinner, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAgent, setToken, currentToken } from '../cli/cli_agent_util';
import { createEmailAddress, asPassword, asUserAgent, asClientIp } from '../../taxonomy';

export async function handleAuthMenu() {
  const action = await select({
    message: pc.bgCyan(pc.black(' AUTHENTICATION ')) + ' Select action:',
    options: [
      { value: 'login', label: 'Login' },
      { value: 'logout', label: 'Logout' },
      { value: 'health', label: 'API Health Check' },
      { value: 'back', label: pc.gray('<- Back to Main Menu') }
    ]
  });

  if (isCancel(action) || action === 'back') return;

  switch (action) {
    case 'login': {
      const email = await text({ message: 'Email address:' });
      if (isCancel(email)) return;
      const pw = await promptPassword({ message: 'Password:' });
      if (isCancel(pw)) return;
      
      const s = spinner();
      s.start('Logging in...');
      try {
        const input = { 
          email: createEmailAddress(email), 
          password: asPassword(pw), 
          userAgent: asUserAgent('cmf-tui'), 
          clientIp: asClientIp('127.0.0.1') 
        };
        const output = await getAgent().login(input.email, input.password, { userAgent: input.userAgent, clientIp: input.clientIp });
        setToken(output.token); 
        s.stop(pc.green(`✓ Logged in as ${pc.bold(email)}`));
        note(JSON.stringify(output, null, 2), pc.cyan('Login Overview'));
      } catch (e: any) {
        s.stop(pc.red('Login failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'logout': {
      const s = spinner();
      s.start('Logging out...');
      try {
        if (currentToken) { 
          await getAgent().logout(currentToken); 
          setToken(null); 
        }
        s.stop(pc.green('✓ Logged out successfully!'));
      } catch (e: any) {
        s.stop(pc.red('Logout failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'health': {
      const s = spinner();
      s.start('Checking API health...');
      try {
        const output = await getAgent().healthCheck();
        s.stop(pc.green(`✓ API is ${pc.bold('healthy')}!`));
        note(JSON.stringify(output, null, 2), pc.cyan('Health Check Details'));
      } catch (e: any) {
        s.stop(pc.red('API unreachable.'));
        note(e.message, 'Error');
      }
      break;
    }
  }
}
