export type RoomStatus = 'Available' | 'Occupied';

export interface FoodItem {
  name: string;
  price: number;
}

export interface Guest {
  name: string;
  phone: string;
  nationality: string;
  totalGuests: number;
  idPreview: string | null;
  idCardPath?: string | null;
  profession?: string | null;
  postalAddress?: string | null;
}

export interface Stay {
  roomId: number;
  guest: Guest;
  roomPrice: number;
  checkInDate: Date;
  checkOutDate: Date;
  checkInTime: string;
  checkOutTime: string;
}

export interface Room {
  id: number;
  roomName?: string;
  roomType?: string;
  status: RoomStatus;
  guest: Guest | null;
  price: number;
  startDate?: Date;
  endDate?: Date;
}

export interface RoomStay {
  id: number;
  roomId: number;
  guest: Guest;
  roomPrice: number;
  advancePaid: number;
  startDate: Date;
  endDate: Date;
  checkedOut: boolean;
  receiptId?: number;
}

export interface LocalRoomStatusGuest {
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
  idCardPath?: string | null;
  syncedToCloud: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalRoomStatusSnapshot {
  id: string;
  owner_id: string;
  roomNumber: string;
  currentGuestStayId: string | null;
  currentGuestStay: LocalRoomStatusGuest | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: number;
  roomNumber: number;
  guestName: string;
  phone: string;
  roomPrice: number;
  advancePaid: number;
  days: number;
  foodItems: FoodItem[];
  discount: number;
  grandTotal: number;
  date: string;
}

export interface BillingDetails {
  roomNumber: number;
  guestName: string;
  phone: string;
  roomPrice: number;
  advancePaid: number;
  days: number;
  foodItems: FoodItem[];
  discount: number;
}

export interface BillingDraft {
  foodItems: FoodItem[];
  discount: number;
  days: number;
}

export interface CheckInFormData {
  isGroupEntry: boolean;
  roomNumber: string;
  roomNumbers: string[];
  guestName: string;
  profession: string;
  postalAddress: string;
  phone: string;
  email: string;
  nationality: string;
  passportNumber: string;
  citizenshipNumber: string;
  entryPoint: string;
  arrivedFrom: string;
  departureTo: string;
  modeOfTravel: string;
  purposeOfVisit: string;
  agentName: string;
  remarks: string;
  roomPrice: string;
  rateCurrency: 'NPR' | 'INR' | 'US$';
  advancePaid: string;
  totalGuests: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  idPreview: string | null;
  idCardPath?: string | null;
}
