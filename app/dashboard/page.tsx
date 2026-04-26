"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, isSameDay, isWithinInterval, startOfDay, subDays } from 'date-fns';
import { Users } from 'lucide-react';
import CalendarDashboard from '@/components/CalendarDashboard';
import CheckInForm from '@/components/CheckInForm';
import BillingView from '@/components/BillingView';
import PastReceiptModal from '@/components/PastReceiptModal';
import ReceiptSearchPanel from '@/components/ReceiptSearchPanel';
import TopNav from '@/components/TopNav';
import { clearSession, getSession, LocalAuthSession, saveSession } from '@/lib/authSession';
import { createAuthedSupabaseClient } from '@/lib/supabaseClient';
import { Bill, BillingDetails, BillingDraft, CheckInFormData, LocalRoomStatusSnapshot, Room, RoomStay } from '@/types/domain';

const EMPTY_BILLING_DRAFT: BillingDraft = {
  foodItems: [],
  discount: 0,
  days: 1,
};

const normalizePhone = (value: string) => value.replace(/[\s+\-()]/g, '');
const combineDateAndTime = (dateValue: Date | string, timeValue: string, fallbackHour: number) => {
  const date = new Date(dateValue);
  const [rawHour, rawMinute] = String(timeValue || '').split(':');
  const parsedHour = Number(rawHour);
  const parsedMinute = Number(rawMinute);
  const hour = Number.isInteger(parsedHour) ? parsedHour : fallbackHour;
  const minute = Number.isInteger(parsedMinute) ? parsedMinute : 0;

  date.setHours(hour, minute, 0, 0);
  return date;
};

const toDisplayableIdCardSrc = (source?: string | null) => {
  if (!source) {
    return null;
  }

  if (/^(blob:|data:|https?:|file:)/i.test(source)) {
    return source;
  }

  const normalized = source.replace(/\\/g, '/');

  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return `file://${normalized}`;
  }

  return source;
};

export default function NamasteDesk() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [activeStayId, setActiveStayId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [pastReceipts, setPastReceipts] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastBill, setShowPastBill] = useState<Bill | null>(null);
  const [isGuestSummaryOpen, setIsGuestSummaryOpen] = useState(false);
  const [idCardViewerSrc, setIdCardViewerSrc] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    guestName: string;
    phone: string;
    roomNumber: string;
    nationality: string;
    checkInDate: string;
    checkOutDate: string;
    idCardPath?: string | null;
    idPreview?: string | null;
    createdAt: string;
  }>>([]);
  const [isGuestSearchLoading, setIsGuestSearchLoading] = useState(false);
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

      try {
        const authedSupabase = createAuthedSupabaseClient(session.accessToken);

        const electronAPI = window.electronAPI;
        const roomStatusPromise: Promise<LocalRoomStatusSnapshot[]> = electronAPI?.getRoomStatuses
          ? electronAPI
              .getRoomStatuses({ owner_id: session.userId })
              .catch((error) => {
                console.error('Failed to load local room statuses:', error);
                return [];
              })
          : Promise.resolve([]);
        const guestStaysPromise: Promise<LocalRoomStatusSnapshot['currentGuestStay'][]> = electronAPI?.getGuestStays
          ? electronAPI
              .getGuestStays({ owner_id: session.userId })
              .catch((error) => {
                console.error('Failed to load local guest stays:', error);
                return [];
              })
          : Promise.resolve([]);

        const [hotelResult, roomResult, roomStatusResult, guestStaysResult] = await Promise.all([
          authedSupabase
            .from('hotels')
            .select('is_approved, hotel_name, room_count, room_names, check_in_time, check_out_time, timezone')
            .eq('owner_id', session.userId)
            .maybeSingle(),
          authedSupabase
            .from('hotel_rooms')
            .select('room_number, room_name, room_type, rate')
            .eq('owner_id', session.userId)
            .order('room_number', { ascending: true }),
          roomStatusPromise,
          guestStaysPromise,
        ]);

        const { data: hotelRow, error: hotelError } = hotelResult;

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

        const { data, error } = roomResult;

        if (error) {
          console.error('Failed to load room master:', error.message);
          setRooms([]);
          setIsRoomsLoading(false);
          return;
        }

        const roomStatusByNumber = new Map(
          (roomStatusResult ?? []).map((snapshot) => [String(snapshot.roomNumber), snapshot]),
        );

        const activeGuestIds = new Set(
          (roomStatusResult ?? [])
            .map((snapshot) => snapshot.currentGuestStay?.id)
            .filter(Boolean),
        );

        const loadedStays: RoomStay[] = (guestStaysResult ?? [])
          .filter((guest): guest is NonNullable<typeof guest> => Boolean(guest))
          .map((guest) => {
            const stableIdFromGuest = guest.id
              .split('')
              .reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);

            return {
              id: Number(stableIdFromGuest),
              roomId: Number(guest.roomNumber),
              guest: {
                name: guest.guestName,
                phone: guest.phone,
                nationality: guest.nationality,
                totalGuests: Number(guest.totalGuests ?? 1),
                idPreview: guest.idPreview ?? null,
                idCardPath: guest.idCardPath ?? null,
                profession: guest.profession ?? null,
                postalAddress: guest.postalAddress ?? null,
              },
              roomPrice: Number(guest.roomPrice ?? 1500),
              advancePaid: Number(guest.advancePaid ?? 0),
              startDate: new Date(guest.checkInDate),
              endDate: new Date(guest.checkOutDate),
              checkInTime: guest.checkInTime ?? session.hotelProfile?.checkInTime ?? '12:00',
              checkOutTime: guest.checkOutTime ?? session.hotelProfile?.checkOutTime ?? '10:00',
              checkedOut: !activeGuestIds.has(guest.id),
            };
          });

        setStays(loadedStays);

        const mappedRooms: Room[] = (data ?? []).map((row: { room_number: number | string; room_name?: string | null; room_type?: string | null; rate?: number | string | null }) => {
          const snapshot = roomStatusByNumber.get(String(row.room_number));
          const activeGuest = snapshot?.currentGuestStay;

          return {
            id: Number(row.room_number),
            roomName: row.room_name ?? `Room ${row.room_number}`,
            roomType: row.room_type ?? 'Standard',
            status: activeGuest ? 'Occupied' : 'Available',
            guest: activeGuest
              ? {
                  name: activeGuest.guestName,
                  phone: activeGuest.phone,
                  nationality: activeGuest.nationality,
                  totalGuests: Number(activeGuest.totalGuests ?? 1),
                  idPreview: activeGuest.idPreview ?? null,
                  idCardPath: activeGuest.idCardPath ?? null,
                  profession: activeGuest.profession ?? null,
                  postalAddress: activeGuest.postalAddress ?? null,
                }
              : null,
            price: Number(row.rate ?? 1500),
          };
        });

        setRooms(mappedRooms);
        setIsRoomsLoading(false);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setRooms([]);
        setStays([]);
        setIsRoomsLoading(false);
      }
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

      if (!forceBilling) {
        setActiveRoomId(roomId);
        setActiveStayId(explicitStay.id);
        setSelectedDate(date);
        setIsGuestSummaryOpen(true);
        setIsBillingOpen(false);
        setIsCheckInOpen(false);
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

      if (explicitStay.checkedOut) {
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
      if (isSameDay(startOfDay(date), startOfDay(stayForDate.endDate))) {
        setActiveRoomId(roomId);
        setActiveStayId(null);
        setSelectedDate(date);
        setIsBillingOpen(false);
        setIsCheckInOpen(true);
        return;
      }

      const receipt = pastReceipts.find((item) => item.id === stayForDate.receiptId);
      if (receipt) {
        setShowPastBill(receipt);
      }
      setIsBillingOpen(false);
      setIsCheckInOpen(false);
      return;
    }

    if (stayForDate?.checkedOut) {
      if (isSameDay(startOfDay(date), startOfDay(stayForDate.endDate))) {
        setActiveRoomId(roomId);
        setActiveStayId(null);
        setSelectedDate(date);
        setIsBillingOpen(false);
        setIsCheckInOpen(true);
        return;
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
      return { success: false };
    }

    const requestedRoomIds = formData.isGroupEntry
      ? formData.roomNumbers
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [Number(formData.roomNumber) || activeRoomId];

    const uniqueRoomIds = Array.from(new Set(requestedRoomIds));
    if (uniqueRoomIds.length === 0) {
      window.alert('Please select at least one room for check-in.');
      return { success: false };
    }

    const requestedStart = combineDateAndTime(formData.checkInDate, formData.checkInTime, 12);
    const requestedEnd = combineDateAndTime(formData.checkOutDate, formData.checkOutTime, 10);

    if (requestedEnd <= requestedStart) {
      window.alert('Departure date and time must be later than arrival date and time.');
      return { success: false };
    }

    const conflicts: number[] = [];
    const newStays: RoomStay[] = [];

    uniqueRoomIds.forEach((roomId, index) => {
      const hasOverlap = stays.some((stay) => {
        if (stay.roomId !== roomId) {
          return false;
        }

        if (stay.checkedOut) {
          return false;
        }

        const existingStart = combineDateAndTime(stay.startDate, stay.checkInTime, 12);
        const existingEnd = combineDateAndTime(stay.endDate, stay.checkOutTime, 10);

        // End time is treated as checkout boundary (exclusive), so same-day turnover is allowed.
        return requestedStart < existingEnd && requestedEnd > existingStart;
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
        checkInTime: formData.checkInTime,
        checkOutTime: formData.checkOutTime,
        checkedOut: false,
      });
    });

    if (newStays.length === 0) {
      window.alert(`No room could be checked in. Occupied for selected dates: ${conflicts.join(', ')}`);
      return { success: false, conflictRooms: conflicts };
    }

    setStays((prev) => [...prev, ...newStays]);

    if (conflicts.length > 0) {
      window.alert(`Checked in ${newStays.length} room(s). Skipped occupied room(s): ${conflicts.join(', ')}`);
    }

    setIsCheckInOpen(false);
    setActiveRoomId(null);
    setActiveStayId(null);
    setSelectedDate(null);
    return { success: true, guestName: formData.guestName, roomNumbers: newStays.map((s) => s.roomId) };
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
    setStays((prev) => prev.map((stay) => (
      stay.id === activeStayId
        ? {
            ...stay,
            checkedOut: true,
            receiptId,
          }
        : stay
    )));

    if (window.electronAPI?.releaseRoomStatus && session?.userId && activeRoomId) {
      void window.electronAPI.releaseRoomStatus({
        owner_id: session.userId,
        roomNumber: String(activeRoomId),
      });
    }

    setBillingDraftsByStay((prev) => {
      const next = { ...prev };
      delete next[activeStayId];
      return next;
    });
    setIsBillingOpen(false);
    setIsGuestSummaryOpen(false);
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

  const occupiedSummaryStay = isGuestSummaryOpen && activeStayData ? activeStayData : null;
  const occupiedSummaryIdCardSrc = occupiedSummaryStay
    ? toDisplayableIdCardSrc(occupiedSummaryStay.guest.idCardPath ?? occupiedSummaryStay.guest.idPreview ?? null)
    : null;

  const availableRoomNumbersForSelectedDate = selectedDate
    ? rooms
        .filter((room) => {
          const roomStaysOnDate = stays.filter(
            (stay) =>
              !stay.checkedOut &&
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
          if (stay.checkedOut) {
            return false;
          }

          const stayStart = getDateKeyInTimeZone(stay.startDate, hotelTimeZone);
          const stayEnd = getDateKeyInTimeZone(stay.endDate, hotelTimeZone);

          return todayPolicyDate >= stayStart && todayPolicyDate <= stayEnd && todayPolicyDate !== stayEnd;
        },
      )
      .map((stay) => stay.roomId),
  );
  const handleGuestSearch = async () => {
    const query = searchQuery.trim();

    if (query.length < 2 || !session?.userId || !window.electronAPI?.searchGuestsList) {
      setSearchResults([]);
      return;
    }

    setIsGuestSearchLoading(true);

    try {
      const results = await window.electronAPI.searchGuestsList({
        owner_id: session.userId,
        query,
      });

      setSearchResults(results ?? []);
    } catch (error) {
      console.error('Failed to search local guests:', error);
      setSearchResults([]);
    } finally {
      setIsGuestSearchLoading(false);
    }
  };

  const handleSelectSearchedGuest = (guest: {
    id: string;
    guestName: string;
    phone: string;
    roomNumber: string;
    nationality: string;
    checkInDate: string;
    checkOutDate: string;
    idCardPath?: string | null;
    idPreview?: string | null;
    createdAt: string;
  }) => {
    const source = toDisplayableIdCardSrc(guest.idCardPath ?? guest.idPreview ?? null);

    if (!source) {
      window.alert('No ID card image saved for this guest.');
      return;
    }

    setIdCardViewerSrc(source);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <TopNav />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <ReceiptSearchPanel
          searchQuery={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            if (value.trim().length < 2) {
              setSearchResults([]);
            }
          }}
          onSearchSubmit={() => {
            void handleGuestSearch();
          }}
          isSearching={isGuestSearchLoading}
          searchResults={searchResults}
          onSelectGuest={handleSelectSearchedGuest}
        />

        <div className="grid grid-cols-1 gap-6 mb-8">
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

      {occupiedSummaryStay && activeRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600">Occupied Room</p>
                <h3 className="text-2xl font-black text-slate-800">Room {activeRoom.id}</h3>
                <p className="text-sm text-slate-500">Current guest details from local SQLite</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuestSummaryOpen(false)}
                className="rounded-full p-2 hover:bg-slate-100 text-slate-500"
                aria-label="Close room summary"
                title="Close room summary"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase">Guest</p>
                  <p className="font-black text-slate-800">{occupiedSummaryStay.guest.name}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase">Phone</p>
                  <p className="font-black text-slate-800">{occupiedSummaryStay.guest.phone}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase">Nationality</p>
                  <p className="font-black text-slate-800">{occupiedSummaryStay.guest.nationality}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-400 uppercase">Persons</p>
                  <p className="font-black text-slate-800">{occupiedSummaryStay.guest.totalGuests}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-400 uppercase">Stay Period</p>
                <p className="font-black text-slate-800">
                  {format(occupiedSummaryStay.startDate, 'MMM d, yyyy')} → {format(occupiedSummaryStay.endDate, 'MMM d, yyyy')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-400 uppercase">Address / Profession</p>
                <p className="font-black text-slate-800">{occupiedSummaryStay.guest.postalAddress || 'No address saved'}</p>
                <p className="text-slate-600">{occupiedSummaryStay.guest.profession || 'No profession saved'}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={!occupiedSummaryIdCardSrc}
                onClick={() => {
                  if (occupiedSummaryIdCardSrc) {
                    setIdCardViewerSrc(occupiedSummaryIdCardSrc);
                  }
                }}
                className="rounded-2xl bg-blue-100 px-4 py-3 font-black text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View ID Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsGuestSummaryOpen(false);
                  setIsBillingOpen(true);
                }}
                className="flex-1 rounded-2xl bg-emerald-700 px-4 py-3 font-black text-white hover:bg-emerald-800"
              >
                Checkout/Billing
              </button>
              <button
                type="button"
                onClick={() => setIsGuestSummaryOpen(false)}
                className="rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPastBill && (
        <PastReceiptModal bill={showPastBill} onClose={() => setShowPastBill(null)} />
      )}

      {idCardViewerSrc && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-800">Guest ID Card</h3>
              <button
                type="button"
                onClick={() => setIdCardViewerSrc(null)}
                className="rounded-full p-2 hover:bg-slate-100 text-slate-500"
                aria-label="Close ID card viewer"
                title="Close ID card viewer"
              >
                ×
              </button>
            </div>
            <img src={idCardViewerSrc} alt="Guest ID Card" className="max-h-[75vh] w-full object-contain rounded-2xl bg-slate-50" />
          </div>
        </div>
      )}
    </div>
  );
}