PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'agent',          -- taxonomy: UserRole = 'admin' | 'agent'
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
, is_owner INTEGER NOT NULL DEFAULT 0);
CREATE TABLE emails (
  -- Identity & ownership (Email.id, Email.inboxId)
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL,                       -- taxonomy: InboxId (was user_id)

  -- Envelope (Email.messageId, Email.from, Email.to, Email.cc)
  message_id TEXT,
  from_name TEXT,                               -- EmailRecipient.name
  from_email TEXT NOT NULL,                     -- EmailRecipient.email
  to_json TEXT NOT NULL DEFAULT '[]',           -- EmailRecipient[] as JSON
  cc_json TEXT NOT NULL DEFAULT '[]',           -- EmailRecipient[] as JSON

  -- Content (Email.subject, Email.snippet, Email.receivedAt)
  subject TEXT,
  snippet TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Status (Email.status = 'unread'|'read'|'archived'|'deleted')
  status TEXT NOT NULL DEFAULT 'unread',        -- taxonomy: EmailStatus
  is_starred INTEGER NOT NULL DEFAULT 0,        -- taxonomy: IsStarred

  -- Body (Email.bodyText, Email.bodyHtml, Email.rawMime)
  body_text TEXT,
  body_html TEXT,
  raw_mime TEXT NOT NULL,
  raw_size INTEGER,

  -- Attachments (Email.hasAttachments, Email.attachmentCount, Email.attachments)
  has_attachments INTEGER NOT NULL DEFAULT 0,   -- taxonomy: HasAttachments
  attachment_count INTEGER NOT NULL DEFAULT 0,  -- taxonomy: AttachmentCount
  attachments_json TEXT NOT NULL DEFAULT '[]',   -- EmailAttachment[] as JSON

  -- Threading (Email.inReplyTo, Email.references)
  in_reply_to TEXT,
  references_json TEXT NOT NULL DEFAULT '[]',   -- MessageId[] as JSON

  -- Security (Email.spamScore, Email.authResults)
  spam_score TEXT,
  auth_results TEXT,

  -- Parsed metadata (kept for backward compat + detailed parsing)
  headers_json TEXT,
  parsed_from_name TEXT,
  parsed_from_email TEXT,
  parsed_sender TEXT,
  parsed_reply_to TEXT,
  parsed_delivered_to TEXT,
  parsed_return_path TEXT,
  parsed_to TEXT,
  parsed_cc TEXT,
  parsed_bcc TEXT,
  parsed_subject TEXT,
  parsed_date TEXT,
  parsed_text TEXT,
  parsed_html TEXT,
  parsed_text_as_html TEXT,
  parsed_headers TEXT,
  parsed_attachments TEXT,
  parsed_has_attachments INTEGER NOT NULL DEFAULT 0,
  parsed_attachment_count INTEGER NOT NULL DEFAULT 0,
  parsed_spam_score TEXT,
  parsed_auth_results TEXT,
  parsed_received_chain TEXT,
  parsed_content_type TEXT,
  parsed_charset TEXT,
  parsed_boundary TEXT,
  parsed_message_id TEXT,
  parsed_in_reply_to TEXT,
  parsed_references TEXT, deleted_at TEXT,

  FOREIGN KEY (inbox_id) REFERENCES users(id)
);
CREATE TABLE email_status_history (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES emails(id)
);
CREATE TABLE worker_metrics (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE worker_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE access_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  telegram_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS "login_sessions" (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'login',           -- taxonomy: SessionType
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT,                                 -- nullable for access_code sessions
  access_code_id TEXT,                          -- nullable for login sessions
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  client_ip TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (access_code_id) REFERENCES access_codes(id)
);
CREATE TABLE telegram_webhook_updates (
  update_id INTEGER PRIMARY KEY,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  status TEXT NOT NULL DEFAULT 'pending',           -- taxonomy: AccountStatus
  target_email TEXT NOT NULL,
  verification_link TEXT,
  api_key_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  expires_at TEXT NOT NULL, password TEXT, api_key TEXT,
  FOREIGN KEY (inbox_id) REFERENCES users(id)
);
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT
);
CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,
  api_key_id TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,                       -- AuditEventType
  user_id TEXT,
  api_key_id TEXT,
  target_id TEXT,
  target_type TEXT,                               -- AuditTargetType
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,                                  -- JSON serialized
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_emails_inbox ON emails(inbox_id, status, received_at DESC);
CREATE INDEX idx_emails_flags ON emails(inbox_id, status, is_starred);
CREATE INDEX idx_emails_global ON emails(status, is_starred);
CREATE INDEX idx_access_codes_expires ON access_codes(expires_at);
CREATE INDEX idx_sessions_expires ON "login_sessions"(expires_at);
CREATE INDEX idx_sessions_user ON "login_sessions"(user_id, expires_at DESC);
CREATE INDEX idx_sessions_type ON "login_sessions"(type, expires_at);
CREATE INDEX idx_accounts_inbox ON accounts(inbox_id);
CREATE INDEX idx_accounts_status ON accounts(status, expires_at);
CREATE INDEX idx_rate_limits_created ON rate_limits(created_at);
CREATE INDEX idx_rate_limits_user ON rate_limits(user_id, created_at);
CREATE INDEX idx_rate_limits_apikey ON rate_limits(api_key_id, created_at);
CREATE INDEX idx_login_sessions_expires ON login_sessions(expires_at);
CREATE INDEX idx_login_sessions_user ON login_sessions(user_id, expires_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_apikey ON audit_logs(api_key_id, timestamp DESC);
CREATE INDEX idx_audit_logs_event ON audit_logs(event_type, timestamp DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
