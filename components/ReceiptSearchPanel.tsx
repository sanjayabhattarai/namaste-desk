"use client";

import { Users } from 'lucide-react';
import { Bill } from '@/types/domain';

interface ReceiptSearchPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredReceipts: Bill[];
  onSelectBill: (bill: Bill) => void;
}

export default function ReceiptSearchPanel({
  searchQuery,
  onSearchChange,
  filteredReceipts,
  onSelectBill,
}: ReceiptSearchPanelProps) {
  return (
    <div className="max-w-7xl mx-auto mb-6 px-4">
      <div className="relative group">
        <input
          type="text"
          placeholder="Search Past Bills by Phone or Name..."
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm focus:border-emerald-500 outline-none font-bold"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Users className="absolute left-4 top-4 text-slate-400" size={24} />
      </div>

      {searchQuery.length > 2 && (
        <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20 relative">
          {filteredReceipts.map((bill) => (
            <div
              key={bill.id}
              onClick={() => onSelectBill(bill)}
              className="p-4 border-b hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors"
            >
              <div>
                <p className="font-black text-slate-800">
                  {bill.guestName}{' '}
                  <span className="text-slate-400 font-normal">({bill.phone})</span>
                </p>
                <p className="text-xs text-slate-500 uppercase font-bold">
                  Room {bill.roomNumber} • {bill.date}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-700 font-mono">Rs. {bill.grandTotal}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black">Click to View Receipt</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
