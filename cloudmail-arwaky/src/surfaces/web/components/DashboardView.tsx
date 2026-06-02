import StatCard from './StatCard';
import TelemetryItem from './TelemetryItem';
import type { DashboardMetricsOutput } from '$contract';

interface DashboardViewProps {
  metrics: DashboardMetricsOutput['metrics'];
  stats: DashboardMetricsOutput['stats'];
  formatted: {
    totalUsers: string;
    totalInboxes: string;
    linkedAccounts: string;
    pendingAccounts: string;
    emailTotal: string;
    unreadCount: string;
    starredCount: string;
    archivedCount: string;
    apiUsage: string;
    systemStatus: string;
  };
}

export function DashboardView({ metrics, stats, formatted }: DashboardViewProps) {
  const {
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
  } = formatted;

  if (metrics.length === 0 && !stats) {
    return (
      <div className="empty-state">
        <div className="empty-glow"></div>
        <span className="material-symbols-outlined empty-icon-large">analytics</span>
        <h2 className="empty-title">No Data</h2>
        <p className="text-muted">Awaiting system data initialization...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <h2 className="section-title">Account Overview</h2>
      <div className="grid-dashboard">
        <StatCard label="Total Users" value={totalUsers} icon="group" type="primary" />
        <StatCard label="Total Inboxes" value={totalInboxes} icon="inbox" type="info" />
        <StatCard label="Linked Accounts" value={linkedAccounts} icon="link" type="accent" badge="OpenRouter" />
        <StatCard label="Pending" value={pendingAccounts} icon="hourglass_empty" type="warning" />
      </div>

      <h2 className="section-title section-spacing-top">Inbox Metrics</h2>
      <div className="grid-dashboard grid-metrics">
        <StatCard label="Total Emails" value={emailTotal} icon="mail" type="info" />
        <StatCard label="Unread" value={unreadCount} icon="mark_email_unread" type="danger" />
        <StatCard label="Starred" value={starredCount} icon="star" type="warning" />
        <StatCard label="Archived" value={archivedCount} icon="archive" type="success" />
      </div>

      <div className="panel section-spacing-top-large">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">System Health & API</h3>
            <span className="panel-subtitle">Usage: {apiUsage} requests today</span>
          </div>
          <div className={`panel-status ${systemStatus === 'ok' || systemStatus === 'healthy' ? 'panel-status-ok' : 'panel-status-warning'}`}>
            <span className="status-dot" />
            {systemStatus.toUpperCase()}
          </div>
        </div>
        
        <div className="telemetry-grid">
          {metrics.map((m) => (
            <TelemetryItem key={m.key} label={m.label} value={m.value} status={m.status} />
          ))}
        </div>
      </div>
    </div>
  );
}
