import { Form } from 'react-router';
import type { SanitizedUser } from '$taxonomy';
import type { AccountDetail } from '$contract';

interface UserEditViewProps {
  user: SanitizedUser | null;
  account: AccountDetail | null;
  isSaving: boolean;
  showApiKey: boolean;
  setShowApiKey: (val: boolean) => void;
  handleDelete: () => Promise<void>;
  navigate: (path: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  navigation: any;
}

export default function UserEditView({
  user,
  account,
  isSaving,
  showApiKey,
  setShowApiKey,
  handleDelete,
  navigate,
  showToast,
  navigation
}: UserEditViewProps) {
  if (!user) return (
    <>
      <div className="empty-state">
        <span className="material-symbols-outlined empty-icon" style={{ fontSize: 48, opacity: 0.5 }} aria-hidden="true">person_off</span>
        <h3>Account Not Found</h3>
        <p className="text-muted">The requested user profile does not exist or has been revoked.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/users')}>
          Return to Directory
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="action-bar-top" style={{ marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/users')}>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          <span>Back to Directory</span>
        </button>
        {user.isOwner && <span className="badge badge-unread" style={{ fontWeight: 800 }}>SYSTEM OWNER</span>}
      </div>

      <Form method="post" className="settings-container">
        {/* Profile Section */}
        <section className="glass-card settings-section">
          <div className="settings-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 24 }} aria-hidden="true">account_circle</span>
              <h2 className="settings-title">Identity Profile</h2>
            </div>
            <p className="settings-description">Configure the visible identity and organizational credentials for this account.</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="user-email" className="form-label">Organizational Email</label>
              <input
                id="user-email"
                name="email"
                className="form-control"
                defaultValue={user.email.full}
                placeholder="name@example.com"
                autoComplete="email"
                spellCheck={false}
              />
              <span className="form-hint">Used for system authentication and routing.</span>
            </div>

            <div className="form-group">
              <label htmlFor="display-name" className="form-label">Display Handle</label>
              <input
                id="display-name"
                name="displayName"
                className="form-control"
                defaultValue={user.displayName ?? ''}
                placeholder="e.g. Lead Orchestrator"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="form-hint">The identifier shown across the CMF terminal.</span>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="glass-card settings-section">
          <div className="settings-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 24 }} aria-hidden="true">lock</span>
              <h2 className="settings-title">Security & Protocol</h2>
            </div>
            <p className="settings-description">Update authentication credentials and baseline security protocols.</p>
          </div>

          <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="form-group" style={{ maxWidth: '400px' }}>
              <label htmlFor="new-password" className="form-label">Rotate Password</label>
              <input
                id="new-password"
                name="newPassword"
                className="form-control"
                type="password"
                placeholder="••••••••••••"
                autoComplete="new-password"
              />
              <span className="form-hint">Leave blank to maintain current entropy levels.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Authorization Metadata</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div className="value-pill-premium">
                  <span className="pill-label">Role</span>
                  <span className="pill-value">{user.role.toUpperCase()}</span>
                </div>
                <div className="value-pill-premium">
                  <span className="pill-label">UID</span>
                  <span className="pill-value">{user.id}</span>
                </div>
                {user.createdAt && (
                  <div className="value-pill-premium">
                    <span className="pill-label">Since</span>
                    <span className="pill-value">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Service Integration Section */}
        <section className="glass-card settings-section">
          <div className="settings-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 24 }} aria-hidden="true">link</span>
              <h2 className="settings-title">Service Integration</h2>
            </div>
            <p className="settings-description">Link external service credentials to this identity for automated processing.</p>
          </div>

          {account ? (
            <div style={{ marginBottom: 'var(--space-6)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', border: '1px solid var(--color-outline)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <span className="form-label" style={{ fontSize: '0.7rem' }}>ACTIVE PROVIDER</span>
                  <div style={{ fontWeight: 600 }}>{account.provider || 'openrouter'}</div>
                </div>
                <div>
                  <span className="form-label" style={{ fontSize: '0.7rem' }}>STATUS</span>
                  <span className={`badge ${account.status === 'key_extracted' ? 'badge-unread' : account.status === 'pending' ? 'badge-unread' : 'badge-read'}`}>
                    {account.status}
                  </span>
                </div>
                <div>
                  <span className="form-label" style={{ fontSize: '0.7rem' }}>TARGET EMAIL</span>
                  <code style={{ fontSize: 'var(--font-size-sm)' }}>{account.targetEmail?.full || '-'}</code>
                </div>
                {account.password && (
                  <div>
                    <span className="form-label" style={{ fontSize: '0.7rem' }}>PASSWORD</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <code style={{ fontSize: 'var(--font-size-sm)', wordBreak: 'break-all', background: 'var(--color-surface-100)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                          {String(account.password || '')}
                        </code>
                        <button
                          type="button"
                          className="btn-icon-glass sm"
                          onClick={() => {
                            const text = String(account.password || '');
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(text).then(() => {
                                showToast('Password copied', 'info');
                              }).catch(() => {
                                showToast('Copy failed - use manual copy', 'error');
                              });
                            } else {
                              showToast('Clipboard unavailable', 'error');
                            }
                          }}
                          aria-label="Copy password to clipboard"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">content_copy</span>
                        </button>
                      </div>
                  </div>
                )}
                {account.apiKey && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                      <span className="form-label" style={{ fontSize: '0.7rem' }}>API KEY</span>
                      {account.apiKeyId && (
                        <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>ID: {account.apiKeyId}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <code style={{ fontSize: 'var(--font-size-sm)', wordBreak: 'break-all', background: 'var(--color-surface-100)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                        {showApiKey ? String(account.apiKey || '') : '•'.repeat(Math.min(32, String(account.apiKey || '').length || 32))}
                      </code>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <button
                          type="button"
                          className="btn-icon-glass sm"
                          onClick={() => setShowApiKey(!showApiKey)}
                          aria-label={showApiKey ? "Hide API key" : "Show API key"}
                          title={showApiKey ? "Hide Key" : "Show Key"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">{showApiKey ? 'visibility_off' : 'visibility'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-icon-glass sm"
                          onClick={() => {
                            const text = String(account.apiKey || '');
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(text).then(() => {
                                showToast('API Key copied', 'info');
                              }).catch(() => {
                                showToast('Copy failed - use manual copy', 'error');
                              });
                            } else {
                              showToast('Clipboard unavailable', 'error');
                            }
                          }}
                          aria-label="Copy API key to clipboard"
                          title="Copy to Clipboard"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">content_copy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state-small" style={{ marginBottom: 'var(--space-6)' }}>
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>No external accounts linked. Use the form below.</p>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="provider-select" className="form-label">Service Provider</label>
              <select id="provider-select" name="provider" className="form-control" defaultValue="openrouter">
                <option value="openrouter">OpenRouter (Default)</option>
                <option value="gmail">Google / Gmail</option>
                <option value="outlook">Microsoft / Outlook</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="target-email" className="form-label">Target Email / Username</label>
              <input
                id="target-email"
                name="targetEmail"
                className="form-control"
                defaultValue={user.email.full}
                placeholder="e.g. user@openrouter.ai"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="form-hint">Must match your organizational email for identity verification.</span>
            </div>

            <div className="form-group">
              <label htmlFor="service-password" className="form-label">Password (Optional)</label>
              <input
                id="service-password"
                name="servicePassword"
                type="password"
                className="form-control"
                placeholder="Optional"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="api-key" className="form-label">API Key</label>
              <input
                id="api-key"
                name="apiKey"
                className="form-control"
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              name="intent"
              value="link-account"
              type="submit"
              className="btn btn-ghost btn-sm"
              disabled={navigation.state === 'submitting'}
            >
              <span className="material-symbols-outlined" aria-hidden="true">link</span>
              <span>{account ? 'Update Integration' : 'Link External Account'}</span>
            </button>
          </div>
        </section>

        {/* Actions Footer */}
        <div className="actions-row" style={{ justifyContent: 'space-between', marginTop: 'var(--space-8)' }}>
          <button
            type="button"
            className="btn btn-ghost-danger btn-sm"
            onClick={handleDelete}
            disabled={user.isOwner}
            title={user.isOwner ? "System owner cannot be purged" : "Purge User Identity"}
          >
              <span className="material-symbols-outlined" aria-hidden="true">delete_forever</span>
            <span>Purge Identity</span>
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/users')}>
              Cancel
            </button>
            <button
              name="intent"
              value="save"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ minWidth: '160px' }}
            >
              {isSaving ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div className="loading-spinner-sm" aria-hidden="true" />
                  <span>Updating…</span>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined" aria-hidden="true">save</span>
                  <span>Commit Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Form>
    </>
  );
}
