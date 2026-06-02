import { Form } from 'react-router';
import type { WorkerSettingsGetOutput } from '$contract';

interface SettingsViewProps {
  settings: WorkerSettingsGetOutput;
  editKey: string;
  setEditKey: (val: string) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  isSaving: boolean;
  activeIntent: any;
  handleCleanup: () => Promise<void>;
  configGroups: { title: string, keys: string[] }[];
}

export default function SettingsView({
  settings,
  editKey,
  setEditKey,
  editValue,
  setEditValue,
  isSaving,
  activeIntent,
  handleCleanup,
  configGroups
}: SettingsViewProps) {
  return (
    <div className="dashboard-content">

        {/* Row 1: Action Buttons */}
        <div className="settings-actions-bar">
          <button className="btn-action danger" onClick={handleCleanup} disabled={isSaving}>Manual Cleanup</button>
        </div>

        {/* Row 2: Config Cards Side by Side */}
        <div className="settings-config-row">
          {configGroups.map(group => {
            const groupSettings = Object.entries(settings?.settings || {}).filter(([k]) => group.keys.includes(k.toUpperCase()));
            if (groupSettings.length === 0) return null;
            return (
              <div key={group.title} className="panel settings-config-card">
                <div className="matrix-header">
                  <div className="matrix-title-group">
                    <h3 className="matrix-title">{group.title}</h3>
                  </div>
                  <div className="status-tag-active">
                    <div className="tag-dot"></div>
                    LIVE
                  </div>
                </div>
                <table className="config-table">
                  <tbody>
                    {groupSettings.map(([k, v]) => (
                      <tr key={k}>
                        <td className="config-key">{k}</td>
                        <td className="config-val">{String(v || 'NULL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Row 3: Override Full Width */}
        <div className="panel settings-override-card">
          <div className="matrix-header">
            <div className="matrix-title-group">
              <h3 className="matrix-title">Override Value</h3>
              <div className="matrix-subtitle">Update a runtime variable</div>
            </div>
          </div>
          <Form method="post" className="override-form">
            <input type="hidden" name="intent" value="save_setting" />
            <input className="input-field-sm" name="key" value={editKey} onChange={e => setEditKey(e.target.value)} placeholder="KEY" required />
            <input className="input-field-sm" name="value" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="VALUE" />
            <button className="primary-button override-submit" type="submit" disabled={isSaving || !editKey.trim()}>
              {isSaving && activeIntent === 'save_setting' ? '...' : 'Save'}
            </button>
          </Form>
        </div>

      </div>
  );
}
