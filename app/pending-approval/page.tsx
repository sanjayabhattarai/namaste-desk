"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, saveSession } from '@/lib/authSession';
import { supabase } from '@/lib/supabaseClient';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Thank you for filling the form. We will contact you shortly.');
  const [isChecking, setIsChecking] = useState(false);

  const checkApproval = async () => {
    const session = getSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    if (session.expiresAt && session.expiresAt * 1000 <= Date.now()) {
      clearSession();
      router.replace('/login');
      return;
    }

    setIsChecking(true);

    await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    const { data, error } = await supabase
      .from('hotels')
      .select('is_approved')
      .eq('owner_id', session.userId)
      .maybeSingle();

    if (error) {
      setStatusMessage(`Unable to check approval right now: ${error.message}`);
      setIsChecking(false);
      return;
    }

    const isApproved = Boolean(data?.is_approved);

    saveSession({
      ...session,
      isApproved,
    });

    if (isApproved) {
      router.replace('/dashboard');
      return;
    }

    setStatusMessage('Thank you for filling the form. We will contact you shortly.');
    setIsChecking(false);
  };

  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    if (session.expiresAt && session.expiresAt * 1000 <= Date.now()) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (session.isApproved) {
      router.replace('/dashboard');
      return;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-black text-slate-800">Approval Pending</h1>
        <p className="text-slate-600 font-medium mt-3">{statusMessage}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void checkApproval()}
            disabled={isChecking}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 disabled:opacity-60"
          >
            {isChecking ? 'Checking...' : 'Check Approval Status'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              clearSession();
              router.replace('/login');
            }}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
