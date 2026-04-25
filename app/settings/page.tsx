"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import HotelRegistrationSection from '@/components/HotelRegistrationSection';
import RoomSetupList, { RoomSetupRow } from '@/components/RoomSetupList';
import { clearSession, getSession, LocalAuthSession, saveSession } from '@/lib/authSession';
import { createAuthedSupabaseClient, supabase } from '@/lib/supabaseClient';

const DEFAULT_ROOM: RoomSetupRow = {
  roomNumber: '101',
  roomName: 'Room 101',
  roomType: 'Standard',
  rate: '1500',
};

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<LocalAuthSession | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [hotelName, setHotelName] = useState('');
  const [roomCount, setRoomCount] = useState('1');
  const [checkInTime, setCheckInTime] = useState('12:00');
  const [checkOutTime, setCheckOutTime] = useState('10:00');
  const [timezone, setTimezone] = useState('Asia/Kathmandu');
  const [roomRows, setRoomRows] = useState<RoomSetupRow[]>([DEFAULT_ROOM]);

  useEffect(() => {
    const activeSession = getSession();
    setSession(activeSession);
  }, []);

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

    const load = async () => {
      setIsLoading(true);
      setStatus(null);

      const authedSupabase = createAuthedSupabaseClient(session.accessToken);

      const [{ data: hotelRow, error: hotelError }, { data: roomRowsData, error: roomRowsError }] = await Promise.all([
        authedSupabase
          .from('hotels')
          .select('hotel_name, room_count, check_in_time, check_out_time, timezone')
          .eq('owner_id', session.userId)
          .maybeSingle(),
        authedSupabase
          .from('hotel_rooms')
          .select('room_number, room_name, room_type, rate')
          .eq('owner_id', session.userId)
          .order('room_number', { ascending: true }),
      ]);

      if (hotelError) {
        setStatus({ type: 'error', message: `Unable to load hotel profile: ${hotelError.message}` });
        setIsLoading(false);
        return;
      }

      if (roomRowsError) {
        setStatus({ type: 'error', message: `Unable to load room list: ${roomRowsError.message}` });
        setIsLoading(false);
        return;
      }

      setHotelName(hotelRow?.hotel_name ?? session.hotelProfile?.hotelName ?? '');
      setCheckInTime(hotelRow?.check_in_time ?? session.hotelProfile?.checkInTime ?? '12:00');
      setCheckOutTime(hotelRow?.check_out_time ?? session.hotelProfile?.checkOutTime ?? '10:00');
      setTimezone(hotelRow?.timezone ?? session.hotelProfile?.timezone ?? 'Asia/Kathmandu');

      const mappedRooms: RoomSetupRow[] = (roomRowsData ?? []).map((row: {
        room_number: number | string | null;
        room_name: string | null;
        room_type: string | null;
        rate: number | string | null;
      }) => ({
        roomNumber: String(row.room_number ?? ''),
        roomName: row.room_name ?? '',
        roomType: row.room_type ?? 'Standard',
        rate: String(Number(row.rate ?? 1500)),
      }));

      const nextRows = mappedRooms.length > 0 ? mappedRooms : [DEFAULT_ROOM];
      setRoomRows(nextRows);
      setRoomCount(String(nextRows.length));
      setIsLoading(false);
    };

    void load();
  }, [router, session]);

  const normalizedRooms = useMemo(() => {
    return roomRows
      .map((room, index) => ({
        roomNumber: Number(room.roomNumber) || index + 1,
        roomName: room.roomName.trim() || `Room ${Number(room.roomNumber) || index + 1}`,
        roomType: room.roomType.trim() || 'Standard',
        rate: Number(room.rate) || 1500,
      }))
      .filter((room) => room.roomNumber > 0);
  }, [roomRows]);

  const handleRoomCountChange = (value: string) => {
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
  };

  const handleSave = async () => {
    if (!session) {
      return;
    }

    if (!hotelName.trim()) {
      setStatus({ type: 'error', message: 'Hotel name is required.' });
      return;
    }

    if (normalizedRooms.length === 0) {
      setStatus({ type: 'error', message: 'Please keep at least one room in your profile.' });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    const authedSupabase = createAuthedSupabaseClient(session.accessToken);

    const roomNames = normalizedRooms.map((room) => room.roomName).join(', ');

    const { error: upsertHotelError } = await authedSupabase
      .from('hotels')
      .upsert({
        owner_id: session.userId,
        is_approved: session.isApproved,
        hotel_name: hotelName.trim(),
        room_count: normalizedRooms.length,
        room_names: roomNames,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        timezone: timezone.trim() || 'Asia/Kathmandu',
      }, {
        onConflict: 'owner_id',
      });

    if (upsertHotelError) {
      setStatus({ type: 'error', message: `Could not save hotel profile: ${upsertHotelError.message}` });
      setIsSaving(false);
      return;
    }

    const { error: deleteRoomsError } = await authedSupabase
      .from('hotel_rooms')
      .delete()
      .eq('owner_id', session.userId);

    if (deleteRoomsError) {
      setStatus({ type: 'error', message: `Could not refresh room list: ${deleteRoomsError.message}` });
      setIsSaving(false);
      return;
    }

    const { error: insertRoomsError } = await authedSupabase
      .from('hotel_rooms')
      .insert(
        normalizedRooms.map((room) => ({
          owner_id: session.userId,
          room_number: room.roomNumber,
          room_name: room.roomName,
          room_type: room.roomType,
          rate: room.rate,
        })),
      );

    if (insertRoomsError) {
      setStatus({ type: 'error', message: `Could not save room list: ${insertRoomsError.message}` });
      setIsSaving(false);
      return;
    }

    saveSession({
      ...session,
      hotelProfile: {
        hotelName: hotelName.trim(),
        roomCount: normalizedRooms.length,
        roomNames,
        checkInTime,
        checkOutTime,
        timezone: timezone.trim() || 'Asia/Kathmandu',
        roomMaster: normalizedRooms,
      },
    });

    setSession((prev) => (
      prev
        ? {
            ...prev,
            hotelProfile: {
              hotelName: hotelName.trim(),
              roomCount: normalizedRooms.length,
              roomNames,
              checkInTime,
              checkOutTime,
              timezone: timezone.trim() || 'Asia/Kathmandu',
              roomMaster: normalizedRooms,
            },
          }
        : prev
    ));

    setRoomCount(String(normalizedRooms.length));
    setStatus({ type: 'success', message: 'Hotel profile and room setup updated successfully.' });
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-700 shadow">
          <Loader2 size={18} className="animate-spin" /> Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              clearSession();
              router.replace('/login');
            }}
            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Hotel Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Update hotel profile, check-in/out timings, and room setup. Changes are saved to Supabase.
            </p>
          </div>

          <HotelRegistrationSection
            hotelName={hotelName}
            roomCount={roomCount}
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
            timezone={timezone}
            onHotelNameChange={setHotelName}
            onRoomCountChange={handleRoomCountChange}
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

          {status ? (
            <p className={`text-sm font-bold ${status.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {status.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
