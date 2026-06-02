// surfaces/cli/cli_browser_command.ts
// Chrome CDP browser automation commands — LOCAL NODE.JS ONLY

import { Command } from 'commander';
import { getAgent } from './cli_agent_util';
import { success, info, printJson, printError, exit, highlight } from './cli_format_util';
import { output } from './cli_main_entry';
import type { OpenRouterSignupInput, OpenRouterSignupOutput } from '../../contract';
import type { VerificationCode } from '../../taxonomy';
import { createEmailAddress, asPasswordPlain, asUserId, asSearchFrom, asSubject, asTimeoutSeconds, asPollIntervalSeconds, asVerificationCode } from '../../taxonomy';

async function resolveUserId(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const users = await getAgent().listUsers();
  if (users.length === 0) { printError('No users found — create a user first'); exit(1); }
  if (users.length > 1 && !output.quiet) info(`Multiple users, using: ${highlight(users[0]!.id)}`);
  return users[0]!.id;
}

class CmfInboxOtpProvider {
  constructor(private userId: string, private emailAddress: string) {}

  async fetchOtp(): Promise<VerificationCode> {
    info('Waiting for OpenRouter verification email...');
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
    info(`OTP received: ${highlight(match[0])}`);
    return asVerificationCode(match[0]);
  }
}

export function browserCommands(program: Command) {
  const browser = program.command('browser').description('Browser automation via Chrome CDP (local only)');

  browser.command('openrouter-signup')
    .argument('<email>', 'Email address for OpenRouter account')
    .argument('<password>', 'Password for OpenRouter account')
    .option('-u, --user <userId>', 'CMF user to monitor for OTP email')
    .option('--headless', 'Run Chrome in headless mode', false)
    .description('Automate OpenRouter signup using Chrome CDP')
    .action(async function (email: string, password: string) {
      try {
        const opts = this.optsWithGlobals();
        const userId = await resolveUserId(opts.user);

        info('Launching Chrome CDP for OpenRouter signup...');
        if (opts.headless) {
          process.env.CHROME_HEADLESS = 'true';
        }

        const input: OpenRouterSignupInput = {
          email: createEmailAddress(email),
          password: asPasswordPlain(password),
        };

        const otpProvider = new CmfInboxOtpProvider(userId, email);
        const out: OpenRouterSignupOutput = await getAgent().openRouterSignup(input, otpProvider);

        if (out.success) {
          success(`OpenRouter signup complete (stage: ${out.stage})`);
          if (out.apiKey) {
            info(`API Key: ${highlight(out.apiKey.slice(0, 20) + '...')}`);
          }
        } else {
          printError(`Failed at stage ${out.stage}: ${out.error}`);
          exit(1);
        }

        printJson(out);
      } catch (e) {
        printError(e);
        exit(1);
      }
    });

  browser.command('status')
    .description('Check Chrome CDP availability')
    .action(async () => {
      const hasCdp = getAgent().hasBrowserAutomation();
      if (hasCdp) {
        success('Chrome CDP is available (local Node.js)');
        printJson({ available: true, environment: 'local' });
      } else {
        printError('Chrome CDP not available — are you running inside a Worker?');
        printJson({ available: false, environment: 'worker' });
        exit(1);
      }
    });
}
