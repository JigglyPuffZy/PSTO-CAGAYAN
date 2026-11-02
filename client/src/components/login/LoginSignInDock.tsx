import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import { FormField, TextInput } from '../ui/Field';

export function LoginSignInDock() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn('login-atlas-dock', expanded && 'login-atlas-dock-open')}>
      <button
        type="button"
        className="login-atlas-dock-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="login-atlas-dock-toggle-label">Staff sign-in</span>
        <span className="login-atlas-dock-chevron" aria-hidden />
      </button>

      <div className="login-atlas-dock-body">
        <p className="login-atlas-dock-kicker">PSTO Cagayan IT credentials</p>

        {error && (
          <div role="alert" className="alert-dost-error login-atlas-dock-error">
            {error}
          </div>
        )}

        <form className="login-atlas-dock-form" onSubmit={handleSubmit} noValidate>
          <FormField label="Username">
            <TextInput
              id="login-user"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Username"
              className="login-atlas-input"
            />
          </FormField>

          <FormField label="Password">
            <div className="relative">
              <TextInput
                id="login-pass"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Password"
                className="login-atlas-input pr-[4.25rem]"
              />
              <button
                type="button"
                className="login-atlas-pass-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </FormField>

          <button type="submit" disabled={submitting} className="login-atlas-submit">
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="login-pro-spinner" aria-hidden />
                Signing in…
              </span>
            ) : (
              'Enter portal'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
