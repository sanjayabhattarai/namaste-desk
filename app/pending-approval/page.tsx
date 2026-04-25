"use client"

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, LocalAuthSession, saveSession } from '@/lib/authSession';
import { createAuthedSupabaseClient, supabase } from '@/lib/supabaseClient';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Thank you for filling the form. We will contact you shortly.');
  const [isChecking, setIsChecking] = useState(false);
  const [session, setSession] = useState<LocalAuthSession | null | undefined>(undefined);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const displayMessage = session?.hotelProfile?.hotelName
    ? `Thank you for filling the form. We will contact you shortly, ${session.hotelProfile.hotelName}.`
    : statusMessage;

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

    const authedSupabase = createAuthedSupabaseClient(session.accessToken);

    const { data, error } = await authedSupabase
      .from('hotels')
      .select('is_approved, hotel_name, room_count, room_names, check_in_time, check_out_time, timezone')
      .eq('owner_id', session.userId)
      .maybeSingle();

    if (error) {
      setStatusMessage(`Unable to check approval right now: ${error.message}`);
      setIsChecking(false);
      return;
    }

    const isApproved = Boolean(data?.is_approved);

    const { data: roomRows } = await authedSupabase
      .from('hotel_rooms')
      .select('room_number, room_name, room_type, rate')
      .eq('owner_id', session.userId)
      .order('room_number', { ascending: true });

    saveSession({
      ...session,
      isApproved,
      hotelProfile: data
        ? {
            hotelName: data.hotel_name ?? session.hotelProfile?.hotelName ?? '',
            roomCount: Number(data.room_count ?? session.hotelProfile?.roomCount ?? 0),
            roomNames: data.room_names ?? session.hotelProfile?.roomNames ?? '',
            checkInTime: data.check_in_time ?? session.hotelProfile?.checkInTime ?? '12:00',
            checkOutTime: data.check_out_time ?? session.hotelProfile?.checkOutTime ?? '10:00',
            timezone: data.timezone ?? session.hotelProfile?.timezone ?? 'Asia/Kathmandu',
            roomMaster: (roomRows ?? []).map((row: {
              room_number: number | string | null;
              room_name: string | null;
              room_type: string | null;
              rate: number | string | null;
            }) => ({
              roomNumber: Number(row.room_number),
              roomName: row.room_name ?? `Room ${row.room_number}`,
              roomType: row.room_type ?? 'Standard',
              rate: Number(row.rate ?? 1500),
            })),
          }
        : session.hotelProfile,
    });

    if (isApproved) {
      router.replace('/dashboard');
      return;
    }

    setStatusMessage('Thank you for filling the form. We will contact you shortly.');
    setIsChecking(false);
  };

  useEffect(() => {
    if (session === undefined) {
      return;
    }

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
  }, [router, session]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-black text-slate-800">Approval Pending</h1>
        <p className="text-slate-600 font-medium mt-3">{displayMessage}</p>

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
