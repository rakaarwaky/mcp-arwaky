import { select, text, isCancel, spinner, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAgent } from '../cli/cli_agent_util';
import { createEmailAddress, asPasswordPlain, asUserId, asSearchFrom, asSubject, asTimeoutSeconds, asPollIntervalSeconds, asVerificationCode } from '../../taxonomy';
import type { VerificationCode } from '../../taxonomy';
import type { OpenRouterSignupInput, OpenRouterSignupOutput } from '../../contract';

class CmfInboxOtpProvider {
  constructor(private userId: string) {}

  async fetchOtp(): Promise<VerificationCode> {
    const email = await getAgent().waitForEmail(
      asUserId(this.userId),
      {
        from: asSearchFrom('noreply@openrouter.ai'),
        subject: asSubject('verification'),
        timeout: asTimeoutSeconds(120),
        pollInterval: asPollIntervalSeconds(5),
      }
    );
    if (!email) {
      throw new Error('OTP email not received within timeout');
    }
    const body = email.bodyText || email.bodyHtml || '';
    const match = body.match(/\b\d{6}\b/);
    if (!match) {
      throw new Error('Could not find 6-digit OTP in email body');
    }
    return asVerificationCode(match[0]!);
  }
}

export async function handleBrowserMenu() {
  const action = await select({
    message: pc.bgCyan(pc.black(' BROWSER AUTOMATION ')) + ' Select action:',
    options: [
      { value: 'openrouter-signup', label: 'OpenRouter Signup', hint: 'Automate signup via Chrome CDP' },
      { value: 'status', label: 'Check CDP Status', hint: 'Verify Chrome CDP availability' },
      { value: 'back', label: pc.gray('<- Back to Main Menu') }
    ]
  });

  if (isCancel(action) || action === 'back') return;

  switch (action) {
    case 'openrouter-signup': {
      const users = await getAgent().listUsers();
      if (users.length === 0) {
        note('No users found. Create a user first.', 'Error');
        return;
      }
      const userId = users[0]!.id;

      const email = await text({ message: 'OpenRouter email address:' });
      if (isCancel(email)) return;

      const password = await text({ message: 'OpenRouter password:', placeholder: 'min 8 chars' });
      if (isCancel(password)) return;

      const s = spinner();
      s.start('Launching Chrome CDP for OpenRouter signup...');
      try {
        const input: OpenRouterSignupInput = {
          email: createEmailAddress(String(email)),
          password: asPasswordPlain(String(password)),
        };
        const otpProvider = new CmfInboxOtpProvider(userId);
        const out: OpenRouterSignupOutput = await getAgent().openRouterSignup(input, otpProvider);

        if (out.success) {
          s.stop(pc.green('✓ Signup complete'));
          let msg = `${pc.cyan('Stage:')} ${pc.bold(out.stage)}\n`;
          if (out.apiKey) msg += `${pc.cyan('API Key:')} ${pc.bold(out.apiKey.slice(0, 24) + '...')}`;
          note(msg, pc.cyan('OpenRouter Account Created'));
        } else {
          s.stop(pc.red('✗ Signup failed'));
          note(`${pc.cyan('Stage:')} ${out.stage}\n${pc.red(out.error ?? 'Unknown error')}`, 'Error');
        }
      } catch (e: any) {
        s.stop(pc.red('✗ Error'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'status': {
      const hasCdp = getAgent().hasBrowserAutomation();
      if (hasCdp) {
        note(`${pc.green('Available')}\nEnvironment: local Node.js`, pc.cyan('Chrome CDP Status'));
      } else {
        note(`${pc.red('Not available')}\nRunning inside Cloudflare Worker?`, pc.yellow('Chrome CDP Status'));
      }
      break;
    }
  }
}
