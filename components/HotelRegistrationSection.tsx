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
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black uppercase tracking-wide text-slate-600">Hotel Registration</p>

      <div>
        <label htmlFor="hotelName" className="block text-sm font-bold text-slate-700 mb-1">Hotel Name</label>
        <input
          id="hotelName"
          type="text"
          required
          value={hotelName}
          onChange={(event) => onHotelNameChange(event.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
          placeholder="e.g. Namaste Hotel"
        />
      </div>

      <div>
        <label htmlFor="roomCount" className="block text-sm font-bold text-slate-700 mb-1">How many rooms do you have?</label>
        <input
          id="roomCount"
          type="number"
          min="1"
          required
          value={roomCount}
          onChange={(event) => onRoomCountChange(event.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
          placeholder="12"
        />
        <p className="text-[11px] text-slate-500 mt-1">Use the room setup list below to add each room row.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="checkInTime" className="block text-sm font-bold text-slate-700 mb-1">Check-in Time</label>
          <input
            id="checkInTime"
            type="time"
            required
            value={checkInTime}
            onChange={(event) => onCheckInTimeChange(event.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label htmlFor="checkOutTime" className="block text-sm font-bold text-slate-700 mb-1">Check-out Time</label>
          <input
            id="checkOutTime"
            type="time"
            required
            value={checkOutTime}
            onChange={(event) => onCheckOutTimeChange(event.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="hotelTimezone" className="block text-sm font-bold text-slate-700 mb-1">Hotel Timezone</label>
        <input
          id="hotelTimezone"
          type="text"
          required
          value={timezone}
          onChange={(event) => onTimezoneChange(event.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500"
          placeholder="Asia/Kathmandu"
        />
      </div>
    </div>
  );
}
