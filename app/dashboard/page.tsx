"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, isSameDay, isWithinInterval, startOfDay, subDays } from 'date-fns';
import { Banknote, Users } from 'lucide-react';
import CalendarDashboard from '@/components/CalendarDashboard';
import CheckInForm from '@/components/CheckInForm';
import BillingView from '@/components/BillingView';
import PastReceiptModal from '@/components/PastReceiptModal';
import ReceiptSearchPanel from '@/components/ReceiptSearchPanel';
import TopNav from '@/components/TopNav';
import { clearSession, getSession, LocalAuthSession, saveSession } from '@/lib/authSession';
import { createAuthedSupabaseClient } from '@/lib/supabaseClient';
import { Bill, BillingDetails, BillingDraft, CheckInFormData, Room, RoomStay } from '@/types/domain';

const EMPTY_BILLING_DRAFT: BillingDraft = {
  foodItems: [],
  discount: 0,
  days: 1,
};

const normalizePhone = (value: string) => value.replace(/[\s+\-()]/g, '');

export default function NamasteDesk() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [activeStayId, setActiveStayId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [pastReceipts, setPastReceipts] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastBill, setShowPastBill] = useState<Bill | null>(null);
  const [billingDraftsByStay, setBillingDraftsByStay] = useState<Record<number, BillingDraft>>({});
  const [session, setSession] = useState<LocalAuthSession | null | undefined>(undefined);
  const [stays, setStays] = useState<RoomStay[]>([]);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const getDateKeyInTimeZone = (date: Date, timeZone: string) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const hotelTimeZone = session?.hotelProfile?.timezone || 'Asia/Kathmandu';
  const todayPolicyDate = getDateKeyInTimeZone(new Date(), hotelTimeZone);

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

    const initializeDashboard = async () => {
      setIsRoomsLoading(true);

      const authedSupabase = createAuthedSupabaseClient(session.accessToken);

      const { data: hotelRow, error: hotelError } = await authedSupabase
        .from('hotels')
        .select('is_approved, hotel_name, room_count, room_names, check_in_time, check_out_time, timezone')
        .eq('owner_id', session.userId)
        .maybeSingle();

      if (hotelError) {
        console.error('Failed to load hotel profile:', hotelError.message);
        setRooms([]);
        setIsRoomsLoading(false);
        return;
      }

      if (!hotelRow?.is_approved) {
        saveSession({
          ...session,
          isApproved: false,
        });
        setIsRoomsLoading(false);
        router.replace('/pending-approval');
        return;
      }

      saveSession({
        ...session,
        isApproved: true,
        hotelProfile: {
          hotelName: hotelRow.hotel_name ?? session.hotelProfile?.hotelName ?? '',
          roomCount: Number(hotelRow.room_count ?? session.hotelProfile?.roomCount ?? 0),
          roomNames: hotelRow.room_names ?? session.hotelProfile?.roomNames ?? '',
          checkInTime: hotelRow.check_in_time ?? session.hotelProfile?.checkInTime ?? '12:00',
          checkOutTime: hotelRow.check_out_time ?? session.hotelProfile?.checkOutTime ?? '10:00',
          timezone: hotelRow.timezone ?? session.hotelProfile?.timezone ?? 'Asia/Kathmandu',
          roomMaster: session.hotelProfile?.roomMaster,
        },
      });

      const { data, error } = await authedSupabase
        .from('hotel_rooms')
        .select('room_number, room_name, room_type, rate')
        .eq('owner_id', session.userId)
        .order('room_number', { ascending: true });

      if (error) {
        console.error('Failed to load room master:', error.message);
        setRooms([]);
        setIsRoomsLoading(false);
        return;
      }

      const mappedRooms: Room[] = (data ?? []).map((row) => ({
        id: Number(row.room_number),
        roomName: row.room_name ?? `Room ${row.room_number}`,
        roomType: row.room_type ?? 'Standard',
        status: 'Available',
        guest: null,
        price: Number(row.rate ?? 1500),
      }));

      setRooms(mappedRooms);
      setIsRoomsLoading(false);
    };

    void initializeDashboard();
  }, [router, session]);

  if (session === undefined || !session || !session.isApproved) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-500">Checking session...</p>
      </div>
    );
  }

  const getBillingDraft = (stayId: number): BillingDraft => {
    return billingDraftsByStay[stayId] ?? EMPTY_BILLING_DRAFT;
  };

  const handleCellClick = (
    roomId: number,
    date: Date,
    stayId?: number,
    forceBilling?: boolean,
  ) => {
    if (forceBilling === false && !stayId) {
      setActiveRoomId(roomId);
      setActiveStayId(null);
      setSelectedDate(date);
      setIsBillingOpen(false);
      setIsCheckInOpen(true);
      return;
    }

    if (stayId) {
      const explicitStay = stays.find((stay) => stay.id === stayId);
      if (!explicitStay) {
        return;
      }

      if (explicitStay.checkedOut && explicitStay.receiptId) {
        const receipt = pastReceipts.find((item) => item.id === explicitStay.receiptId);
        if (receipt) {
          setShowPastBill(receipt);
        }
        setIsBillingOpen(false);
        setIsCheckInOpen(false);
        return;
      }

      const shouldOpenBilling = forceBilling ?? true;
      setActiveRoomId(roomId);
      setActiveStayId(explicitStay.id);
      setSelectedDate(date);
      setIsBillingOpen(shouldOpenBilling);
      setIsCheckInOpen(!shouldOpenBilling);
      return;
    }

    const stayForDate = stays.find(
      (stay) =>
        stay.roomId === roomId &&
        isWithinInterval(date, {
          start: startOfDay(stay.startDate),
          end: startOfDay(stay.endDate),
        }),
    );

    const isPastDate = getDateKeyInTimeZone(date, hotelTimeZone) < todayPolicyDate;
    if (isPastDate && !stayForDate) {
      setIsBillingOpen(false);
      setIsCheckInOpen(false);
      return;
    }

    if (stayForDate?.checkedOut && stayForDate.receiptId) {
      const receipt = pastReceipts.find((item) => item.id === stayForDate.receiptId);
      if (receipt) {
        setShowPastBill(receipt);
      }
      setIsBillingOpen(false);
      setIsCheckInOpen(false);
      return;
    }

    const shouldOpenBilling = Boolean(
      stayForDate && !isSameDay(startOfDay(date), startOfDay(stayForDate.endDate)),
    );

    setActiveRoomId(roomId);
    setActiveStayId(stayForDate?.id ?? null);
    setSelectedDate(date);
    setIsBillingOpen(shouldOpenBilling);
    setIsCheckInOpen(!shouldOpenBilling);
  };

  const handleCheckInSave = (formData: CheckInFormData) => {
    if (!activeRoomId) {
      return;
    }

    const requestedRoomIds = formData.isGroupEntry
      ? formData.roomNumbers
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [Number(formData.roomNumber) || activeRoomId];

    const uniqueRoomIds = Array.from(new Set(requestedRoomIds));
    if (uniqueRoomIds.length === 0) {
      window.alert('Please select at least one room for check-in.');
      return;
    }

    const requestedStart = startOfDay(new Date(formData.checkInDate));
    const requestedEnd = startOfDay(new Date(formData.checkOutDate));

    if (requestedEnd < requestedStart) {
      window.alert('Departure date cannot be earlier than arrival date.');
      return;
    }

    const conflicts: number[] = [];
    const newStays: RoomStay[] = [];

    uniqueRoomIds.forEach((roomId, index) => {
      const hasOverlap = stays.some((stay) => {
        if (stay.roomId !== roomId) {
          return false;
        }

        const existingStart = startOfDay(stay.startDate);
        const existingEnd = startOfDay(stay.endDate);
        return requestedStart <= existingEnd && requestedEnd >= existingStart;
      });

      if (hasOverlap) {
        conflicts.push(roomId);
        return;
      }

      newStays.push({
        id: Date.now() + index,
        roomId,
        guest: {
          name: formData.guestName,
          phone: formData.phone,
          nationality: formData.nationality,
          totalGuests: Number(formData.totalGuests),
          idPreview: formData.idPreview,
        },
        roomPrice: Number(formData.roomPrice),
        advancePaid: Number(formData.advancePaid) || 0,
        startDate: new Date(formData.checkInDate),
        endDate: new Date(formData.checkOutDate),
        checkedOut: false,
      });
    });

    if (newStays.length === 0) {
      window.alert(`No room could be checked in. Occupied for selected dates: ${conflicts.join(', ')}`);
      return;
    }

    setStays((prev) => [...prev, ...newStays]);

    if (conflicts.length > 0) {
      window.alert(`Checked in ${newStays.length} room(s). Skipped occupied room(s): ${conflicts.join(', ')}`);
    }

    setIsCheckInOpen(false);
    setActiveRoomId(null);
    setActiveStayId(null);
    setSelectedDate(null);
  };

  const handleCheckoutComplete = (finalAmount: number, billDetails: BillingDetails) => {
    if (!activeStayId) {
      return;
    }

    const activeStay = stays.find((stay) => stay.id === activeStayId);
    if (!activeStay) {
      return;
    }

    const receiptId = Date.now();

    const newReceipt: Bill = {
      id: receiptId,
      roomNumber: activeStay.roomId,
      guestName: billDetails.guestName,
      phone: billDetails.phone,
      roomPrice: billDetails.roomPrice,
      advancePaid: billDetails.advancePaid,
      days: billDetails.days,
      foodItems: billDetails.foodItems,
      discount: billDetails.discount,
      grandTotal: finalAmount,
      date: new Date().toLocaleDateString(),
    };

    setPastReceipts((prev) => [newReceipt, ...prev]);
    setShowPastBill(newReceipt);
    setStays((prev) =>
      prev.map((stay) =>
        stay.id === activeStayId
          ? {
              ...stay,
              checkedOut: true,
              receiptId,
            }
          : stay,
      ),
    );

    setTotalSales((prev) => prev + finalAmount);
    setBillingDraftsByStay((prev) => {
      const next = { ...prev };
      delete next[activeStayId];
      return next;
    });
    setIsBillingOpen(false);
    setActiveRoomId(null);
    setActiveStayId(null);
    setSelectedDate(null);
  };

  const handleCancelStay = (stayId: number, day: Date) => {
    const targetDay = startOfDay(day);

    setStays((prev) => {
      const targetStay = prev.find((stay) => stay.id === stayId);
      if (!targetStay) {
        return prev;
      }

      const stayStart = startOfDay(targetStay.startDate);
      const stayEnd = startOfDay(targetStay.endDate);
      const isSingleDay = isSameDay(stayStart, stayEnd);
      const isAtStart = isSameDay(targetDay, stayStart);
      const isAtEnd = isSameDay(targetDay, stayEnd);

      if (isSingleDay) {
        return prev.filter((stay) => stay.id !== stayId);
      }

      if (isAtStart) {
        return prev.map((stay) =>
          stay.id === stayId
            ? {
                ...stay,
                startDate: addDays(stayStart, 1),
              }
            : stay,
        );
      }

      if (isAtEnd) {
        return prev.map((stay) =>
          stay.id === stayId
            ? {
                ...stay,
                endDate: subDays(stayEnd, 1),
              }
            : stay,
        );
      }

      const leftStay: RoomStay = {
        ...targetStay,
        id: Date.now(),
        endDate: subDays(targetDay, 1),
      };

      const rightStay: RoomStay = {
        ...targetStay,
        id: Date.now() + 1,
        startDate: addDays(targetDay, 1),
      };

      return [
        ...prev.filter((stay) => stay.id !== stayId),
        leftStay,
        rightStay,
      ];
    });

    setBillingDraftsByStay((prev) => {
      const next = { ...prev };
      delete next[stayId];
      return next;
    });

    if (activeStayId === stayId) {
      setIsBillingOpen(false);
      setActiveStayId(null);
      setActiveRoomId(null);
      setSelectedDate(null);
    }
  };

  const activeStayData = activeStayId
    ? stays.find((stay) => stay.id === activeStayId) ?? null
    : null;

  const activeRoom = activeRoomId
    ? rooms.find((room) => room.id === activeRoomId) ?? null
    : null;

  const availableRoomNumbersForSelectedDate = selectedDate
    ? rooms
        .filter((room) => {
          const roomStaysOnDate = stays.filter(
            (stay) =>
              stay.roomId === room.id &&
              isWithinInterval(selectedDate, {
                start: startOfDay(stay.startDate),
                end: startOfDay(stay.endDate),
              }),
          );

          if (roomStaysOnDate.length === 0) {
            return true;
          }

          return roomStaysOnDate.every((stay) => isSameDay(startOfDay(selectedDate), startOfDay(stay.endDate)));
        })
        .map((room) => room.id)
    : rooms.map((room) => room.id);

  const occupiedRoomIdsToday = new Set(
    stays
      .filter(
        (stay) => {
          const stayStart = getDateKeyInTimeZone(stay.startDate, hotelTimeZone);
          const stayEnd = getDateKeyInTimeZone(stay.endDate, hotelTimeZone);

          return todayPolicyDate >= stayStart && todayPolicyDate <= stayEnd && todayPolicyDate !== stayEnd;
        },
      )
      .map((stay) => stay.roomId),
  );
  const filteredReceipts = pastReceipts.filter((bill) => {
    if (searchQuery.length <= 2) {
      return false;
    }

    const normalizedQueryPhone = normalizePhone(searchQuery);
    const safePhone = bill.phone ?? '';
    const safeGuest = bill.guestName ?? '';

    const matchesPhone =
      normalizedQueryPhone.length > 0 &&
      normalizePhone(safePhone).includes(normalizedQueryPhone);
    const matchesGuest = safeGuest.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPhone || matchesGuest;
  });

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <TopNav />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <ReceiptSearchPanel
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filteredReceipts={filteredReceipts}
          onSelectBill={setShowPastBill}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold">Occupancy</p>
              <p className="text-2xl font-black text-slate-800">
                {occupiedRoomIdsToday.size} / {rooms.length}
              </p>
            </div>
          </div>

          <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg text-white flex items-center gap-4 transition-all hover:scale-[1.02]">
            <div className="bg-emerald-500 p-4 rounded-2xl">
              <Banknote size={24} />
            </div>
            <div>
              <p className="text-sm text-emerald-100 font-bold">Today&apos;s Revenue</p>
              <p className="text-2xl font-black italic">Rs. {totalSales}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          {isRoomsLoading ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-bold text-slate-500">Loading your room master...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
              <p className="text-base font-black text-slate-700">No room master found</p>
              <p className="text-sm text-slate-500 mt-2">Please add room setup in your hotel profile to start check-ins.</p>
            </div>
          ) : (
            <CalendarDashboard
              rooms={rooms}
              stays={stays}
              onCellClick={handleCellClick}
              onCancelStay={handleCancelStay}
            />
          )}
        </div>

        <div className="flex justify-center gap-8 text-xs font-bold text-slate-400 border-t pt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Available
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500 rounded-full"></div> Occupied (Click to Bill)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-400 rounded-full"></div> Checkout Day
          </div>
        </div>
      </main>

      {isCheckInOpen && activeRoomId && selectedDate && (
        <CheckInForm
          roomNumber={activeRoomId}
          availableRoomNumbers={availableRoomNumbersForSelectedDate}
          initialDate={selectedDate}
          defaultRoomPrice={activeRoom?.price ?? 1500}
          defaultCheckInTime={session.hotelProfile?.checkInTime ?? '12:00'}
          defaultCheckOutTime={session.hotelProfile?.checkOutTime ?? '10:00'}
          minCheckInDate={todayPolicyDate}
          onClose={() => setIsCheckInOpen(false)}
          onSave={handleCheckInSave}
        />
      )}

      {isBillingOpen && activeStayData && (
        <BillingView
          roomNumber={activeStayData.roomId}
          guestName={activeStayData.guest.name}
          phone={activeStayData.guest.phone}
          roomPrice={activeStayData.roomPrice}
          advancePaid={activeStayData.advancePaid}
          draft={getBillingDraft(activeStayData.id)}
          onDraftChange={(nextDraft) =>
            setBillingDraftsByStay((prev) => ({
              ...prev,
              [activeStayData.id]: nextDraft,
            }))
          }
          onClose={() => setIsBillingOpen(false)}
          onCheckout={handleCheckoutComplete}
        />
      )}

      {showPastBill && (
        <PastReceiptModal bill={showPastBill} onClose={() => setShowPastBill(null)} />
      )}
    </div>
  );
}