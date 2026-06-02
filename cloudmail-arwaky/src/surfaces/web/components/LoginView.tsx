import { Form } from 'react-router';

interface LoginViewProps {
  actionData: any;
  isSubmitting: boolean;
  appName?: string;
  appSubtitle?: string;
}

export default function LoginView({ actionData, isSubmitting, appName, appSubtitle }: LoginViewProps) {
  const finalAppName = appName || "Cloud Mail Flare";
  const finalSubtitle = appSubtitle || "Secure access to mail infrastructure";

  return (
    <div className="login-page">
      <div className="login-mesh" aria-hidden="true" />

      <div className="login-centered-container">
        <div className="login-card glass-card">
          <div className="login-header">
            <h1 className="login-logo">
              {finalAppName}
            </h1>
            <p className="login-subtitle">{finalSubtitle}</p>
          </div>

          <Form method="post" className="login-form">
            {actionData?.error && (
              <div className="login-error-box" role="alert" aria-live="polite">
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                <span>{actionData.error}</span>
              </div>
            )}
            <div className="form-group-stack">
              <div className="input-group">
                <label htmlFor="email-input" className="input-label">Identity</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined input-icon" aria-hidden="true">passkey</span>
                  <input
                    id="email-input"
                    className="input-field"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={actionData?.values?.email}
                    placeholder="operator@cmf.node…"
                    required
                    spellCheck={false}
                  />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="password-input" className="input-label">Passphrase</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined input-icon" aria-hidden="true">terminal</span>
                  <input
                    id="password-input"
                    className="input-field"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading-spinner-sm" aria-hidden="true" />
                  <span>Initializing…</span>
                </>
              ) : (
                <>
                  <span>Initialize Session</span>
                  <span className="material-symbols-outlined" aria-hidden="true">power_settings_new</span>
                </>
              )}
            </button>
          </Form>
        </div>

        <div className="login-footer">
          <p>© 2026 {finalAppName.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
