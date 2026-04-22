export {};

interface OfflineGuestPayload {
  owner_id: string;
  idCardDataUrl?: string | null;
  idCardFileName?: string | null;
  [key: string]: unknown;
}

interface GuestHistoryPayload {
  owner_id: string;
  phone: string;
}

interface GuestHistoryResult {
  id: string;
  guestName: string;
  nationality: string;
  profession?: string | null;
  postalAddress?: string | null;
  phone: string;
  owner_id: string;
  idPreview?: string | null;
  idCardPath?: string | null;
}

interface RoomStatusQueryPayload {
  owner_id: string;
}

interface RoomStatusReleasePayload {
  owner_id: string;
  roomNumber: string;
}

interface RoomStatusGuestRecord {
  id: string;
  owner_id: string;
  isGroupEntry: boolean;
  roomNumber: string;
  roomNumbers: string[];
  guestName: string;
  profession?: string | null;
  postalAddress?: string | null;
  phone: string;
  email?: string | null;
  nationality: string;
  passportNumber?: string | null;
  citizenshipNumber?: string | null;
  entryPoint?: string | null;
  arrivedFrom?: string | null;
  departureTo?: string | null;
  modeOfTravel?: string | null;
  purposeOfVisit?: string | null;
  agentName?: string | null;
  remarks?: string | null;
  roomPrice: string;
  advancePaid: string;
  totalGuests: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  idPreview?: string | null;
  syncedToCloud: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoomStatusSnapshot {
  id: string;
  owner_id: string;
  roomNumber: string;
  currentGuestStayId: string | null;
  currentGuestStay: RoomStatusGuestRecord | null;
  createdAt: string;
  updatedAt: string;
}

declare global {
  interface Window {
    electronAPI?: {
      saveGuest: (formData: OfflineGuestPayload) => Promise<{ id: string }>;
      searchGuests: (payload: GuestHistoryPayload) => Promise<GuestHistoryResult | null>;
      getRoomStatuses: (payload: RoomStatusQueryPayload) => Promise<RoomStatusSnapshot[]>;
      releaseRoomStatus: (payload: RoomStatusReleasePayload) => Promise<RoomStatusSnapshot | null>;
      send?: (channel: string, data: unknown) => void;
      on?: (channel: string, callback: (...args: unknown[]) => void) => void;
      invoke?: (channel: string, data: unknown) => Promise<unknown>;
    };
  }
}
