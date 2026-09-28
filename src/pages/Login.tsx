import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

export default function Login() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const redirectTo = `${location.origin}${location.pathname}`;
    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === 'sign-up') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
      if (error) setError(error.message);
      // No session means Supabase wants the email confirmed first.
      else if (!data.session) setNotice('Check your email and tap the confirmation link, then sign in here.');
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) setError(error.message);
      else setNotice('If that email has an account, a reset link is on its way.');
    }
    setBusy(false);
  };

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  return (
    <div className="login">
      <img src="./icon.svg" alt="" width={72} height={72} />
      <h1>Golf Practice</h1>
      <p className="muted">
        {mode === 'sign-up' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Sign in to sync your practice'}
      </p>
      <form className="card login-form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'forgot' && (
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}
        <button className="btn btn-primary btn-big btn-block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
        </button>
      </form>
      <div className="login-links">
        {mode === 'sign-in' ? (
          <>
            <button className="link-btn" onClick={() => switchTo('sign-up')}>
              Create an account
            </button>
            <button className="link-btn" onClick={() => switchTo('forgot')}>
              Forgot password?
            </button>
          </>
        ) : (
          <button className="link-btn" onClick={() => switchTo('sign-in')}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}

/** Shown after following a password-reset email link. */
export function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else onDone();
  };

  return (
    <div className="login">
      <h1>New password</h1>
      <form className="card login-form" onSubmit={submit}>
        <label className="field">
          <span>New password</span>
          <input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-big btn-block" disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
