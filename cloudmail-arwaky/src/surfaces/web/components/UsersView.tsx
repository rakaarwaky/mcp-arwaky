import React from 'react';
import { Form } from 'react-router';
import type { SanitizedUser } from '$taxonomy';
import Layout from './Layout';

interface UsersViewProps {
  users: SanitizedUser[];
  actionData: any;
  isCreating: boolean;
  deletingId: string | null;
  handleDelete: (id: string, email: string) => Promise<void>;
  navigate: (path: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  formRef: React.RefObject<HTMLFormElement | null>;
}

export default function UsersView({
  users,
  actionData,
  isCreating,
  deletingId,
  handleDelete,
  navigate,
  showToast,
  formRef
}: UsersViewProps) {
  return (
    <div className="dashboard-content">
        {/* Provisioning Section */}
        <section className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div className="stat-icon primary">
                <span className="material-symbols-outlined" aria-hidden="true">person_add</span>
              </div>
              <div>
                <h3 className="panel-title">Account Provisioning</h3>
                <span className="panel-subtitle">Create new organizational accounts or aliases within the system.</span>
              </div>
            </div>
          </div>

          <Form method="post" ref={formRef} className="form-group-premium">
            <input type="hidden" name="intent" value="create" />
            <div className="input-row-glass">
              <input
                name="username"
                className="input-field-sm"
                placeholder="Workspace identifier or email alias…"
                aria-label="New account identifier"
                disabled={isCreating}
                required
                autoComplete="off"
                spellCheck={false}
              />
              <button className="btn-icon-glass primary" type="submit" disabled={isCreating} style={{ minWidth: '160px' }}>
                {isCreating ? <div className="loading-spinner-sm" aria-hidden="true" /> : 'Provision Account'}
              </button>
            </div>
          </Form>

          {actionData?.credentials && (
            <div className="creds-box-premium" aria-live="polite">
              <div className="creds-header">
                <span className="creds-tag">CREDENTIALS GENERATED</span>
              </div>
              <div className="creds-stack">
                <div className="creds-row-glass">
                  <span className="creds-label">IDENTITY:</span>
                  <code className="creds-value">{actionData.credentials.email.full}</code>
                  <button
                    className="btn-icon-glass sm"
                    onClick={() => { navigator.clipboard.writeText(actionData.credentials!.email.full); showToast('Email copied', 'info'); }}
                    aria-label="Copy email to clipboard"
                    type="button"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                  </button>
                </div>

                <div className="creds-row-glass">
                  <span className="creds-label">PASSPHRASE:</span>
                  <code className="creds-value">{actionData.credentials.password}</code>
                  <button
                    className="btn-icon-glass sm"
                    onClick={() => { navigator.clipboard.writeText(actionData.credentials!.password); showToast('Password copied', 'info'); }}
                    aria-label="Copy password to clipboard"
                    type="button"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                  </button>
                </div>
              </div>
              <p className="creds-warning">
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }} aria-hidden="true">warning</span>
                One-time display. Secure these credentials immediately.
              </p>
            </div>
          )}
        </section>

        {/* User Inventory */}
        <section className="panel" style={{ padding: 0, overflow: 'hidden', marginTop: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ padding: '12px', marginBottom: 0 }}>
            <h3 className="panel-title">User Directory</h3>
            <span className="panel-subtitle">Manage access levels and account status for all provisioned users.</span>
          </div>

          {users.length === 0 ? (
            <div className="empty-state-sm" style={{ margin: 'var(--space-6)' }}>
              <p>No active users directory.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, padding: '0 8px' }}>
              {users.map((u, _i) => (
                <div key={u.id} className="user-compact-row" onClick={() => navigate(`/users/${u.id}`)}>
                  <div className="user-compact-left">
                    <div className={`avatar-mini ${u.isOwner ? 'active' : ''}`}>
                      {u.email.full[0]!.toUpperCase()}
                    </div>
                    <div className="user-compact-info">
                      <span className="user-compact-name">{u.displayName || u.email.full.split('@')[0]!}</span>
                      <span className="user-compact-email">{u.email.full}</span>
                    </div>
                  </div>
                  <div className="user-compact-right">
                    <span className={`badge-pill ${u.isOwner || u.role === 'admin' ? 'admin' : 'user'}`}>
                      {u.isOwner ? 'OWNER' : u.role}
                    </span>
                    <button
                      className="btn-icon-minimal"
                      onClick={e => { e.stopPropagation(); navigate(`/users/${u.id}`) }}
                      aria-label="Edit user"
                      title="Edit"
                      type="button"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">edit</span>
                    </button>
                    {!u.isOwner && (
                      <button
                        className="btn-icon-minimal danger"
                        onClick={e => { e.stopPropagation(); handleDelete(u.id, u.email.full); }}
                        aria-label="Revoke user"
                        title="Revoke"
                        disabled={deletingId === u.id}
                        type="button"
                      >
                        {deletingId === u.id ? (
                          <div className="loading-spinner-sm" style={{ width: 12, height: 12 }} aria-hidden="true" />
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">close</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
  );
}
