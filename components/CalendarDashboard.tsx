"use client"
import React, { useMemo, useState } from 'react';
import { format, startOfDay, isWithinInterval, isSameDay, addMonths, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { User, LogOut, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Room, RoomStay } from '@/types/domain';

interface CalendarProps {
  rooms: Room[];
  stays: RoomStay[];
  onCellClick: (roomId: number, date: Date, stayId?: number, forceBilling?: boolean) => void;
  onCancelStay: (stayId: number, day: Date) => void;
}

export default function CalendarDashboard({ rooms, stays, onCellClick, onCancelStay }: CalendarProps) {
  const today = startOfDay(new Date());
  const [monthOffset, setMonthOffset] = useState(0);

  const visibleMonthDate = addMonths(today, monthOffset);
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(visibleMonthDate),
        end: endOfMonth(visibleMonthDate),
      }),
    [visibleMonthDate],
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
      <div className="flex justify-between items-center p-6 bg-slate-50 border-b">
        <div>
          <h2 className="text-xl font-black text-slate-800">Room Timeline</h2>
          <div className="text-xs font-bold text-slate-400 italic">Click Red rooms to add Food/Service</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            title="Previous month"
            aria-label="Previous month"
            disabled={monthOffset <= 0}
            onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
            className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-32 text-center text-sm font-black text-slate-700 uppercase">
            {format(visibleMonthDate, 'MMMM yyyy')}
          </div>
          <button
            title="Next month"
            aria-label="Next month"
            onClick={() => setMonthOffset((prev) => prev + 1)}
            className="p-2 rounded-lg border border-slate-200 bg-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-4 bg-slate-100 border-b border-r text-left text-xs font-black uppercase text-slate-500 w-32 sticky left-0 z-10">Room</th>
              {days.map(day => (
                <th key={day.toString()} className={`p-4 border-b text-center min-w-[140px] ${isSameDay(day, today) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                  <p className="text-xs font-bold uppercase">{format(day, 'EEE')}</p>
                  <p className="text-lg font-black">{format(day, 'MMM d')}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 border-b border-r font-bold text-slate-700 sticky left-0 bg-white z-10">
                  Room {room.id}
                </td>
                {days.map(day => {
                  const staysForRoomDay = stays
                    .filter(
                    (stay) =>
                      stay.roomId === room.id &&
                      isWithinInterval(day, {
                        start: startOfDay(stay.startDate),
                        end: startOfDay(stay.endDate),
                      }),
                    )
                    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

                  const isOccupied = staysForRoomDay.length > 0;
                  const activeStay = staysForRoomDay[0];
                  const checkoutStay = staysForRoomDay.find((stay) => isSameDay(day, stay.endDate) && !stay.checkedOut);
                  const checkInStay = staysForRoomDay.find(
                    (stay) => isSameDay(day, stay.startDate) && !stay.checkedOut && stay.id !== checkoutStay?.id,
                  );
                  const hasMultipleStays = staysForRoomDay.length > 1;
                  const isTransitionDay = Boolean(hasMultipleStays && checkoutStay && checkInStay);
                  const isSingleStayCheckoutDay =
                    Boolean(activeStay && isSameDay(day, activeStay.endDate) && !isTransitionDay);
                  const isCheckOutDay = isTransitionDay || isSingleStayCheckoutDay;
                  const isFullyBlocked = isOccupied && !isCheckOutDay;

                  return (
                    <td 
                      key={day.toString()} 
                      onClick={() => onCellClick(room.id, day)} // UNLOCKED: Always clickable now
                      className="p-2 border-b border-r h-24 cursor-pointer group relative"
                    >
                      {isFullyBlocked ? (
                        <div className="bg-rose-600 text-white p-2 rounded-lg text-xs font-bold shadow-md h-full flex flex-col justify-center transition-all group-hover:bg-rose-700 border-2 border-rose-400">
                          <div className="flex justify-between items-start">
                            <User size={12} />
                            {!activeStay?.checkedOut && (
                              <button
                                title="Cancel booking"
                                aria-label="Cancel booking"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (activeStay) {
                                    onCancelStay(activeStay.id, day);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-800"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <span className="truncate mt-1 uppercase tracking-tighter">{activeStay?.guest.name}</span>
                          <span className="text-[8px] mt-1 opacity-70 group-hover:opacity-100">Click to add items</span>
                        </div>
                      ) : isCheckOutDay ? (
                        <div className="h-full w-full flex flex-col gap-1">
                          <div
                            className="h-1/2 bg-rose-200 border border-rose-300 rounded-t-lg flex items-center px-2 justify-between"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (checkoutStay) {
                                onCellClick(room.id, day, checkoutStay.id, true);
                              }
                            }}
                          >
                             <span className="text-[9px] font-black text-rose-700 uppercase truncate w-16">{checkoutStay?.guest.name}</span>
                             <div className="flex items-center gap-1">
                               {!checkoutStay?.checkedOut && (
                                 <button
                                   title="Cancel this date"
                                   aria-label="Cancel this date"
                                   onClick={(event) => {
                                     event.stopPropagation();
                                     if (checkoutStay) {
                                       onCancelStay(checkoutStay.id, day);
                                     }
                                   }}
                                   className="p-1 rounded hover:bg-rose-300"
                                 >
                                   <Trash2 size={10} className="text-rose-700" />
                                 </button>
                               )}
                               <LogOut size={10} className="text-rose-500" />
                             </div>
                          </div>
                          {isTransitionDay ? (
                            <div
                              className="h-1/2 bg-emerald-200 border border-emerald-300 rounded-b-lg flex items-center px-2 justify-between"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (checkInStay) {
                                  onCellClick(room.id, day, checkInStay.id, true);
                                }
                              }}
                            >
                              <span className="text-[9px] font-black text-emerald-700 uppercase truncate w-16">{checkInStay?.guest.name}</span>
                              <div className="flex items-center gap-1">
                                {!checkInStay?.checkedOut && (
                                  <button
                                    title="Cancel this date"
                                    aria-label="Cancel this date"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (checkInStay) {
                                        onCancelStay(checkInStay.id, day);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-emerald-300"
                                  >
                                    <Trash2 size={10} className="text-emerald-700" />
                                  </button>
                                )}
                                <User size={10} className="text-emerald-600" />
                              </div>
                            </div>
                          ) : (
                            <div
                              className="h-1/2 border-2 border-dashed border-emerald-200 rounded-b-lg bg-emerald-50/30 flex items-center justify-center group-hover:bg-emerald-100"
                              onClick={(event) => {
                                event.stopPropagation();
                                onCellClick(room.id, day, undefined, false);
                              }}
                            >
                               <Plus size={12} className="text-emerald-500" />
                               <span className="text-[9px] font-black text-emerald-600 ml-1 uppercase">Available</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full w-full hover:bg-emerald-50 rounded-lg transition-colors border-2 border-transparent hover:border-emerald-200 flex items-center justify-center text-transparent group-hover:text-emerald-400">
                          <Plus size={16} />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}