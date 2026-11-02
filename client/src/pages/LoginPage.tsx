import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LivingMap } from '../components/login/LivingMap';
import { DEMO_PASSWORD, DEMO_USERNAME, isDemoMode } from '../api/demo';

const PHASES = [
  { word: 'registered.', title: 'Firm registry', text: 'Every assisted MSME on record' },
  { word: 'located.', title: 'Territory mapping', text: 'Pinned to exact coordinates' },
  { word: 'monitored.', title: 'SETUP monitoring', text: 'Balances and months remaining' },
] as const;

const PHASE_MS = 5000;

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 20c.6-3.4 3.4-5.5 7-5.5s6.4 2.1 7 5.5" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconEye({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
      />
      <circle cx="12" cy="12" r="2.8" />
      {off && <path strokeLinecap="round" d="M4 4l16 16" />}
    </svg>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (user) return <Navigate to="/" replace />;

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
    <div className="lg2">
      <LivingMap phase={phase} />
      <div className="lg2-shade" aria-hidden />

      <header className="lg2-brand">
        <img src="/logo.png" alt="DOST" width={44} height={44} />
        <div>
          <p>Department of Science and Technology</p>
          <strong>PSTO Cagayan</strong>
        </div>
      </header>

      <nav className="lg2-steps" aria-label="Portal modules">
        {PHASES.map((p, i) => (
          <button
            key={p.title}
            type="button"
            className={`lg2-step ${i === phase ? 'lg2-step-on' : ''}`}
            onClick={() => setPhase(i)}
            aria-pressed={i === phase}
          >
            <span className="lg2-step-num">0{i + 1}</span>
            <span className="lg2-step-body">
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </span>
            {i === phase && <span key={phase} className="lg2-step-bar" style={{ animationDuration: `${PHASE_MS}ms` }} />}
          </button>
        ))}
      </nav>

      <main className="lg2-stage">
        <div className="lg2-lead">
          <p className="lg2-eyebrow">Region II · Cagayan Valley</p>
          <h1 className="lg2-headline">
            Every firm.{' '}
            <br />
            Every district.
            <br />
            <span key={phase} className="lg2-word">
              {PHASES[phase].word}
            </span>
          </h1>
        </div>

        <section className="lg2-console" aria-labelledby="lg2-title">
          <div className="lg2-console-head">
            <span className="lg2-live" aria-hidden />
            <p>Secure staff access</p>
          </div>
          <h2 id="lg2-title" className="lg2-console-title">
            Sign in to PSTO workspace
          </h2>

          {error && (
            <div role="alert" className="lg2-error">
              {error}
            </div>
          )}

          <form className="lg2-form" onSubmit={handleSubmit} noValidate>
            <div className="lg2-field">
              <label htmlFor="login-user">Username</label>
              <div className="lg2-input">
                <IconUser />
                <input
                  id="login-user"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Your PSTO username"
                />
              </div>
            </div>

            <div className="lg2-field">
              <label htmlFor="login-pass">Password</label>
              <div className="lg2-input">
                <IconLock />
                <input
                  id="login-pass"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="lg2-reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <IconEye off={showPassword} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="lg2-submit">
              {submitting ? (
                <>
                  <span className="lg2-spinner" aria-hidden />
                  Verifying…
                </>
              ) : (
                <>
                  Enter workspace
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {isDemoMode() ? (
            <p className="lg2-foot">
              Demo mode · no database connected.{' '}
              <button
                type="button"
                className="lg2-demo"
                onClick={() => {
                  setUsername(DEMO_USERNAME);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                Use demo account
              </button>
            </p>
          ) : (
            <p className="lg2-foot">Authorized PSTO personnel only. Activity is logged.</p>
          )}
        </section>
      </main>
    </div>
  );
}
