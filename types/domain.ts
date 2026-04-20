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
}
