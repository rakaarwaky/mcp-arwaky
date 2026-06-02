import { getSettingsApi, updateSettingsApi, runCleanupApi } from '../lib/web_api_barrel';
import { asSettingKey, asSettingValue, asErrorMessage, SUCCESS } from '$taxonomy';
import type { ApiOperationSuccess } from '$taxonomy';
import { useSettings } from '../hooks/web_settings_hook';
import SettingsView from '../components/SettingsView';
import Layout from '../components/Layout';
import type { WorkerSettingsGetOutput, WorkerSettingsUpdateOutput, CleanupOutput } from '$contract';
import type { AppContext } from '../root';

export async function loader({ request, context }: { request: Request, context: AppContext }): Promise<WorkerSettingsGetOutput> {
  const url = new URL(request.url);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;
  
  try {
    const data = await getSettingsApi(url.origin, headers, apiHandler);
    return { settings: data.settings };
  } catch (err) {
    throw new Response(err instanceof Error ? err.message : 'Failed to load settings', { status: 500 });
  }
}

export async function action({ request, context }: { request: Request, context: AppContext }): Promise<WorkerSettingsUpdateOutput | CleanupOutput | { error: string, intent?: string, message?: string }> {
  const url = new URL(request.url);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;

  try {
    switch (intent) {
      case 'save_setting': {
        const key = asSettingKey(formData.get('key') as string);
        const value = asSettingValue(formData.get('value') as string);
        await updateSettingsApi({ [key]: value }, url.origin, headers, apiHandler);
        return { ok: SUCCESS, intent, message: 'Setting updated' };
      }
      case 'cleanup': {
        const r = await runCleanupApi(24, url.origin, headers, apiHandler);
        return { ok: SUCCESS, intent, message: `Cleanup done: ${r.expiredEmails} emails, ${r.expiredSessions} sessions removed.` };
      }
      default:
        return { error: asErrorMessage('Unknown intent') };
    }
  } catch (err) {
    return { error: asErrorMessage(err instanceof Error ? err.message : 'Operation failed'), intent };
  }
}

export function meta() {
  return [
    { title: "Settings | Cloud Mail Flare" },
    { name: "description", content: "Configure system settings and quotas" },
  ];
}

export default function SettingsPage() {
  const settingsProps = useSettings();
  return (
    <Layout title="Settings">
      <SettingsView {...settingsProps} />
    </Layout>
  );
}
