interface PrivacyPageProps {
  onClose: () => void;
  /** Show Privacy Policy ('privacy') or Terms of Service ('terms'). Default: 'privacy' */
  view?: 'privacy' | 'terms';
}

export function PrivacyPage({ onClose, view = 'privacy' }: PrivacyPageProps) {
  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };
  const h2Style: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--cm-text-primary)',
    marginBottom: '8px',
    marginTop: 0,
  };
  const pStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--cm-text-secondary)',
    lineHeight: 1.7,
    margin: '0 0 8px',
  };
  const ulStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--cm-text-secondary)',
    lineHeight: 1.7,
    paddingLeft: '20px',
    margin: '0 0 8px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--cm-bg-surface)',
          border: '1px solid var(--cm-border-default)',
          borderRadius: '12px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          maxWidth: '640px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--cm-border-subtle)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cm-text-primary)' }}>
            {view === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--cm-text-muted)',
              fontSize: '20px',
              lineHeight: 1,
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.15s',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cm-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cm-text-muted)')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '24px' }}>
          <p style={{ ...pStyle, color: 'var(--cm-text-muted)', marginBottom: '20px' }}>
            Last updated: May 2026
          </p>

          {view === 'privacy' ? (
            <>
              <div style={sectionStyle}>
                <h2 style={h2Style}>1. Information We Collect</h2>
                <p style={pStyle}>
                  ChessMate collects only the information necessary to provide its services:
                </p>
                <ul style={ulStyle}>
                  <li>Account information: email address and display name you provide during sign-up.</li>
                  <li>Chess games: PGN files you import — stored securely in your personal account.</li>
                  <li>Usage data: anonymised analytics (page views, feature usage) to improve the product.</li>
                  <li>Error reports: stack traces sent to Sentry when the app crashes (no personal data).</li>
                </ul>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>2. How We Use Your Information</h2>
                <ul style={ulStyle}>
                  <li>To authenticate your account and protect your data.</li>
                  <li>To store and serve your chess games and analysis results.</li>
                  <li>To provide AI coaching responses via the chess-mentor service.</li>
                  <li>To track aggregate usage statistics (no personally identifiable data is sold).</li>
                </ul>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>3. Data Storage and Security</h2>
                <p style={pStyle}>
                  Your data is stored in Supabase (PostgreSQL) with row-level security enabled —
                  only you can read or modify your own games. All traffic is encrypted via TLS.
                  We do not store payment information.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>4. Third-Party Services</h2>
                <ul style={ulStyle}>
                  <li><strong>Supabase</strong> — authentication and database hosting.</li>
                  <li><strong>Google Gemini</strong> — AI coaching responses (your question and board position are sent; no account data).</li>
                  <li><strong>Sentry</strong> — error tracking (crash reports only).</li>
                  <li><strong>Vercel</strong> — static hosting and CDN.</li>
                </ul>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>5. Data Retention and Deletion</h2>
                <p style={pStyle}>
                  You can delete any game at any time from the interface.
                  To delete your account and all associated data, email us at{' '}
                  <a
                    href="mailto:arjav.jain1512@gmail.com"
                    style={{ color: 'var(--cm-accent)' }}
                  >
                    arjav.jain1512@gmail.com
                  </a>
                  . We will process the request within 30 days.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>6. Cookies</h2>
                <p style={pStyle}>
                  We use only essential cookies for session management (set by Supabase Auth).
                  No advertising or tracking cookies are used.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>7. Contact</h2>
                <p style={pStyle}>
                  Questions about this policy? Reach us at{' '}
                  <a
                    href="mailto:arjav.jain1512@gmail.com"
                    style={{ color: 'var(--cm-accent)' }}
                  >
                    arjav.jain1512@gmail.com
                  </a>.
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={sectionStyle}>
                <h2 style={h2Style}>1. Acceptance</h2>
                <p style={pStyle}>
                  By creating an account or using ChessMate you agree to these Terms of Service.
                  If you do not agree, do not use the service.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>2. Use of the Service</h2>
                <ul style={ulStyle}>
                  <li>You must be 13 years or older to create an account.</li>
                  <li>You are responsible for maintaining the confidentiality of your password.</li>
                  <li>You may not use ChessMate to store or transmit illegal content.</li>
                  <li>You may not attempt to reverse-engineer or disrupt the service.</li>
                </ul>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>3. Your Content</h2>
                <p style={pStyle}>
                  Chess games you import remain yours. By uploading them you grant ChessMate
                  a limited licence to store and process them solely to provide the service.
                  We do not claim ownership of your games.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>4. AI-Generated Advice</h2>
                <p style={pStyle}>
                  The AI coaching feature provides chess analysis for educational purposes only.
                  It may contain errors. Do not rely on it for decisions beyond casual chess study.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>5. Service Availability</h2>
                <p style={pStyle}>
                  ChessMate is provided "as is" without warranty of any kind. We may modify,
                  suspend, or discontinue the service at any time without notice.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>6. Limitation of Liability</h2>
                <p style={pStyle}>
                  To the maximum extent permitted by law, ChessMate is not liable for any
                  indirect, incidental, or consequential damages arising from your use of the service.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>7. Changes to Terms</h2>
                <p style={pStyle}>
                  We may update these terms at any time. Continued use of the service after
                  changes constitutes acceptance of the new terms.
                </p>
              </div>

              <div style={sectionStyle}>
                <h2 style={h2Style}>8. Contact</h2>
                <p style={pStyle}>
                  Questions?{' '}
                  <a
                    href="mailto:arjav.jain1512@gmail.com"
                    style={{ color: 'var(--cm-accent)' }}
                  >
                    arjav.jain1512@gmail.com
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
