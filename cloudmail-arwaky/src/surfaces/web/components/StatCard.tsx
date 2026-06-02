import { memo } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  type?: 'primary' | 'info' | 'accent' | 'warning' | 'danger' | 'success';
  badge?: string;
}

const StatCard = memo(function StatCard({ label, value, icon, type = 'info', badge }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <h2 className="stat-value">{value}</h2>
      </div>
      {badge && <div className="stat-badge success">{badge}</div>}
    </div>
  );
});

export default StatCard;
