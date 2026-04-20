"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession } from '@/lib/authSession';

export default function HomePage() {
  const router = useRouter();

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

    router.replace('/pending-approval');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <p className="text-sm font-bold text-slate-500">Redirecting...</p>
    </div>
  );
}
