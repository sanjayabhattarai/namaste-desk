"use client"

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addYears } from 'date-fns';
import HotelRegistrationSection from '@/components/HotelRegistrationSection';
import RoomSetupList, { RoomSetupRow } from '@/components/RoomSetupList';
import { clearSession, getSession, HotelProfile, HotelRoomMaster, saveSession } from '@/lib/authSession';
import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [roomCount, setRoomCount] = useState('1');
  const [checkInTime, setCheckInTime] = useState('12:00');
  const [checkOutTime, setCheckOutTime] = useState('10:00');
  const [timezone, setTimezone] = useState('Asia/Kathmandu');
  const [roomRows, setRoomRows] = useState<RoomSetupRow[]>([
    { roomNumber: '101', roomName: 'Deluxe 101', roomType: 'Standard', rate: '1500' },
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const buildRoomsArray = () => {
    return roomRows
      .map((room, index) => ({
        roomNumber: Number(room.roomNumber) || index + 1,
        roomName: room.roomName.trim() || `Room ${room.roomNumber || index + 1}`,
        roomType: room.roomType.trim() || 'Standard',
        rate: Number(room.rate) || 1500,
      }))
      .filter((room) => room.roomName.length > 0);
  };

  const buildHotelProfile = (): HotelProfile => {
    const safeRoomCount = roomRows.length;
    const roomMaster = buildRoomsArray();

    return {
      hotelName: hotelName.trim(),
      roomCount: safeRoomCount,
      roomNames: roomMaster.map((room) => room.roomName).join(', '),
      checkInTime,
      checkOutTime,
      timezone: timezone.trim() || 'Asia/Kathmandu',
      roomMaster,
    };
  };

  const getHotelContext = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('hotels')
      .select('is_approved, hotel_name, room_count, room_names, check_in_time, check_out_time, timezone')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) {
      return { isApproved: false, error, hotelProfile: undefined as HotelProfile | undefined };
    }

    if (!data) {
      return { isApproved: false, error: null, hotelProfile: undefined as HotelProfile | undefined };
    }

    const { data: roomRows, error: roomRowsError } = await supabase
      .from('hotel_rooms')
      .select('room_number, room_name, room_type, rate')
      .eq('owner_id', ownerId)
      .order('room_number', { ascending: true });

    if (roomRowsError) {
      return { isApproved: Boolean(data.is_approved), error: roomRowsError, hotelProfile: undefined as HotelProfile | undefined };
    }

    const typedRoomRows = (roomRows ?? []) as Array<{
      room_number: number | string | null;
      room_name: string | null;
      room_type: string | null;
      rate: number | string | null;
    }>;

    const roomMaster: HotelRoomMaster[] = typedRoomRows.map((row: (typeof typedRoomRows)[number]) => ({
      roomNumber: Number(row.room_number),
      roomName: row.room_name ?? `Room ${row.room_number}`,
      roomType: row.room_type ?? 'Standard',
      rate: Number(row.rate ?? 1500),
    }));

    const hotelProfile: HotelProfile = {
      hotelName: data.hotel_name ?? '',
      roomCount: Number(data.room_count ?? roomMaster.length ?? 0),
      roomNames: data.room_names ?? roomMaster.map((room) => room.roomName).join(', '),
      checkInTime: data.check_in_time ?? '12:00',
      checkOutTime: data.check_out_time ?? '10:00',
      timezone: data.timezone ?? 'Asia/Kathmandu',
      roomMaster,
    };

    return { isApproved: Boolean(data.is_approved), error: null, hotelProfile };
  };

  const saveLoggedInSession = (
    session: {
      accessToken: string;
      refreshToken: string;
      userId: string;
      email: string;
      expiresAt: number | null;
    },
    isApproved: boolean,
    hotelProfile?: HotelProfile,
  ) => {
    saveSession({
      ...session,
      isApproved,
      hotelProfile,
    });
  };
  useEffect(() => {
    const session = getSession();
    const currentHref = window.location.href;

    console.log('[login] redirect check', {
      currentHref,
      hasSession: Boolean(session),
      isApproved: session?.isApproved ?? null,
      expiresAt: session?.expiresAt ?? null,
      isExpired: session?.expiresAt ? session.expiresAt * 1000 <= Date.now() : false,
    });

    if (!session) {
      if (!currentHref.includes('/login/')) {
        router.replace('/login');
      }
      return;
    }

    if (session.expiresAt && session.expiresAt * 1000 <= Date.now()) {
      clearSession();
      if (!currentHref.includes('/login/')) {
        router.replace('/login');
      }
      return;
    }

    if (session.isApproved) {
      if (!currentHref.includes('/dashboard/')) {
        router.replace('/dashboard');
      }
    } else {
      if (!currentHref.includes('/pending-approval/')) {
        router.replace('/pending-approval');
      }
    }
  }, [router]);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    if (mode === 'signup') {
      const hotelProfile = buildHotelProfile();

      if (!hotelProfile.hotelName || hotelProfile.roomCount <= 0) {
        setErrorMessage('Hotel name and a valid room count are required for registration.');
        setIsLoading(false);
        return;
      }

      if (!hotelProfile.roomMaster || hotelProfile.roomMaster.length === 0) {
        setErrorMessage('Please add at least one room in the room setup section.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email rate limit exceeded')) {
          const fallbackLogin = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (fallbackLogin.data.session && fallbackLogin.data.user) {
            const approvalResult = await getHotelContext(fallbackLogin.data.user.id);
            saveLoggedInSession({
              accessToken: fallbackLogin.data.session.access_token,
              refreshToken: fallbackLogin.data.session.refresh_token,
              userId: fallbackLogin.data.user.id,
              email: fallbackLogin.data.user.email ?? email,
              expiresAt: fallbackLogin.data.session.expires_at ?? null,
            }, approvalResult.isApproved, approvalResult.hotelProfile ?? hotelProfile);
            router.push(approvalResult.isApproved ? '/dashboard' : '/pending-approval');
            return;
          }

          setErrorMessage('Too many signup emails were sent. Please wait a few minutes, or use Login if your account was already created.');
          setIsLoading(false);
          return;
        }

        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage('Account created, but user details were not returned. Please try logging in.');
        setMode('login');
        setPassword('');
        setIsLoading(false);
        return;
      }

      const createdUser = data.user;

      const { error: hotelInsertError } = await supabase
        .from('hotels')
        .insert({
          owner_id: createdUser.id,
          is_approved: false,
          hotel_name: hotelProfile.hotelName,
          room_count: hotelProfile.roomCount,
          room_names: hotelProfile.roomNames,
          check_in_time: hotelProfile.checkInTime,
          check_out_time: hotelProfile.checkOutTime,
          timezone: hotelProfile.timezone,
          subscription_end_date: addYears(new Date(), 1).toISOString(),
        });

      if (hotelInsertError) {
        setErrorMessage(`Account created, but hotel profile setup failed: ${hotelInsertError.message}`);
        setMode('login');
        setPassword('');
        setIsLoading(false);
        return;
      }

      const roomRows = hotelProfile.roomMaster ?? [];
      if (roomRows.length > 0) {
        const { error: roomInsertError } = await supabase
          .from('hotel_rooms')
          .insert(
            roomRows.map((room) => ({
              owner_id: createdUser.id,
              room_number: room.roomNumber,
              room_name: room.roomName,
              room_type: room.roomType,
              rate: room.rate,
            })),
          );

        if (roomInsertError) {
          setErrorMessage(`Account created, but room master setup failed: ${roomInsertError.message}`);
          setMode('login');
          setPassword('');
          setIsLoading(false);
          return;
        }
      }

      if (data.session && data.user) {
        saveLoggedInSession({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          userId: createdUser.id,
          email: createdUser.email ?? email,
          expiresAt: data.session.expires_at ?? null,
        }, false, hotelProfile);
        router.push('/pending-approval');
        return;
      }

      setSuccessMessage('Account created successfully. Please sign in.');
      setMode('login');
      setPassword('');
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      setErrorMessage(error?.message ?? 'Invalid login credentials.');
      setIsLoading(false);
      return;
    }

    const approvalResult = await getHotelContext(data.user.id);

    if (approvalResult.error) {
      setErrorMessage(`Login succeeded, but approval check failed: ${approvalResult.error.message}`);
      setIsLoading(false);
      return;
    }

    if (!approvalResult.isApproved) {
      const { error: createHotelError } = await supabase
        .from('hotels')
        .insert({
          owner_id: data.user.id,
          is_approved: false,
          timezone: 'Asia/Kathmandu',
        });

      if (createHotelError && !createHotelError.message.toLowerCase().includes('duplicate key')) {
        setErrorMessage(`Login succeeded, but hotel profile setup failed: ${createHotelError.message}`);
        setIsLoading(false);
        return;
      }
    }

    saveLoggedInSession({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      email: data.user.email ?? email,
      expiresAt: data.session.expires_at ?? null,
    }, approvalResult.isApproved, approvalResult.hotelProfile);

    router.push(approvalResult.isApproved ? '/dashboard' : '/pending-approval');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className={`w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 ${mode === 'signup' ? 'max-w-5xl' : 'max-w-md'}`}>
        <h1 className="text-2xl font-black text-slate-800">Hotel Owner Access</h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'login'
            ? 'Sign in to continue to your dashboard.'
            : 'Create your owner account.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' ? (
            <>
            <HotelRegistrationSection
              hotelName={hotelName}
              roomCount={roomCount}
              checkInTime={checkInTime}
              checkOutTime={checkOutTime}
              timezone={timezone}
              onHotelNameChange={setHotelName}
              onRoomCountChange={(value) => {
                const nextCount = Math.max(1, Number(value) || 1);
                setRoomCount(String(nextCount));
                setRoomRows((prev) => {
                  if (prev.length === nextCount) {
                    return prev;
                  }

                  if (prev.length < nextCount) {
                    const rowsToAdd = Array.from({ length: nextCount - prev.length }, (_, index) => ({
                      roomNumber: String(prev.length + index + 1),
                      roomName: '',
                      roomType: 'Standard',
                      rate: '1500',
                    }));

                    return [...prev, ...rowsToAdd];
                  }

                  return prev.slice(0, nextCount);
                });
              }}
              onCheckInTimeChange={setCheckInTime}
              onCheckOutTimeChange={setCheckOutTime}
              onTimezoneChange={setTimezone}
            />
            <RoomSetupList
              rooms={roomRows}
              onChange={(nextRooms) => {
                setRoomRows(nextRooms);
                setRoomCount(String(nextRooms.length));
              }}
            />
            </>
          ) : null}

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
              placeholder="owner@hotel.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm font-bold text-rose-600">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="text-sm font-bold text-emerald-700">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-black hover:bg-emerald-800 disabled:opacity-60"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {isLoading ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : null}
              {isLoading
                ? mode === 'login'
                  ? 'Signing in...'
                  : 'Saving hotel setup...'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
