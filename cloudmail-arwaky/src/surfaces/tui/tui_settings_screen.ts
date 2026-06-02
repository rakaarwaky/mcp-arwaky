import { select, text, isCancel, spinner, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAgent } from '../cli/cli_agent_util';
import { asUrl, asName, asApiKeyId } from '../../taxonomy';
import type { SettingKey, SettingValue } from '../../taxonomy';

export async function handleSettingsMenu() {
  const action = await select({
    message: pc.bgCyan(pc.black(' SETTINGS & API KEYS ')) + ' Select action:',
    options: [
      { value: 'getSettings', label: 'Get Worker Settings' },
      { value: 'setSetting', label: 'Update a Setting' },
      { value: 'listKeys', label: 'List API Keys' },
      { value: 'createKey', label: 'Create API Key' },
      { value: 'revokeKey', label: 'Revoke API Key' },
      { value: 'back', label: pc.gray('<- Back to Main Menu') }
    ]
  });

  if (isCancel(action) || action === 'back') return;

  switch (action) {
    case 'getSettings': {
      const s = spinner();
      s.start('Fetching settings...');
      try {
        const out = await getAgent().getWorkerSettings();
        s.stop(pc.green('Settings fetched'));
        const lines = Object.entries(out.settings ?? {}).map(([k, v]) => `${pc.cyan(k)} = ${pc.bold(String(v).slice(0, 60))}`).join('\n');
        note(lines || 'No custom settings', pc.cyan('Worker Settings'));
      } catch (e: any) {
        s.stop(pc.red('Fetch failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'setSetting': {
      const key = await text({ message: 'Setting Key:' });
      if (isCancel(key)) return;
      const value = await text({ message: 'Setting Value:' });
      if (isCancel(value)) return;

      const s = spinner();
      s.start('Updating setting...');
      try {
        await getAgent().updateWorkerSettings({ [key as SettingKey]: value as SettingValue });
        s.stop(pc.green(`Setting ${key} updated.`));
      } catch (e: any) {
        s.stop(pc.red('Update failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'listKeys': {
      const s = spinner();
      s.start('Fetching API keys...');
      try {
        const keys = await getAgent().listApiKeys();
        s.stop(pc.green(`Found ${keys.length} keys`));
        if (keys.length > 0) {
          const lines = keys.map(k => `${pc.cyan('ID:')} ${pc.bold(k.id)} | ${pc.cyan('Name:')} ${k.name ?? '-'} | ${pc.cyan('Status:')} ${k.isActive ? pc.green('active') : pc.red('revoked')} | ${pc.cyan('Created:')} ${k.createdAt?.slice(0, 10)}`).join('\n');
          note(lines, pc.cyan('API Keys'));
        } else {
          note('No keys found.');
        }
      } catch (e: any) {
        s.stop(pc.red('Fetch failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'createKey': {
      const name = await text({ message: 'Key Name:' });
      if (isCancel(name) || !name) return;

      const s = spinner();
      s.start('Creating API key...');
      try {
        const result = await getAgent().createApiKey({ name: asName(name) });
        s.stop(pc.green('✓ Key created!'));
        note(`${pc.cyan('API Key:')} ${pc.bold(result.apiKey.id)}\n${pc.cyan('Plain Key:')} ${pc.bold(result.plainKey)}`, pc.bgBlack(pc.yellow(' CREDENTIALS (SAVE THESE!) ')));
      } catch (e: any) {
        s.stop(pc.red('Create failed.'));
        note(e.message, 'Error');
      }
      break;
    }
    case 'revokeKey': {
      const keyId = await text({ message: 'Key ID to revoke:' });
      if (isCancel(keyId) || !keyId) return;

      const s = spinner();
      s.start('Revoking...');
      try {
        await getAgent().revokeApiKey({ apiKeyId: asApiKeyId(keyId) });
        s.stop(pc.green(`Key ${keyId} revoked.`));
      } catch (e: any) {
        s.stop(pc.red('Revoke failed.'));
        note(e.message, 'Error');
      }
      break;
    }
  }
}
