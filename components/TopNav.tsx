"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/authSession';
import { getSession } from '@/lib/authSession';
import { supabase } from '@/lib/supabaseClient';

export default function TopNav() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const session = getSession();

  const handleLogout = async () => {
    setIsLoggingOut(true);

    await supabase.auth.signOut();
    clearSession();
    router.replace('/login');
  };

  return (
    <nav className="bg-emerald-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg">
            <span className="text-emerald-900 font-black text-xl px-1">N</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {session?.hotelProfile?.hotelName ?? 'Welcome to Namaste Desk'}
            </h1>
            {session?.hotelProfile ? (
              <p className="text-xs text-emerald-100/80 font-medium">
                {session.hotelProfile.roomCount} rooms • Check-in {session.hotelProfile.checkInTime} • Check-out {session.hotelProfile.checkOutTime}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60 text-sm font-bold transition-colors"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </nav>
  );
}
