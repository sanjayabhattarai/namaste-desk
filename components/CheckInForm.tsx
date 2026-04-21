"use client"
import React, { useState } from 'react';
import Image from 'next/image';
import { X, User, Phone, Calendar, Camera, Users, Globe, Clock, Mail, Briefcase, MapPin, Plane, TrainFront, FileText, StickyNote, BadgeHelp } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { CheckInFormData } from '@/types/domain';

interface CheckInFormProps {
  roomNumber: number | string;
  availableRoomNumbers: number[];
  initialDate: Date | null;
  defaultRoomPrice: number;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  minCheckInDate: string;
  onClose: () => void;
  onSave: (data: CheckInFormData) => void;
}

export default function CheckInForm({ roomNumber, availableRoomNumbers, initialDate, defaultRoomPrice, defaultCheckInTime, defaultCheckOutTime, minCheckInDate, onClose, onSave }: CheckInFormProps) {
  // 1. Safety Check: If no date, use "Today"
  const safeDate = initialDate && isValid(initialDate) ? initialDate : new Date();

  // Updated state to match a guest register card
  const [formData, setFormData] = useState<CheckInFormData>({
    isGroupEntry: false,
    roomNumber: String(roomNumber),
    roomNumbers: [String(roomNumber)],
    guestName: '',
    profession: '',
    postalAddress: '',
    phone: '',
    email: '',
    nationality: 'Nepali',
    passportNumber: '',
    citizenshipNumber: '',
    entryPoint: '',
    arrivedFrom: '',
    departureTo: '',
    modeOfTravel: 'Bus',
    purposeOfVisit: 'Pleasure',
    agentName: '',
    remarks: '',
    roomPrice: String(defaultRoomPrice || 1500),
    rateCurrency: 'NPR',
    advancePaid: '0',
    totalGuests: '1',
    checkInDate: format(safeDate, 'yyyy-MM-dd'),
    checkOutDate: format(new Date(safeDate.getTime() + 86400000), 'yyyy-MM-dd'),
    checkInTime: defaultCheckInTime || '12:00',
    checkOutTime: defaultCheckOutTime || '10:00',
    idPreview: null as string | null
  });

  const toggleRoomSelection = (roomId: number) => {
    const roomValue = String(roomId);
    setFormData((prev) => {
      const exists = prev.roomNumbers.includes(roomValue);
      if (exists) {
        return {
          ...prev,
          roomNumbers: prev.roomNumbers.filter((item) => item !== roomValue),
        };
      }

      return {
        ...prev,
        roomNumbers: [...prev.roomNumbers, roomValue],
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, idPreview: URL.createObjectURL(e.target.files[0]) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl overflow-y-auto animate-in zoom-in duration-200 flex flex-col">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-10 border-b p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Hotel Guest Register Card</h2>
            <p className="text-emerald-600 font-bold flex items-center gap-1">
               Assigning to Room {roomNumber}
            </p>
          </div>
          <button 
            onClick={onClose} 
            title="Close check-in form"
            aria-label="Close check-in form"
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-800"
          >
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          <section className="space-y-4 rounded-3xl border border-slate-100 p-5 bg-slate-50/70">
            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-[0.2em]">
              <User size={16} /> Personal Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="guestName" className="block text-sm font-bold text-slate-700 mb-1">Full Name (M/S/MR/MRS/MISS)</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    id="guestName"
                    type="text"
                    placeholder="e.g. MR Ram Bahadur"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none transition-all font-medium bg-white"
                    value={formData.guestName}
                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="nationality" className="block text-sm font-bold text-slate-700 mb-1">Nationality</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    id="nationality"
                    type="text"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profession" className="block text-sm font-bold text-slate-700 mb-1">Profession</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    id="profession"
                    type="text"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="postalAddress" className="block text-sm font-bold text-slate-700 mb-1">Postal Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    id="postalAddress"
                    type="text"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                    value={formData.postalAddress}
                    onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-1">Mobile Number <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="98..."
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-100 p-5 bg-white">
            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-[0.2em]">
              <FileText size={16} /> Identification
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="passportNumber" className="block text-sm font-bold text-slate-700 mb-1">Passport Number <span className="text-slate-400 font-medium">(For International Guests)</span></label>
                <input
                  id="passportNumber"
                  type="text"
                  className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-slate-50"
                  value={formData.passportNumber}
                  onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="citizenshipNumber" className="block text-sm font-bold text-slate-700 mb-1">Citizenship Number (CTZN NO.) <span className="text-slate-400 font-medium">(For Nepali Guests)</span></label>
                <input
                  id="citizenshipNumber"
                  type="text"
                  className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-slate-50"
                  value={formData.citizenshipNumber}
                  onChange={(e) => setFormData({ ...formData, citizenshipNumber: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="entryPoint" className="block text-sm font-bold text-slate-700 mb-1">Entry Point</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    id="entryPoint"
                    type="text"
                    placeholder="Where they entered Nepal/City"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-slate-50"
                    value={formData.entryPoint}
                    onChange={(e) => setFormData({ ...formData, entryPoint: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-100 p-5 bg-slate-50/70">
            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-[0.2em]">
              <Plane size={16} /> Travel Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="arrivedFrom" className="block text-sm font-bold text-slate-700 mb-1">Arrived From</label>
                <input
                  id="arrivedFrom"
                  type="text"
                  placeholder="Previous city/location"
                  className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                  value={formData.arrivedFrom}
                  onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="departureTo" className="block text-sm font-bold text-slate-700 mb-1">Departure To</label>
                <input
                  id="departureTo"
                  type="text"
                  placeholder="Next destination"
                  className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                  value={formData.departureTo}
                  onChange={(e) => setFormData({ ...formData, departureTo: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="modeOfTravel" className="block text-sm font-bold text-slate-700 mb-1">Mode of Travel</label>
                <div className="relative">
                  <TrainFront className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <select
                    id="modeOfTravel"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                    value={formData.modeOfTravel}
                    onChange={(e) => setFormData({ ...formData, modeOfTravel: e.target.value })}
                  >
                    <option>Flight</option>
                    <option>Bus</option>
                    <option>Private Vehicle</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="purposeOfVisit" className="block text-sm font-bold text-slate-700 mb-1">Purpose of Visit</label>
                <div className="relative">
                  <BadgeHelp className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <select
                    id="purposeOfVisit"
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                    value={formData.purposeOfVisit}
                    onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                  >
                    <option>Pleasure</option>
                    <option>Business</option>
                    <option>Pilgrimage</option>
                    <option>Trekking</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-100 p-5 bg-white">
            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-[0.2em]">
              <Calendar size={16} /> Room & Stay Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 mb-2">Entry Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isGroupEntry: false,
                        roomNumbers: [prev.roomNumber || String(roomNumber)],
                      }))
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-bold border transition-colors ${!formData.isGroupEntry ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
                  >
                    Single Entry
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isGroupEntry: true,
                        roomNumbers: prev.roomNumbers.length > 0 ? prev.roomNumbers : [prev.roomNumber || String(roomNumber)],
                      }))
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-bold border transition-colors ${formData.isGroupEntry ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
                  >
                    Group Entry
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label htmlFor="totalGuests" className="block text-xs font-bold text-slate-500 mb-1">Number of Persons</label>
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-slate-400" />
                  <input
                    id="totalGuests"
                    type="number"
                    min="1"
                    className="bg-transparent font-black text-slate-800 text-lg w-full outline-none"
                    value={formData.totalGuests}
                    onChange={(e) => setFormData({ ...formData, totalGuests: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 md:col-span-2">
                <label className="block text-xs font-bold text-emerald-700 mb-1 uppercase tracking-wider">Arrival Date &amp; Time</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Calendar size={14} className="text-emerald-600" />
                    <input
                      id="checkInDate"
                      type="date"
                      min={minCheckInDate}
                      title="Arrival date"
                      aria-label="Arrival date"
                      className="bg-transparent font-bold text-sm focus:outline-none w-full"
                      value={formData.checkInDate}
                      onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-emerald-500" />
                    <input
                      type="time"
                      aria-label="Arrival time"
                      className="text-xs bg-white p-1 rounded border border-emerald-200 w-full outline-none focus:ring-1 focus:ring-emerald-500"
                      value={formData.checkInTime}
                      onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 md:col-span-2">
                <label className="block text-xs font-bold text-emerald-700 mb-1 uppercase tracking-wider">Departure Date &amp; Time</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Calendar size={14} className="text-emerald-600" />
                    <input
                      id="checkOutDate"
                      type="date"
                      min={formData.checkInDate}
                      title="Departure date"
                      aria-label="Departure date"
                      className="bg-transparent font-bold text-sm focus:outline-none w-full"
                      value={formData.checkOutDate}
                      onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-emerald-500" />
                    <input
                      type="time"
                      aria-label="Departure time"
                      className="text-xs bg-white p-1 rounded border border-emerald-200 w-full outline-none focus:ring-1 focus:ring-emerald-500"
                      value={formData.checkOutTime}
                      onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label htmlFor="roomNumber" className="block text-xs font-bold text-slate-500 mb-1">Room Number</label>
                <select
                  id="roomNumber"
                  title="Room number"
                  className="bg-transparent font-black text-slate-800 text-lg w-full outline-none"
                  value={formData.roomNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      roomNumber: e.target.value,
                      roomNumbers: formData.isGroupEntry ? formData.roomNumbers : [e.target.value],
                    })
                  }
                >
                  {availableRoomNumbers.map((roomOption) => (
                    <option key={roomOption} value={roomOption}>
                      Room {roomOption}
                    </option>
                  ))}
                </select>
              </div>

              {formData.isGroupEntry && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Assign Rooms For Group</label>
                  <div className="flex flex-wrap gap-2">
                    {availableRoomNumbers.map((roomOption) => {
                      const isSelected = formData.roomNumbers.includes(String(roomOption));
                      return (
                        <button
                          key={roomOption}
                          type="button"
                          onClick={() => toggleRoomSelection(roomOption)}
                          className={`px-3 py-1.5 rounded-full text-xs font-black border transition-colors ${isSelected ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                          Room {roomOption}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {formData.roomNumbers.length > 0
                      ? `Selected ${formData.roomNumbers.length} room(s)`
                      : 'Select at least one room for group entry'}
                  </p>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 md:col-span-2">
                <label htmlFor="roomPrice" className="block text-xs font-bold text-slate-500 mb-1">Rate</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Amount</span>
                  <input
                    id="roomPrice"
                    type="number"
                    className="bg-transparent font-black text-emerald-700 text-lg w-full outline-none"
                    value={formData.roomPrice}
                    onChange={(e) => setFormData({ ...formData, roomPrice: e.target.value })}
                  />
                  <select
                    aria-label="Rate currency"
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-700 outline-none"
                    value={formData.rateCurrency}
                    onChange={(e) => setFormData({ ...formData, rateCurrency: e.target.value as CheckInFormData['rateCurrency'] })}
                  >
                    <option value="NPR">NPR</option>
                    <option value="INR">INR</option>
                    <option value="US$">US$</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-100 p-5 bg-slate-50/70">
            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-[0.2em]">
              <StickyNote size={16} /> Additional Fields
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="agentName" className="block text-sm font-bold text-slate-700 mb-1">Agent Name <span className="text-slate-400 font-medium">(If the booking came through an agency)</span></label>
                <input
                  id="agentName"
                  type="text"
                  className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white"
                  value={formData.agentName}
                  onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="remarks" className="block text-sm font-bold text-slate-700 mb-1">Remarks</label>
                <textarea
                  id="remarks"
                  rows={4}
                  placeholder="Any special notes"
                  className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none font-medium bg-white resize-none"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section>
            <label className="block text-sm font-bold text-slate-700 mb-2">ID Card / Document</label>
            <div className="relative group">
              <input
                type="file"
                aria-label="Upload ID document"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={handleFileChange}
                accept="image/*"
              />
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-all">
                {formData.idPreview ? (
                  <Image src={formData.idPreview} alt="ID Preview" width={800} height={320} unoptimized className="h-40 w-full object-cover rounded-lg shadow-md" />
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-emerald-600">
                      <Camera size={24} />
                    </div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Take Photo or Upload</span>
                  </>
                )}
              </div>
            </div>
          </section>
        </form>

        {/* Sticky Footer Button */}
        <div className="p-6 border-t bg-white sticky bottom-0">
          <button 
            onClick={handleSubmit}
            className="w-full py-4 bg-emerald-800 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-900 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Check-in Guest
          </button>
        </div>
      </div>
    </div>
  );
}