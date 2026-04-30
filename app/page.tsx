"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/lib/authSession';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    const currentHref = window.location.href;
    
    // Debugging: This will show up in your Electron DevTools (Ctrl+Shift+I)
    console.log("ELECTRON DEBUG:", { 
      href: currentHref, 
      sessionExists: !!session,
      isApproved: session?.isApproved 
    });

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
    } else {
      router.replace('/pending-approval');
    }
  }, [router]);

  return null; 
}