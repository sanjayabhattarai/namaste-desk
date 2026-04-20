"use client"
import { X, Printer } from 'lucide-react';
import { Bill, FoodItem } from '@/types/domain';

interface PastReceiptModalProps {
  bill: Bill | null;
  onClose: () => void;
}

export default function PastReceiptModal({ bill, onClose }: PastReceiptModalProps) {
  if (!bill) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="p-4 bg-slate-100 flex justify-between items-center border-b">
          <span className="font-black text-slate-500 uppercase text-xs tracking-widest">Previous Bill Record</span>
          <button
            onClick={onClose}
            title="Close receipt"
            aria-label="Close receipt"
            className="p-1 hover:bg-white rounded-full transition-colors"
          >
            <X size={20}/>
          </button>
        </div>
        
        {/* THE RECEIPT DESIGN */}
        <div className="p-8 font-mono text-sm text-slate-800 bg-white" id="printable-receipt">
          <div className="text-center mb-6 border-b-2 border-dashed border-slate-200 pb-4">
            <h2 className="text-xl font-black uppercase tracking-tighter">Namaste Desk Hotel</h2>
            <p className="text-xs">Kathmandu, Nepal</p>
            <p className="text-[10px] mt-1">{bill.date}</p>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between"><span>Guest:</span><span className="font-bold uppercase">{bill.guestName}</span></div>
            <div className="flex justify-between"><span>Room:</span><span className="font-bold">{bill.roomNumber}</span></div>
            <div className="flex justify-between border-b border-dotted pb-2"><span>Days:</span><span className="font-bold">{bill.days}</span></div>
          </div>

          <div className="space-y-1 mb-6">
             <div className="flex justify-between text-xs font-bold"><span>Room Charge</span><span>{bill.roomPrice * bill.days}</span></div>
             {bill.foodItems.map((item: FoodItem, i: number) => (
               <div key={i} className="flex justify-between text-[10px]"><span>+ {item.name}</span><span>{item.price}</span></div>
             ))}
             <div className="flex justify-between text-rose-600 italic"><span>- Discount</span><span>{bill.discount}</span></div>
             <div className="flex justify-between text-emerald-700 italic"><span>- Advance Paid</span><span>{bill.advancePaid}</span></div>
          </div>

          <div className="border-t-2 border-double pt-4 flex justify-between items-center">
            <span className="text-lg font-black uppercase">Grand Total</span>
            <span className="text-xl font-black">Rs. {bill.grandTotal}</span>
          </div>

          <p className="text-center text-[10px] mt-8 text-slate-400">--- THANK YOU ---</p>
        </div>

        <div className="p-4 bg-slate-50 flex gap-2">
           <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
             <Printer size={18}/> Print
           </button>
        </div>
      </div>
    </div>
  );
}