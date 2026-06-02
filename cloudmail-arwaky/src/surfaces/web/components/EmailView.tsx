import type { Email } from '$taxonomy';

interface EmailViewProps {
  email: Email | null;
  error: string | null;
  isSubmitting: boolean;
  handleAction: (intent: string) => Promise<void>;
  navigate: (path: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const formatDate = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  } catch {
    return '';
  }
};

export default function EmailView({
  email,
  error,
  isSubmitting,
  handleAction,
  navigate,
  showToast
}: EmailViewProps) {
  if (error || !email) return (
    <>
      <div className="empty-state">
        <span className="material-symbols-outlined empty-icon" aria-hidden="true">{error ? 'error' : 'mail_off'}</span>
        <p>{error || 'Email not found.'}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/inbox')}>Back to Inbox</button>
      </div>
    </>
  );

  return (
    <>
      <div className="action-bar-top">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/inbox')}>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          <span>Back</span>
        </button>
        <div className="action-group">
          <button
            className={`btn btn-icon-glass ${email.isStarred ? 'starred' : ''}`}
            onClick={() => handleAction('star')}
            disabled={isSubmitting}
            aria-label={email.isStarred ? 'Remove star' : 'Add star'}
            title="Star message"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">{email.isStarred ? 'star' : 'star_outline'}</span>
          </button>
          <button
            className="btn btn-icon-glass"
            onClick={() => handleAction('archive')}
            disabled={isSubmitting}
            aria-label="Archive email"
            title="Archive message"
            type="button"
          >
                <span className="material-symbols-outlined" aria-hidden="true">archive</span>
          </button>
          <button
            className="btn btn-icon-glass btn-danger-hover"
            onClick={() => handleAction('delete')}
            disabled={isSubmitting}
            aria-label="Delete email permanently"
            title="Delete permanently"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </div>
      </div>

      <div className="email-viewer-container">
        <article className="glass-card">
          <header className="email-header-premium">
            <div className="subject-line">
              <h2 className="email-title">{email.subject || '(No Subject)'}</h2>
              {email.status === 'unread' && <span className="badge badge-unread">New</span>}
            </div>

            <div className="sender-profile-row">
              <div className="avatar-large">
                {(email.from?.name || email.from?.email?.full || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="sender-meta">
                <div className="sender-primary">
                  <span className="sender-name">
                    {email.from?.name || email.from?.email?.full || 'Unknown Sender'}
                  </span>
                  {email.from?.email?.full && (
                    <span className="sender-email">&lt;{email.from.email.full}&gt;</span>
                  )}
                </div>
                <div className="delivery-info">
                  <span className="delivery-to">
                    to: {Array.isArray(email.to)
                      ? email.to.map(t => t?.name || t?.email?.full || 'Unknown').join(', ')
                      : 'Unknown'}
                  </span>
                  <span className="delivery-dot" aria-hidden="true">•</span>
                  <span className="delivery-time" suppressHydrationWarning>
                    {email.receivedAt ? formatDate(email.receivedAt) : ''}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {email.attachments.length > 0 && (
            <div className="attachments-section-premium">
              <span className="section-label">Attachments ({email.attachments.length})</span>
              <div className="attachments-grid">
                {email.attachments.map((a, i) => (
                  <div key={i} className="attachment-pill">
                    <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
                    <span className="filename">{a.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="email-body-content">
            {email.bodyText ? (
              <div className="body-text-plain">
                {email.bodyText}
              </div>
            ) : email.bodyHtml ? (
              <div className="body-html-frame">
                <iframe
                  srcDoc={email.bodyHtml}
                  style={{ width: '100%', minHeight: 600, border: 'none' }}
                  sandbox="allow-same-origin allow-popups"
                  referrerPolicy="no-referrer"
                  title="Email HTML Content"
                />
              </div>
            ) : (
              <div className="empty-body">
                <p className="text-muted">No readable content in this message.</p>
              </div>
            )}
          </div>
        </article>

        <div className="quick-response-footer">
          <button className="btn btn-primary" onClick={() => showToast('Reply functionality coming soon!', 'info')}>
            <span className="material-symbols-outlined" aria-hidden="true">reply</span>
            <span>Reply</span>
          </button>
          <button className="btn btn-ghost" onClick={() => showToast('Forward functionality coming soon!', 'info')}>
            <span className="material-symbols-outlined" aria-hidden="true">forward</span>
            <span>Forward</span>
          </button>
        </div>
      </div>
    </>
  );
}
