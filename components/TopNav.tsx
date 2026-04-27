"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { clearSession } from '@/lib/authSession';
import { getSession } from '@/lib/authSession';
import { supabase } from '@/lib/supabaseClient';

export default function TopNav() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const session = getSession();
  const brandTitle = session?.hotelProfile?.hotelName
    ? `${session.hotelProfile.hotelName.toUpperCase()} NAMASTE DESK`
    : 'NAMASTE DESK';

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
          <div className="bg-white p-1 rounded-lg overflow-hidden">
            <Image
              src="/Namaste_desk_logo.jpg"
              alt="Namaste Desk logo"
              width={34}
              height={34}
              className="h-8 w-8 object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {brandTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors"
          >
            <Settings size={16} /> Settings
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60 text-sm font-bold transition-colors"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </nav>
  );
}
