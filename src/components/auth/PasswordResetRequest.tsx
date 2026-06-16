import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { isValidEmail } from '../../utils/validation';
import { handleError, logError } from '../../utils/errorHandling';

interface PasswordResetRequestProps {
  onBack: () => void;
  initialEmail?: string;
}

export function PasswordResetRequest({ onBack, initialEmail = '' }: PasswordResetRequestProps) {
  const { sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      // Show success regardless of whether the email exists — we do not
      // want to leak which addresses are registered.
      setSent(true);
    } catch (err) {
      logError(err, 'PasswordResetRequest.handleSubmit');
      const info = handleError(err);
      setError(info.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--cm-text-primary)',
            margin: 0,
          }}
        >
          Check your inbox
        </h2>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--cm-text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          If an account exists for <strong>{email}</strong>, we&rsquo;ve sent a
          link to reset your password. The link expires shortly &mdash; check
          your spam folder if you don&rsquo;t see it.
        </p>
        <Button variant="secondary" size="md" fullWidth onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <div>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--cm-text-primary)',
            margin: '0 0 4px',
          }}
        >
          Reset your password
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--cm-text-secondary)',
            margin: 0,
          }}
        >
          Enter the email associated with your account and we&rsquo;ll send you a reset link.
        </p>
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        fullWidth
      />

      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 12px',
            background: 'var(--cm-error-dim)',
            border: '1px solid rgba(232,85,74,0.25)',
            borderRadius: '6px',
            color: 'var(--cm-error)',
            fontSize: '13px',
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        Send reset link
      </Button>

      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--cm-accent)',
          fontSize: '12px',
          textAlign: 'center',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        }}
      >
        Back to sign in
      </button>
    </form>
  );
}
