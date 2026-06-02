import { useInbox } from '../hooks/web_inbox_hook';
import InboxView from '../components/InboxView';
import Layout from '../components/Layout';
import { getInboxApi, emailActionApi, getCurrentUserApi } from '../lib/web_api_barrel';
import { asEmailId, asEmailAction, ACTION_UPDATED, SUCCESS } from '$taxonomy';
import type { SanitizedUser, ApiOperationSuccess } from '$taxonomy';
import type { InboxListOutput, EmailActionOutput } from '$contract';
import type { AppContext } from '../root';

export async function loader({ request, context }: { request: Request, context: AppContext }): Promise<InboxListOutput & { isAdmin: boolean, currentUser: SanitizedUser, isMobileInitial: boolean, hasMore: boolean }> {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const isMobileInitial = /mobile|android|iphone|ipad|phone/i.test(ua);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;
  
  try {
    const [{ user: currentUser }, { emails, archivedCount }] = await Promise.all([
      getCurrentUserApi(url.origin, headers, apiHandler),
      getInboxApi(url.origin, headers, apiHandler, { limit: 100 })
    ]);
    const isAdmin = currentUser.role === 'admin';
    const hasMore = emails.length >= 100;
    return { userId: currentUser.id, emails, archivedCount, isAdmin, currentUser, isMobileInitial, hasMore };
  } catch (err) {
    throw new Response('Failed to load inbox', { status: 500 });
  }
}

export async function action({ request, context }: { request: Request, context: AppContext }): Promise<EmailActionOutput | { error: string }> {
  const url = new URL(request.url);
  const formData = await request.formData();
  const idRaw = formData.get('id') as string;
  const actionRaw = formData.get('action') as string;
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;
  
  if (!idRaw || !actionRaw) {
    return { error: 'Missing required parameters' };
  }

  try {
    const id = asEmailId(idRaw);
    const actionType = asEmailAction(actionRaw);
    await emailActionApi(id, actionType, url.origin, headers, apiHandler);
    return { updated: ACTION_UPDATED };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Action failed' };
  }
}

export function meta() {
  return [
    { title: "Inbox | Cloud Mail Flare" },
    { name: "description", content: "Manage your disposable emails" },
  ];
}

export function shouldRevalidate({ currentUrl, nextUrl, formMethod }: any) {
  if (formMethod === 'POST') return true;
  return currentUrl.pathname !== nextUrl.pathname;
}

export default function InboxPage() {
  const inboxProps = useInbox();
  return (
    <Layout title="Inbox Control Center">
      <InboxView {...inboxProps} />
    </Layout>
  );
}
