import { getDashboardApi } from '../lib/web_api_barrel';
import Layout from '../components/Layout';
import { useDashboard } from '../hooks/web_dashboard_hook';
import { DashboardView } from '../components/DashboardView';
import type { DashboardMetricsOutput } from '$contract';
import type { AppContext } from '../root';

export async function loader({ request, context }: { request: Request, context: AppContext }): Promise<DashboardMetricsOutput> {
  const url = new URL(request.url);
  const cookie = request.headers.get("Cookie");
  const headers = cookie ? { Cookie: cookie } : undefined;
  const apiHandler = context?.cloudflare?.api;

  try {
    const data = await getDashboardApi(url.origin, headers, apiHandler);
    return { metrics: data.metrics, summary: data.summary, stats: data.stats };
  } catch (err) {
    const status = (err as any)?.status || (err instanceof Error && err.message === 'Unauthorized' ? 401 : 500);
    throw new Response('Failed to load dashboard', { status });
  }
}

export function meta() {
  return [
    { title: "Dashboard | Cloud Mail Flare" },
    { name: "description", content: "System metrics and health status" },
  ];
}

export function shouldRevalidate({ currentUrl, nextUrl, formMethod }: any) {
  if (formMethod === 'POST') return true;
  return currentUrl.pathname !== nextUrl.pathname;
}

export default function DashboardPage() {
  const { metrics, stats, formatted } = useDashboard();

  return (
    <Layout title="Dashboard">
      <DashboardView 
        metrics={metrics} 
        stats={stats} 
        formatted={formatted} 
      />
    </Layout>
  );
}
