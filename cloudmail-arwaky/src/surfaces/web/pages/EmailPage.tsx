import { useEmail } from '../hooks/web_email_hook';
import EmailView from '../components/EmailView';
import Layout from '../components/Layout';
import { getEmailApi, emailActionApi } from '../lib/web_api_barrel';
import { asEmailId, asEmailAction, ACTION_UPDATED } from '$taxonomy';
import type { Email } from '$taxonomy';
import type { EmailGetOutput, EmailActionOutput } from '$contract';
import type { AppContext } from '../root';

export async function loader({ params, request, context }: { params: { emailId: string }, request: Request, context: AppContext }): Promise<EmailGetOutput & { error: string | null }> {
  const url = new URL(request.url);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;
  
  try {
    const data = await getEmailApi(asEmailId(params.emailId), url.origin, headers, apiHandler);
    return { email: data.email, error: null };
  } catch (err) {
    return { email: null, error: err instanceof Error ? err.message : 'Failed to load email' };
  }
}

export async function action({ params, request, context }: { params: { emailId: string }, request: Request, context: AppContext }): Promise<EmailActionOutput | { error: string }> {
  const url = new URL(request.url);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const emailId = asEmailId(params.emailId);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;

  try {
    if (!intent) throw new Error('Action intent is required');
    await emailActionApi(emailId, asEmailAction(intent), url.origin, headers, apiHandler);
    return { updated: ACTION_UPDATED };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Action failed' };
  }
}

export function meta({ data }: { data: { email: Email | null } | undefined }) {
  const subject = data?.email?.subject || "Email";
  return [
    { title: `${subject} | Cloud Mail Flare` },
    { name: "description", content: "View disposable email content" },
  ];
}

export default function EmailPage() {
  const emailProps = useEmail();
  const title = (emailProps.error || !emailProps.email) ? "Email" : "Message Detail";
  
  return (
    <Layout title={title}>
      <EmailView {...emailProps} />
    </Layout>
  );
}
