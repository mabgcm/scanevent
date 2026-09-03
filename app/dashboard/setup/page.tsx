'use client';

import { Suspense, SyntheticEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '../dashboard.css';

function SetupPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const password = form.get('password');
    const confirmation = form.get('confirmation');
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
      setLoading(false);
      return;
    }
    const response = await fetch('/api/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const payload = await response.json();
    setDone(response.ok);
    setMessage(response.ok ? 'Your password has been created.' : payload.error);
    setLoading(false);
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit}>
        <span>SCANΔDMIN</span>
        <h1>Create your password</h1>
        {done ? (
          <>
            <div className="admin-success">{message}</div>
            <Link href="/dashboard/login">Return to sign in</Link>
          </>
        ) : (
          <>
            <label>
              New password
              <input name="password" type="password" minLength={10} required />
            </label>
            <label>
              Confirm new password
              <input
                name="confirmation"
                type="password"
                minLength={10}
                required
              />
            </label>
            {message && <div className="admin-error">{message}</div>}
            <button disabled={loading || !token}>
              {loading ? 'Saving…' : 'Save password'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<main className="admin-login">Loading…</main>}>
      <SetupPasswordForm />
    </Suspense>
  );
}
