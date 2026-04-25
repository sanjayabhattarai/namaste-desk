import { Plus, Trash2 } from 'lucide-react';

export type RoomSetupRow = {
  roomNumber: string;
  roomName: string;
  roomType: string;
  rate: string;
};

type RoomSetupListProps = {
  rooms: RoomSetupRow[];
  onChange: (rooms: RoomSetupRow[]) => void;
};

export default function RoomSetupList({ rooms, onChange }: RoomSetupListProps) {
  const updateRoom = (index: number, key: keyof RoomSetupRow, value: string) => {
    const next = rooms.map((room, currentIndex) =>
      currentIndex === index ? { ...room, [key]: value } : room,
    );
    onChange(next);
  };

  const addRoom = () => {
    onChange([
      ...rooms,
      {
        roomNumber: String(rooms.length + 1),
        roomName: '',
        roomType: 'Standard',
        rate: '1500',
      },
    ]);
  };

  const removeRoom = (index: number) => {
    const next = rooms.filter((_, currentIndex) => currentIndex !== index);
    onChange(next.length > 0 ? next : [{ roomNumber: '1', roomName: '', roomType: 'Standard', rate: '1500' }]);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-600">Room Setup</p>
          <p className="text-xs text-slate-500">Add room number and room name so your check-in form stays clean and fast.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 border border-slate-200">
            {rooms.length} room{rooms.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={addRoom}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <Plus size={16} />
            Add Room
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {rooms.map((room, index) => (
          <div key={`${room.roomNumber}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                Room Entry {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeRoom(index)}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                aria-label={`Remove room ${index + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_170px_130px] md:items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Room No.</label>
              <input
                type="text"
                value={room.roomNumber}
                onChange={(event) => updateRoom(index, 'roomNumber', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="101"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
              <input
                type="text"
                value={room.roomName}
                onChange={(event) => updateRoom(index, 'roomName', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="Deluxe 101"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
              <select
                aria-label={`Room type for row ${index + 1}`}
                value={room.roomType}
                onChange={(event) => updateRoom(index, 'roomType', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
              >
                <option>Standard</option>
                <option>Deluxe</option>
                <option>Suite</option>
                <option>Family</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Rate</label>
              <input
                type="number"
                min="0"
                value={room.rate}
                onChange={(event) => updateRoom(index, 'rate', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="1500"
              />
            </div>

            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
        Total rooms being added: {rooms.length}
      </div>
    </section>
  );
}
