"use client"
import React, { useState } from 'react';
import { X, Plus, Printer } from 'lucide-react';
import { BillingDetails, BillingDraft } from '@/types/domain';

interface BillingViewProps {
  roomNumber: number;
  guestName: string;
  phone: string;
  roomPrice: number;
  advancePaid: number;
  draft: BillingDraft;
  onDraftChange: (draft: BillingDraft) => void;
  onClose: () => void;
  onCheckout: (finalAmount: number, billDetails: BillingDetails) => void;
}

export default function BillingView({ roomNumber, guestName, phone, roomPrice, advancePaid, draft, onDraftChange, onClose, onCheckout }: BillingViewProps) {
  const [newItem, setNewItem] = useState({ name: '', price: '' });

  const addFoodItem = () => {
    if (newItem.name && newItem.price) {
      onDraftChange({
        ...draft,
        foodItems: [...draft.foodItems, { name: newItem.name, price: Number(newItem.price) }],
      });
      setNewItem({ name: '', price: '' });
    }
  };

  const foodTotal = draft.foodItems.reduce((sum, item) => sum + item.price, 0);
  const subtotal = roomPrice * draft.days + foodTotal;
  const grandTotal = Math.max(0, subtotal - draft.discount - advancePaid);

  const handleCheckout = () => {
    onCheckout(grandTotal, {
      roomNumber,
      guestName,
      phone,
      roomPrice,
      advancePaid,
      days: draft.days,
      foodItems: draft.foodItems,
      discount: draft.discount,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl p-6 overflow-y-auto animate-in zoom-in duration-200 flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Room {roomNumber} Bill</h2>
            <p className="text-emerald-600 font-medium">{guestName}</p>
          </div>
          <button
            onClick={onClose}
            title="Close billing panel"
            aria-label="Close billing panel"
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Room Charge Section */}
        <div className="bg-slate-50 p-4 rounded-xl mb-6">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-700">Room Charge</span>
            <div className="flex items-center gap-2">
               <input 
                type="number" 
                aria-label="Number of days"
                className="w-12 p-1 border rounded text-center" 
                value={draft.days} 
                onChange={(e) => onDraftChange({ ...draft, days: Math.max(1, Number(e.target.value) || 1) })}
               />
               <span className="text-sm text-slate-500">Days</span>
            </div>
          </div>
          <p className="text-right font-black text-slate-800 mt-2">Rs. {roomPrice * draft.days}</p>
        </div>

        {/* Food & Services Section */}
        <div className="flex-1">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Plus size={18} /> Add Food / Service
          </h3>
          
          <div className="flex gap-2 mb-4">
            <input 
              placeholder="Item (Tea, Momo...)" 
              className="flex-1 p-2 border rounded-lg text-sm"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Price" 
              className="w-20 p-2 border rounded-lg text-sm"
              value={newItem.price}
              onChange={(e) => setNewItem({...newItem, price: e.target.value})}
            />
            <button
              onClick={addFoodItem}
              title="Add food or service"
              aria-label="Add food or service"
              className="bg-emerald-600 text-white p-2 rounded-lg"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {draft.foodItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm bg-white border p-2 rounded-lg italic">
                <span>{item.name}</span>
                <span className="font-bold">Rs. {item.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Calculation Area */}
        <div className="border-t pt-4 mt-6 space-y-3">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>Rs. {subtotal}</span>
          </div>
          <div className="flex justify-between items-center text-rose-600 font-bold">
            <span>Discount</span>
            <input 
              type="number" 
              aria-label="Discount amount"
              className="w-24 p-1 border-b-2 border-rose-200 text-right focus:outline-none" 
              value={draft.discount}
              onChange={(e) => onDraftChange({ ...draft, discount: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="flex justify-between text-emerald-700 font-bold">
            <span>Advance Paid</span>
            <span>Rs. {advancePaid}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-800">
            <span className="text-xl font-black">Grand Total</span>
            <span className="text-2xl font-black text-emerald-700">Rs. {grandTotal}</span>
          </div>
          
          <button 
            onClick={handleCheckout}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-4 hover:bg-black transition-all shadow-xl"
          >
            <Printer size={20} /> Checkout & Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}