import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  useLoaderData,
} from "react-router";
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { getCurrentUserApi } from './lib/web_api_barrel';
import './styles/index.css';
import { SanitizedUser } from '$taxonomy';

export interface AppContext {
  cloudflare?: {
    api?: (req: Request) => Promise<Response>;
    env?: {
      CMF_APP_NAME?: string;
      CMF_APP_SUBTITLE?: string;
    };
  };
}

export async function loader({ request, context }: { request: Request, context: AppContext }) {
  const url = new URL(request.url);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;
  const env = context?.cloudflare?.env;

  try {
    const { user } = await getCurrentUserApi(url.origin, headers, apiHandler);
    return {
      user,
      appName: env?.CMF_APP_NAME || 'Cloud Mail Flare',
      appSubtitle: env?.CMF_APP_SUBTITLE || 'Email Infrastructure for Autonomous Systems'
    };
  } catch {
    return {
      user: null,
      appName: env?.CMF_APP_NAME || 'Cloud Mail Flare',
      appSubtitle: env?.CMF_APP_SUBTITLE || 'Email Infrastructure for Autonomous Systems'
    };
  }
}

export function HydrateFallback() {
  return (
    <DocumentLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-surface)',
        gap: 'var(--space-6)',
      }}>
        <div
          className="loading-spinner-md"
          style={{
            width: 48,
            height: 48,
            borderColor: 'rgba(0, 229, 255, 0.15)',
            borderTopColor: 'var(--color-primary)',
          }}
        />
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family-body)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase'
        }}>
          Initializing System…
        </p>
      </div>
    </DocumentLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let message = 'An unexpected error occurred.';
  let details = '';

  if (isRouteErrorResponse(error)) {
    message = error.data?.message || error.data || error.statusText || `Request failed with status ${error.status}`;
    details = `HTTP ${error.status}`;
  } else if (error instanceof Error) {
    message = error.message;
    details = error.stack || '';
  }

  return (
    <DocumentLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        padding: 'var(--space-8)',
        fontFamily: 'var(--font-family-body)'
      }}>
        <div style={{
          background: 'rgba(255, 51, 102, 0.05)',
          border: '1px solid rgba(255, 51, 102, 0.2)',
          padding: 'var(--space-8)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '640px',
          width: '100%',
        }}>
          <h1 style={{
            color: 'var(--color-danger)',
            marginTop: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontSize: 'var(--font-size-2xl)'
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            System Error
          </h1>
          <p style={{
            fontSize: 'var(--font-size-lg)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-text)'
          }}>{message}</p>
          {details && (
            <pre style={{
              background: 'var(--color-surface-100)',
              border: '1px solid var(--color-outline)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              overflowX: 'auto',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {details}
            </pre>
          )}
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: 'var(--gradient-primary)',
                color: '#000',
                border: 'none',
                padding: 'var(--space-3) var(--space-6)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: 'var(--font-size-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Retry / Go Home
            </button>
          </div>
        </div>
      </div>
    </DocumentLayout>
  );
}

export function DocumentLayout({ children, appName }: { children: React.ReactNode, appName?: string }) {
  const finalAppName = appName || "Cloud Mail Flare";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#050505" />
        <meta name="description" content={`${finalAppName} — Email-as-a-Service for AI agents. Create unlimited inboxes, receive verification emails, and extract API keys automatically.`} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content={finalAppName} />
        {/* Preconnect for fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Monospace-focused font stack: JetBrains Mono (code), Space Grotesk (UI), Archivo Black (display) */}
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const data = useLoaderData<{ user: SanitizedUser | null, appName: string, appSubtitle: string }>();

  return (
    <DocumentLayout appName={data?.appName}>
      <AuthProvider initialUser={data?.user}>
        <ToastProvider>
          <ConfirmProvider>
            <Outlet />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </DocumentLayout>
  );
}
