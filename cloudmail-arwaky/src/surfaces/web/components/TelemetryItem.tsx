import { memo } from 'react';

interface TelemetryItemProps {
  label: string;
  value: string;
  status: string;
}

const TelemetryItem = memo(function TelemetryItem({ label, value, status }: TelemetryItemProps) {
  return (
    <div className="telemetry-item">
      <div className="telemetry-info">
        <span className="telemetry-label">{label}</span>
        <span className="telemetry-value">{value}</span>
      </div>
      <div className="health-bar-container">
        <div 
          className={`health-bar-fill ${status}`} 
          style={{ width: status === 'ok' ? '100%' : '40%' }} 
        />
      </div>
    </div>
  );
});

export default TelemetryItem;
