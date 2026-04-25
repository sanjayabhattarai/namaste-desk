"use client";

import { Search, Users } from 'lucide-react';

interface LocalGuestSearchResult {
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
}

interface ReceiptSearchPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  isSearching: boolean;
  searchResults: LocalGuestSearchResult[];
  onSelectGuest: (guest: LocalGuestSearchResult) => void;
}

export default function ReceiptSearchPanel({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  searchResults,
  onSelectGuest,
}: ReceiptSearchPanelProps) {
  return (
    <div className="max-w-7xl mx-auto mb-6 px-4">
      <div className="relative group flex gap-2">
        <input
          type="text"
          placeholder="Search Local Guests by Phone or Name..."
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm focus:border-emerald-500 outline-none font-bold"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSearchSubmit();
            }
          }}
        />
        <Users className="absolute left-4 top-4 text-slate-400" size={24} />
        <button
          type="button"
          onClick={onSearchSubmit}
          disabled={isSearching || searchQuery.trim().length < 2}
          className="rounded-2xl bg-emerald-700 px-4 py-2 font-black text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-2">
            <Search size={16} />
            {isSearching ? 'Searching...' : 'Search'}
          </span>
        </button>
      </div>

      {searchQuery.length > 1 && (
        <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20 relative">
          {searchResults.length === 0 ? (
            <div className="p-4 text-sm font-bold text-slate-500">
              {isSearching ? 'Searching local guest records...' : 'No local guest found. Try another phone/name.'}
            </div>
          ) : searchResults.map((guest) => (
            <div
              key={guest.id}
              onClick={() => onSelectGuest(guest)}
              className="p-4 border-b hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors"
            >
              <div>
                <p className="font-black text-slate-800">
                  {guest.guestName}{' '}
                  <span className="text-slate-400 font-normal">({guest.phone})</span>
                </p>
                <p className="text-xs text-slate-500 uppercase font-bold">
                  Room {guest.roomNumber} • {guest.checkInDate} → {guest.checkOutDate}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-700">{guest.nationality}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black">Click to View ID Card</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
