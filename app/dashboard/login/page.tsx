'use client';

import { SyntheticEvent, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { firebaseAuth } from '@/lib/firebase-client';
import '../dashboard.css';
import './setup.css';

export default function DashboardLogin() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const formEmail = form.get('email');
      const formPassword = form.get('password');
      if (typeof formEmail !== 'string' || typeof formPassword !== 'string')
        throw new Error('Email or password is missing.');
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        formEmail,
        formPassword,
      );
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await credential.user.getIdToken() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      router.replace('/dashboard');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="admin-login">
      <form onSubmit={submit}>
        <Image
          src="/images/logo/SE_logo_D.png"
          alt="ScanEvent"
          width={58}
          height={58}
        />
        <span>SCANΔDMIN</span>
        <h1>Admin dashboard</h1>
        <p>Sign in to manage events and ticket operations.</p>
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          className="admin-setup-link"
          disabled={loading || !email}
          onClick={async () => {
            setLoading(true);
            setError('');
            const response = await fetch('/api/auth/bootstrap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            const payload = await response.json();
            setError(payload.message || payload.error);
            setLoading(false);
          }}
        >
          Create password for first sign-in
        </button>
      </form>
    </main>
  );
}
