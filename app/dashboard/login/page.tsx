'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  type UserCredential,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { firebaseAuth } from '@/lib/firebase-client';
import '../dashboard.css';
import './setup.css';

export default function DashboardLogin() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const createAdminSession = useCallback(
    async (credential: UserCredential) => {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await credential.user.getIdToken() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      router.replace('/dashboard');
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    void getRedirectResult(firebaseAuth)
      .then((credential) => {
        if (!credential) return;
        setLoading(true);
        return createAdminSession(credential);
      })
      .catch((caught) => {
        setError(
          caught instanceof Error ? caught.message : 'Could not sign in.',
        );
        setLoading(false);
      });
  }, [createAdminSession]);

  async function signInWithGoogle() {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(firebaseAuth, provider);
      await createAdminSession(credential);
    } catch (caught) {
      if ((caught as { code?: string }).code === 'auth/popup-blocked') {
        await signInWithRedirect(firebaseAuth, new GoogleAuthProvider());
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="admin-login">
      <section className="admin-login-card">
        <Image
          src="/images/logo/SE_logo_D.png"
          alt="ScanEvent"
          width={58}
          height={58}
        />
        <span>SCANΔDMIN</span>
        <h1>Admin dashboard</h1>
        <p>
          Use an approved Google account to manage events and ticket operations.
        </p>
        {error && <div className="admin-error">{error}</div>}
        <button
          type="button"
          className="google-sign-in"
          disabled={loading}
          onClick={signInWithGoogle}
        >
          <span aria-hidden="true" className="google-mark">
            G
          </span>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        <small>
          Only pre-approved email addresses can access this dashboard.
        </small>
      </section>
    </main>
  );
}
