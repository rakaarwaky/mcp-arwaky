// surfaces/cli/cli_settings_command.ts
import { Command } from 'commander';
import { getAgent } from './cli_agent_util';
import { success, info, warn, printTable, printJson, printError, exit, highlight, mask } from './cli_format_util';
import { output } from './cli_main_entry';
import type { WorkerSettingsGetOutput, WorkerSettingsUpdateInput, ApiKeyListOutput, ApiKeyCreateInput } from '../../contract';
import { asUrl, asName, asApiKeyId, asApiKeyPlain, VALID } from '../../taxonomy';
import type { SettingKey, SettingValue } from '../../taxonomy';

export function settingsCommands(program: Command) {
  const settings = program.command('settings').description('Worker settings');
  settings.command('get').action(async () => {
    try {
      const out: WorkerSettingsGetOutput = await getAgent().getWorkerSettings();
      if (output.json) { printJson(out); return; }
      printTable(Object.entries(out.settings ?? {}).map(([k, v]) => ({ key: k, value: String(v ?? '').slice(0, 60) })));
    } catch (e) { printError(e); exit(1); }
  });
  settings.command('set').argument('<key>').argument('<value>').option('--dry-run', 'Preview changes without applying them').action(async function (key: string, value: string) {
    try {
      const opts = this.opts();
      if (opts.dryRun) {
        info(`[DRY RUN] Would set ${highlight(key)} = ${highlight(value)}`);
        return;
      }
      const input: WorkerSettingsUpdateInput = { updates: { [key as SettingKey]: value as SettingValue } };
      await getAgent().updateWorkerSettings(input.updates); success(`${highlight(key)} = ${highlight(value)}`);
    } catch (e) {
      printError(e, 'Verify the keys are valid (e.g. baseUrl, timeout)');
      exit(1);
    }
  });
  const apikey = program.command('apikey').description('API keys');
  apikey.command('list').action(async () => {
    try {
      const out: ApiKeyListOutput = { keys: await getAgent().listApiKeys() };
      if (output.json) { printJson(out); return; }
      if (out.keys.length === 0) { info('No keys'); return; }
      printTable(out.keys.map(k => ({
        id: mask(k.id),
        name: k.name ?? '-',
        created: k.createdAt?.slice(0, 10),
        status: k.isActive ? 'active' : 'revoked'
      })));
    } catch (e) { printError(e); exit(1); }
  });
  apikey.command('create').argument('<name>').action(async (name: string) => {
    try {
      const input: ApiKeyCreateInput = { name: asName(name) };
      const result = await getAgent().createApiKey({ name: input.name });
      if (output.json) {
        printJson({ apiKey: result.apiKey, plainKey: '[REDACTED]' });
        warn('Sensitive data plainKey redacted from JSON output. Use standard output to view once.');
        return;
      }
      success(`API Key ${highlight(name)} created`);
      info(`Plain Key: ${highlight(result.plainKey)}`);
      warn('This is the ONLY time this key will be shown in plain text. Store it securely!');
    } catch (e) { printError(e); exit(1); }
  });
  apikey.command('revoke').argument('<keyId>').option('--dry-run', 'Preview changes without applying them').action(async function (keyId: string) {
    try {
      const opts = this.opts();
      if (opts.dryRun) {
        info(`[DRY RUN] Would revoke key: ${highlight(keyId)}`);
        return;
      }
      await getAgent().revokeApiKey({ apiKeyId: asApiKeyId(keyId) }); success(`Revoked key: ${highlight(keyId)}`);
    }
    catch (e) {
      printError(e, 'Verify the key ID exists and is active');
      exit(1);
    }
  });

  apikey.command('verify')
    .argument('<keyPlain>', 'Plain API key to verify (e.g. sk-...)')
    .action(async (keyPlain: string) => {
      try {
        const result = await getAgent().apiQuota.verifyApiKeyPlain(asApiKeyPlain(keyPlain));
        if (output.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.valid === VALID) {
            success(`API key is valid. userId=${result.userId ?? 'null'}, apiKeyId=${result.apiKeyId ?? 'null'}`);
          } else {
            info(`API key is INVALID or revoked.`);
          }
        }
      } catch (e) {
        printError(e, 'Failed to verify API key');
        exit(1);
      }
    });
}
