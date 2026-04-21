export const AUTH_STORAGE_KEY = 'namaste_desk_session';

export interface HotelRoomMaster {
  roomNumber: number;
  roomName: string;
  roomType: string;
  rate: number;
}

export interface HotelProfile {
  hotelName: string;
  roomCount: number;
  roomNames: string;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  roomMaster?: HotelRoomMaster[];
}

export interface LocalAuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number | null;
  isApproved: boolean;
  hotelProfile?: HotelProfile;
}

export const saveSession = (session: LocalAuthSession) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const getSession = (): LocalAuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LocalAuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const clearSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};
