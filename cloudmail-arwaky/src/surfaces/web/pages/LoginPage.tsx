import { redirect, useLoaderData } from 'react-router';
import { useLogin } from '../hooks/web_login_hook';
import LoginView from '../components/LoginView';
import { createEmailAddress, asPassword } from '$taxonomy';
import { loginApi, verifySessionApi } from '../lib/web_api_barrel';

import type { AppContext } from '../root';

export async function loader({ request, context }: { request: Request, context: AppContext }) {
  const url = new URL(request.url);
  const apiHandler = context?.cloudflare?.api;
  const env = context?.cloudflare?.env;
  const headers = Object.fromEntries(request.headers.entries());

  try {
    const data = await verifySessionApi(url.origin, headers, apiHandler);
    if (data?.user) return redirect('/dashboard');
  } catch (err) {
    // Session invalid or not found, proceed to login
  }
  return {
    appName: env?.CMF_APP_NAME || 'Cloud Mail Flare',
    appSubtitle: env?.CMF_APP_SUBTITLE || 'Secure access to mail infrastructure'
  };
}

export function meta({ data }: { data: any }) {
  const appName = data?.appName || "Cloud Mail Flare";
  return [
    { title: `Login | ${appName}` },
    { name: "description", content: `Authenticate to access your ${appName} dashboard` },
  ];
}

export async function action({ request, context }: { request: Request, context: any }): Promise<Response | { error: string, values: { email: string } }> {
  const url = new URL(request.url);
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const apiHandler = context?.cloudflare?.api;
  const headers = Object.fromEntries(
    Array.from(request.headers.entries()).filter(([k]) => !['content-type', 'content-length'].includes(k.toLowerCase()))
  );

  try {
    if (apiHandler) {
      // Direct call to apiHandler to capture headers (Set-Cookie)
      const loginReq = new Request(`${url.origin}/api/auth/login`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const res = await apiHandler(loginReq);
      if (!res.ok) {
        const errorData = await res.json() as any;
        throw new Error(errorData.error || 'Login failed');
      }
      
      const setCookie = res.headers.get('Set-Cookie');
      const response = redirect('/dashboard');
      if (setCookie) {
        response.headers.set('Set-Cookie', setCookie);
      }
      return response;
    }

    await loginApi(createEmailAddress(email), asPassword(password), url.origin, headers, apiHandler);
    return redirect('/dashboard');
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Authentication failed',
      values: { email } 
    };
  }
}

export default function LoginPage() {
  const loginProps = useLogin();
  const { appName, appSubtitle } = useLoaderData<{ appName: string, appSubtitle: string }>();
  return <LoginView {...loginProps} appName={appName} appSubtitle={appSubtitle} />;
}
