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
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-600">Room Setup</p>
          <p className="text-xs text-slate-500">Add each room you want to manage in the dashboard.</p>
        </div>
        <button
          type="button"
          onClick={addRoom}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
        >
          <Plus size={16} />
          Add Another Room
        </button>
      </div>

      <div className="grid gap-3">
        {rooms.map((room, index) => (
          <div key={`${room.roomNumber}-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[100px_1fr_160px_120px_auto] md:items-end">
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

            <button
              type="button"
              onClick={() => removeRoom(index)}
              className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
              aria-label={`Remove room ${index + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
        Total rooms being added: {rooms.length}
      </div>
    </div>
  );
}
