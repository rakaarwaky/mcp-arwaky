import { useNavigate } from 'react-router';
import { memo } from 'react';
import type { Email, EmailId } from '$taxonomy';
import { useConfirm } from '../context/ConfirmContext';

interface Props {
  email: Email;
  onAction: (id: EmailId, action: string) => void;
  /** If true, renders as a card div instead of a table row */
  cardMode?: boolean;
  isPending?: boolean;
}

function statusClass(status: string): string {
  switch (status) {
    case 'unread': return 'badge-unread';
    case 'read': return 'badge-read';
    case 'archived': return 'badge-archived';
    default: return '';
  }
}

const formatDate = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  } catch {
    return '';
  }
};

const EmailRow = memo(function EmailRow({ email, onAction, cardMode = false, isPending = false }: Props) {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const isUnread = email.status === 'unread';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    const isConfirmed = await confirm({
      title: 'Purge Asset',
      message: 'This email will be permanently wiped from the node shard. Continue?',
      confirmText: 'Purge',
      cancelText: 'Abort',
      type: 'danger'
    });
    if (isConfirmed) onAction(email.id, 'delete');
  };

  const handleActionStopProp = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onAction(email.id, action);
  };

  const senderName = email.from?.name || email.from?.email?.localPart || 'System';
  const senderInitial = senderName.charAt(0).toUpperCase() || '?';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/inbox/${encodeURIComponent(email.id)}`);
    }
  };

  // Reusable action buttons with aria-labels
  const actionButtons = (
    <div className="action-buttons">
      <button
        className="btn-icon"
        onClick={(e) => { e.stopPropagation(); handleActionStopProp(e, email.isStarred ? 'unstar' : 'star'); }}
        aria-label={email.isStarred ? 'Remove star' : 'Add star'}
        title={email.isStarred ? 'Unstar' : 'Star'}
      >
        <span className="material-symbols-outlined" aria-hidden="true">{email.isStarred ? 'star' : 'star_outline'}</span>
      </button>
      <button
        className="btn-icon"
        onClick={(e) => { e.stopPropagation(); handleActionStopProp(e, 'archive'); }}
        aria-label="Archive email"
        title="Archive"
      >
        <span className="material-symbols-outlined" aria-hidden="true">archive</span>
      </button>
      <button
        className="btn-icon danger"
        onClick={handleDelete}
        aria-label="Delete email"
        title="Delete"
        disabled={isPending}
      >
        <span className="material-symbols-outlined" aria-hidden="true">{isPending ? 'hourglass_empty' : 'delete'}</span>
      </button>
    </div>
  );

  /* ── Mobile card mode ── */
  if (cardMode) {
    return (
      <div
        className={`mobile-email-card ${isUnread ? 'unread' : ''}`}
        onClick={() => navigate(`/inbox/${encodeURIComponent(email.id)}`)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Email from ${senderName}: ${email.subject || '(no subject)'}`}
      >
        <div className="email-row-header">
          <div className="mobile-avatar">{senderInitial}</div>
          <div className="mobile-sender-info">
            <span className="sender-name">{senderName}</span>
            <span className="sender-time">
              {email.receivedAt ? formatDate(email.receivedAt) : ''}
            </span>
          </div>
          <div className="mobile-status">
            {isUnread && <span className="dot-indicator" aria-hidden="true" />}
          </div>
        </div>
        <div className="mobile-subject">{email.subject || '(no subject)'}</div>
        <div className="mobile-snippet">{email.snippet || '(no content)'}</div>
      </div>
    );
  }

  /* ── Desktop table row mode ── */
  return (
    <tr
      className={`email-row ${isUnread ? 'unread' : ''}`}
      onClick={() => navigate(`/inbox/${encodeURIComponent(email.id)}`)}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Email from ${senderName}, subject: ${email.subject || '(no subject)'}`}
    >
      <td>
        <div className="sender-cell">
          <span className="avatar">{senderInitial}</span>
          <span className="sender-name" title={senderName}>{senderName}</span>
        </div>
      </td>
      <td>{email.subject || '(no subject)'}</td>
      <td>{email.receivedAt ? formatDate(email.receivedAt) : ''}</td>
      <td><span className={`badge ${statusClass(email.status)}`}>{email.status}</span></td>
      <td className="actions-col" onClick={e => e.stopPropagation()}>
        {actionButtons}
      </td>
    </tr>
  );
});

export default EmailRow;
