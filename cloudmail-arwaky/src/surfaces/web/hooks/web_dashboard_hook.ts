import { useLoaderData } from 'react-router';
import type { DashboardMetricsOutput } from '$contract';

export function useDashboard() {
  const { metrics, stats } = useLoaderData() as DashboardMetricsOutput;

  const totalUsers     = String(stats?.totalUsers ?? 0);
  const totalInboxes   = String(stats?.inboxCount ?? 0);
  const linkedAccounts = String(stats?.linkedAccounts ?? 0);
  const pendingAccounts= String(stats?.pendingAccounts ?? 0);
  
  const emailTotal     = String(stats?.totalEmails ?? 0);
  const unreadCount    = String(stats?.unreadEmails ?? 0);
  const starredCount   = String(stats?.starredEmails ?? 0);
  const archivedCount  = String(stats?.archivedEmails ?? 0);
  
  const apiUsage       = String(stats?.apiUsage ?? 0);
  const systemStatus   = stats?.systemHealthy ?? 'unknown';

  return {
    metrics,
    stats,
    formatted: {
      totalUsers,
      totalInboxes,
      linkedAccounts,
      pendingAccounts,
      emailTotal,
      unreadCount,
      starredCount,
      archivedCount,
      apiUsage,
      systemStatus
    }
  };
}
