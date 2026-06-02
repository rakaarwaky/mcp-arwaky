import { Form } from 'react-router';
import type { Email, EmailId } from '$taxonomy';
import EmailRow from './EmailRow';

interface InboxViewProps {
  isAdmin: boolean;
  filter: string;
  setSearchParams: (params: any) => void;
  isLoading: boolean;
  isMobile: boolean;
  filtered: Email[];
  counts: { all: number; unread: number; starred: number };
  handleAction: (id: EmailId, action: string) => void;
  hasMore: boolean;
  pendingActionId: EmailId | null;
  tableHeadingRef: React.RefObject<HTMLTableHeaderCellElement | null>;
  mobileHeadingRef: React.RefObject<HTMLHeadingElement | null>;
  emptyHeadingRef: React.RefObject<HTMLHeadingElement | null>;
}

export default function InboxView({
  filter,
  setSearchParams,
  isLoading,
  isMobile,
  filtered,
  counts,
  handleAction,
  hasMore,
  pendingActionId,
  tableHeadingRef,
  mobileHeadingRef,
  emptyHeadingRef
}: InboxViewProps) {
  return (
    <>
      <div className="inbox-toolbar">
        <div className="toolbar-left">
          <div className="filter-tabs-premium">
            {(['all', 'unread', 'starred'] as const).map(f => {
              const count = counts[f];
              return (
                <button
                  key={f}
                  className={`tab-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setSearchParams({ f })}
                >
                  <span className="tab-label">{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                  {count > 0 && <span className="tab-count">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="toolbar-right">
          <Form method="get" action=".">
            <button className="btn btn-ghost btn-sm refresh-btn" type="submit" disabled={isLoading}>
              <span className={`material-symbols-outlined ${isLoading ? 'spin' : ''}`}>
                {isLoading ? 'progress_activity' : 'refresh'}
              </span>
              <span>Refresh</span>
            </button>
          </Form>
        </div>
      </div>

      {/* Safety warning: global 100-email limit reached */}
      {hasMore && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          color: '#ffc107',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span className="material-symbols-outlined" style={{fontSize: '1.2rem'}}>warning</span>
          <span>
            Displaying the latest 100 emails. Delete old messages to see newer arrivals or use archive feature.
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-visual">
            <span className="material-symbols-outlined">inbox</span>
          </div>
          <h3 ref={emptyHeadingRef} tabIndex={-1} className="empty-heading">Your inbox is clean</h3>
          <p className="text-muted">No messages found {filter !== 'all' ? `matching the "${filter}" filter` : 'at this time'}.</p>
          <button className="btn btn-ghost btn-sm section-spacing-top" onClick={() => setSearchParams({ f: 'all' })}>
            Reset all filters
          </button>
        </div>
      ) : isMobile ? (
        <div className="email-cards-mobile">
          <h3 ref={mobileHeadingRef} tabIndex={-1} className="sr-only">
            Inbox List
          </h3>
          {filtered.map((email) => (
            <EmailRow key={email.id} email={email} onAction={handleAction} cardMode isPending={pendingActionId === email.id} />
          ))}
        </div>
      ) : (
        <div className="card glass-card inbox-table-container">
          <div className="table-responsive">
            <table className="email-table">
              <thead>
                <tr>
                  <th className="col-from" ref={tableHeadingRef} tabIndex={-1}>Origin</th>
                  <th className="col-subject">Subject & Content</th>
                  <th className="col-date">Timestamp</th>
                  <th className="col-status">Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((email) => (
                  <EmailRow key={email.id} email={email} onAction={handleAction} isPending={pendingActionId === email.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
