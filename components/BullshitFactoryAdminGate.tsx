'use client';

import { FormEvent, useEffect, useState } from 'react';
import BullshitFactoryDashboard from './BullshitFactoryDashboard';

type SessionState = { authenticated: boolean; configured: boolean };

export default function BullshitFactoryAdminGate() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/session', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as SessionState;
        if (!cancelled) setSession(payload);
      })
      .catch(() => {
        if (cancelled) return;
        setSession({ authenticated: false, configured: false });
        setError('The admin authentication service is unavailable.');
      });
    return () => { cancelled = true; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json() as { authenticated?: boolean; error?: string };
      if (!response.ok || payload.authenticated !== true) throw new Error(payload.error || 'Admin login failed.');
      setPassword('');
      setSession({ authenticated: true, configured: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Admin login failed.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    setSession((current) => current ? { ...current, authenticated: false } : { authenticated: false, configured: true });
  }

  if (!session) {
    return <main className="bf-admin-gate"><div className="bf-admin-card"><span className="bf-eyebrow">BULLSHIT FACTORY / CONTROL ROOM</span><h1>CHECKING ADMIN LOCK…</h1></div></main>;
  }

  if (!session.authenticated) {
    return (
      <main className="bf-admin-gate">
        <div className="bf-admin-card">
          <span className="bf-eyebrow">BULLSHIT FACTORY / ADMIN</span>
          <h1>CONTROL ROOM</h1>
          {session.configured ? (
            <form onSubmit={login}>
              <label className="bf-field" htmlFor="bf-admin-username"><span>ADMIN USERNAME</span><input id="bf-admin-username" type="text" autoComplete="username" spellCheck="false" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
              <label className="bf-field" htmlFor="bf-admin-password"><span>ADMIN PASSWORD</span><input id="bf-admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <button className="bf-button bf-button-primary" disabled={busy || !username || !password} type="submit">{busy ? 'CHECKING…' : 'UNLOCK CONTROL ROOM'}</button>
            </form>
          ) : (
            <p>Admin authentication is not configured. Set <code>BF_ADMIN_USERNAME</code>, <code>BF_ADMIN_PASSWORD_HASH</code>, and <code>BF_ADMIN_SESSION_SECRET</code> in the server environment, then reload this page.</p>
          )}
          {error && <p className="bf-admin-error" role="alert">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="bf-admin-toolbar"><span>ADMIN SESSION ACTIVE / CONTROL ROOM</span><button className="bf-button" onClick={() => void logout()} type="button">LOCK CONTROL ROOM</button></div>
      <BullshitFactoryDashboard />
    </>
  );
}
