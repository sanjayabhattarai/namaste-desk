import { Building2, Clock3, Globe2, Hotel } from 'lucide-react';

type HotelRegistrationSectionProps = {
  hotelName: string;
  roomCount: string;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  onHotelNameChange: (value: string) => void;
  onRoomCountChange: (value: string) => void;
  onCheckInTimeChange: (value: string) => void;
  onCheckOutTimeChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
};

export default function HotelRegistrationSection({
  hotelName,
  roomCount,
  checkInTime,
  checkOutTime,
  timezone,
  onHotelNameChange,
  onRoomCountChange,
  onCheckInTimeChange,
  onCheckOutTimeChange,
  onTimezoneChange,
}: HotelRegistrationSectionProps) {
  return (
    <section className="space-y-5 rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-sm">
      <header className="space-y-1">
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
          <Hotel size={14} /> Hotel Profile
        </p>
        <p className="text-xs font-medium text-slate-600">
          Add your hotel basics first. Room details can be managed just below.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label htmlFor="hotelName" className="mb-1.5 block text-sm font-bold text-slate-700">
            Hotel Name
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} />
            <input
              id="hotelName"
              type="text"
              required
              value={hotelName}
              onChange={(event) => onHotelNameChange(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-100 bg-white py-3 pl-10 pr-4 text-slate-800 outline-none transition focus:border-emerald-500"
              placeholder="e.g. Namaste Hotel"
            />
          </div>
        </div>

        <div>
          <label htmlFor="roomCount" className="mb-1.5 block text-sm font-bold text-slate-700">
            Total Rooms
          </label>
          <div className="relative">
            <input
              id="roomCount"
              type="number"
              min="1"
              required
              value={roomCount}
              onChange={(event) => onRoomCountChange(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-100 bg-white py-3 pl-4 pr-16 text-slate-800 outline-none transition focus:border-emerald-500"
              placeholder="12"
            />
            <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
              rooms
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">You can edit room rows below anytime.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <label htmlFor="checkInTime" className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <Clock3 size={15} className="text-emerald-600" /> Check-in Time
          </label>
          <input
            id="checkInTime"
            type="time"
            required
            value={checkInTime}
            onChange={(event) => onCheckInTimeChange(event.target.value)}
            className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <label htmlFor="checkOutTime" className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <Clock3 size={15} className="text-emerald-600" /> Check-out Time
          </label>
          <input
            id="checkOutTime"
            type="time"
            required
            value={checkOutTime}
            onChange={(event) => onCheckOutTimeChange(event.target.value)}
            className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="hotelTimezone" className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Globe2 size={15} className="text-emerald-600" /> Hotel Timezone
        </label>
        <input
          id="hotelTimezone"
          type="text"
          required
          value={timezone}
          onChange={(event) => onTimezoneChange(event.target.value)}
          className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
          placeholder="Asia/Kathmandu"
        />
      </div>
    </section>
  );
}
