"use client"
import React, { useEffect, useRef, useState } from 'react';
import { X, User, Phone, Calendar, Camera, Users, Globe, Clock, Mail, Briefcase, MapPin, Plane, TrainFront, FileText, StickyNote, BadgeHelp, Printer } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { CheckInFormData } from '@/types/domain';
import { supabase } from '@/lib/supabaseClient';

interface CheckInFormProps {
  roomNumber: number | string;
  availableRoomNumbers: number[];
  initialDate: Date | null;
  defaultRoomPrice: number;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  minCheckInDate: string;
  onClose: () => void;
  onSave: (data: CheckInFormData) => Promise<{ success: boolean; guestName?: string; roomNumbers?: number[]; conflictRooms?: number[] }> | { success: boolean; guestName?: string; roomNumbers?: number[]; conflictRooms?: number[] };
}

export default function CheckInForm({ roomNumber, availableRoomNumbers, initialDate, defaultRoomPrice, defaultCheckInTime, defaultCheckOutTime, minCheckInDate, onClose, onSave }: CheckInFormProps) {
  // 1. Safety Check: If no date, use "Today"
  const safeDate = initialDate && isValid(initialDate) ? initialDate : new Date();

  type GuestHistoryListItem = {
    id: string;
    guestName: string;
    phone: string;
    roomNumber: string;
    nationality: string;
    checkInDate: string;
    checkOutDate: string;
    profession?: string | null;
    postalAddress?: string | null;
    idCardPath?: string | null;
    idPreview?: string | null;
    createdAt?: string;
  };

  const toDisplayableIdCardSrc = (source?: string | null) => {
    if (!source) {
      return null;
    }

    if (/^blob:/i.test(source)) {
      return null;
    }

    if (/^(data:|https?:|file:)/i.test(source)) {
      return source;
    }

    const normalized = source.replace(/\\/g, '/');

    if (/^[a-zA-Z]:\//.test(normalized)) {
      return `file:///${normalized}`;
    }

    if (normalized.startsWith('/')) {
      return `file://${normalized}`;
    }

    return source;
  };

  const createDefaultFormData = (): CheckInFormData => ({
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
    idPreview: null,
    idCardPath: null,
  });

  // Updated state to match a guest register card
  const [formData, setFormData] = useState<CheckInFormData>(createDefaultFormData());
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [isIdCardUploadMode, setIsIdCardUploadMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [guestHistoryList, setGuestHistoryList] = useState<GuestHistoryListItem[]>([]);
  const [guestHistoryRawList, setGuestHistoryRawList] = useState<GuestHistoryListItem[]>([]);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isIdCardActionOpen, setIsIdCardActionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const currentIdCardDisplaySrc = formData.idPreview ?? toDisplayableIdCardSrc(formData.idCardPath ?? null);
  const isPdfDocument = Boolean(
    (idCardFile && idCardFile.type === 'application/pdf')
    || /^data:application\/pdf/i.test(currentIdCardDisplaySrc ?? '')
    || /\.pdf($|\?)/i.test(currentIdCardDisplaySrc ?? ''),
  );

  const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, '').trim();

  const dedupeGuestHistoryList = (items: GuestHistoryListItem[]) => {
    const byCustomer = new Map<string, GuestHistoryListItem>();

    for (const item of items) {
      const key = `${(item.guestName || '').trim().toLowerCase()}|${normalizePhone(item.phone || '')}`;

      if (!byCustomer.has(key)) {
        byCustomer.set(key, item);
        continue;
      }

      const existing = byCustomer.get(key);
      const existingHasId = Boolean(existing?.idCardPath || existing?.idPreview);
      const nextHasId = Boolean(item.idCardPath || item.idPreview);

      if (!existingHasId && nextHasId) {
        byCustomer.set(key, item);
      }
    }

    return Array.from(byCustomer.values());
  };

  const resolveIdCardDataUrl = async (source?: string | null) => {
    const raw = String(source || '').trim();
    if (!raw) {
      return null;
    }

    if (/^data:/i.test(raw)) {
      return raw;
    }

    if (window.electronAPI?.readIdCardDataUrl) {
      return window.electronAPI.readIdCardDataUrl({ source: raw });
    }

    return toDisplayableIdCardSrc(raw);
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const toggleRoomSelection = (roomId: number) => {
    const roomValue = String(roomId);
    setFormData((prev) => {
      const exists = prev.roomNumbers.includes(roomValue);
      const nextRoomNumbers = exists
        ? prev.roomNumbers.filter((item) => item !== roomValue)
        : [...prev.roomNumbers, roomValue];

      const uniqueNextRoomNumbers = Array.from(new Set(nextRoomNumbers));

      if (exists) {
        return {
          ...prev,
          roomNumbers: uniqueNextRoomNumbers,
          roomNumber: uniqueNextRoomNumbers[0] ?? prev.roomNumber,
        };
      }

      return {
        ...prev,
        roomNumbers: uniqueNextRoomNumbers,
        roomNumber: uniqueNextRoomNumbers[0] ?? prev.roomNumber,
      };
    });
  };

  const selectAllGroupRooms = () => {
    setFormData((prev) => {
      const allRooms = availableRoomNumbers.map((room) => String(room));
      return {
        ...prev,
        roomNumbers: allRooms,
        roomNumber: allRooms[0] ?? prev.roomNumber,
      };
    });
  };

  const clearGroupRooms = () => {
    setFormData((prev) => ({
      ...prev,
      roomNumbers: [],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdCardFile(file);
      setFormData({ ...formData, idPreview: URL.createObjectURL(file), idCardPath: null });
      setIsIdCardUploadMode(false);
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const attachCameraStreamToVideo = (stream: MediaStream) => {
    let attempts = 0;

    const tryAttach = () => {
      const video = cameraVideoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          void video.play();
        };
        return;
      }

      attempts += 1;
      if (attempts < 20) {
        window.setTimeout(tryAttach, 50);
      }
    };

    tryAttach();
  };

  const openCamera = async () => {
    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
      attachCameraStreamToVideo(stream);
    } catch (error) {
      console.error('Unable to open camera:', error);
      setSaveStatus({ type: 'error', message: 'Unable to open camera. Please allow camera permission or use Upload File.' });
    }
  };

  const captureFromCamera = () => {
    const video = cameraVideoRef.current;
    if (!video) {
      setSaveStatus({ type: 'error', message: 'Camera is not ready yet. Please wait 1 second and try again.' });
      return;
    }

    if ((video.videoWidth || 0) === 0 || (video.videoHeight || 0) === 0) {
      setSaveStatus({ type: 'error', message: 'Camera preview is not ready. Please wait and try Capture again.' });
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setFormData((prev) => ({
      ...prev,
      idPreview: capturedDataUrl,
      idCardPath: null,
    }));

    setIdCardFile(null);
    setIsIdCardUploadMode(false);
    setIsCameraOpen(false);
    stopCameraStream();
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    const phoneQuery = formData.phone.trim();
    const electronAPI = window.electronAPI;

    if (phoneQuery.length < 4 || !electronAPI?.searchGuestsList) {
      setGuestHistoryList([]);
      setGuestHistoryRawList([]);
      setIsSearchingHistory(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const { data: activeSessionData } = await supabase.auth.getSession();
      const userId = activeSessionData.session?.user?.id;

      if (!userId) {
        setGuestHistoryList([]);
        setGuestHistoryRawList([]);
        setIsSearchingHistory(false);
        return;
      }

      setIsSearchingHistory(true);

      try {
        const results = await electronAPI.searchGuestsList({
          owner_id: userId,
          query: phoneQuery,
        });

        setGuestHistoryRawList(results);
        setGuestHistoryList(dedupeGuestHistoryList(results));
      } catch (error) {
        console.error('Failed to search guest history:', error);
        setGuestHistoryList([]);
        setGuestHistoryRawList([]);
      } finally {
        setIsSearchingHistory(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formData.phone]);

  const applyGuestHistory = async (guestHistory: GuestHistoryListItem) => {
    if (!guestHistory) {
      return;
    }

    const fallbackHistoryWithIdCard = guestHistoryRawList.find(
      (item) =>
        normalizePhone(item.phone) === normalizePhone(guestHistory.phone)
        && Boolean(item.idCardPath || item.idPreview),
    );

    const preferredIdCardPath =
      guestHistory.idCardPath
      ?? fallbackHistoryWithIdCard?.idCardPath
      ?? null;

    let resolvedIdCardSource =
      await resolveIdCardDataUrl(preferredIdCardPath)
      ?? toDisplayableIdCardSrc(
      guestHistory.idCardPath
      ?? guestHistory.idPreview
      ?? fallbackHistoryWithIdCard?.idCardPath
      ?? fallbackHistoryWithIdCard?.idPreview
      ?? null,
    );

    let resolvedIdCardPath = guestHistory.idCardPath ?? fallbackHistoryWithIdCard?.idCardPath ?? null;

    if (!resolvedIdCardSource && window.electronAPI?.searchGuests) {
      try {
        const { data: activeSessionData } = await supabase.auth.getSession();
        const userId = activeSessionData.session?.user?.id;

        if (userId) {
          const latestGuest = await window.electronAPI.searchGuests({
            owner_id: userId,
            phone: guestHistory.phone,
          });

          resolvedIdCardSource =
            await resolveIdCardDataUrl(latestGuest?.idCardPath ?? latestGuest?.idPreview ?? null)
            ?? toDisplayableIdCardSrc(latestGuest?.idCardPath ?? latestGuest?.idPreview ?? null);
          resolvedIdCardPath = latestGuest?.idCardPath ?? resolvedIdCardPath;
        }
      } catch (error) {
        console.error('Failed to load fallback ID card from history:', error);
      }
    }

    const fallbackDisplaySrc = resolvedIdCardPath ? toDisplayableIdCardSrc(resolvedIdCardPath) : null;

    setFormData((prev) => ({
      ...prev,
      guestName: guestHistory.guestName ?? prev.guestName,
      nationality: guestHistory.nationality ?? prev.nationality,
      profession: guestHistory.profession ?? prev.profession,
      postalAddress: guestHistory.postalAddress ?? prev.postalAddress,
      phone: guestHistory.phone ?? prev.phone,
      idCardPath: resolvedIdCardPath ?? resolvedIdCardSource ?? null,
      idPreview: resolvedIdCardSource ?? fallbackDisplaySrc ?? null,
    }));

    setIdCardFile(null);
    setIsIdCardUploadMode(!(resolvedIdCardSource || fallbackDisplaySrc));

    setGuestHistoryList([]);
    setGuestHistoryRawList([]);
  };

  const submitGuest = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    const guestName = formData.guestName.trim();
    const phone = formData.phone.trim();
    const hasIdCard = Boolean(idCardFile || formData.idPreview || formData.idCardPath);

    if (!guestName) {
      setSaveStatus({ type: 'error', message: 'Check-in unsuccessful: Guest name is required.' });
      setIsSaving(false);
      return;
    }

    if (!phone) {
      setSaveStatus({ type: 'error', message: 'Check-in unsuccessful: Mobile number is required.' });
      setIsSaving(false);
      return;
    }

    if (!hasIdCard) {
      setSaveStatus({ type: 'error', message: 'Check-in unsuccessful: ID card is required.' });
      setIsSaving(false);
      return;
    }

    const { data: activeSessionData } = await supabase.auth.getSession();
    const userId = activeSessionData.session?.user?.id;

    if (!userId) {
      setSaveStatus({ type: 'error', message: 'Could not verify active session. Local save was not completed.' });
      setIsSaving(false);
      return;
    }

    if (!window.electronAPI?.saveGuest) {
      setSaveStatus({ type: 'error', message: 'Desktop bridge unavailable. Please run inside Electron.' });
      setIsSaving(false);
      return;
    }

    try {
      const result = await Promise.resolve(onSave(formData));

      if (!result.success) {
        const errorMsg = result.conflictRooms && result.conflictRooms.length > 0
          ? `Checkout unsuccessful: Room ${result.conflictRooms.join(', ')} occupied for these dates.`
          : 'Checkout unsuccessful for this date.';
        setSaveStatus({ type: 'error', message: errorMsg });
        setIsSaving(false);
        return;
      }

      const normalizedHistoryId = toDisplayableIdCardSrc(formData.idCardPath ?? formData.idPreview ?? null);
      const idCardDataUrl = idCardFile
        ? await readFileAsDataUrl(idCardFile)
        : (normalizedHistoryId?.startsWith('data:') ? normalizedHistoryId : null);
      const existingIdCardPath = idCardFile
        ? null
        : (normalizedHistoryId?.startsWith('data:') ? null : (normalizedHistoryId ?? null));

      await window.electronAPI.saveGuest({
        ...formData,
        owner_id: userId,
        idCardDataUrl,
        idCardFileName: idCardFile?.name ?? null,
        existingIdCardPath,
        idPreview: null,
      });

      const roomList = result.roomNumbers?.join(', ') || String(roomNumber);
      const successMsg = `${result.guestName || 'Guest'} checked in successfully for room ${roomList}.`;
      setSaveStatus({ type: 'success', message: successMsg });
      setFormData(createDefaultFormData());
      setIdCardFile(null);
      setIsIdCardUploadMode(true);
    } catch (error) {
      console.error('Failed to save guest offline:', error);
      setSaveStatus({ type: 'error', message: 'Checkout unsuccessful: Local save failed (disk/database issue).' });
    }

    setIsSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitGuest();
  };

  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatDateValue = (value: string) => {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return format(parsed, 'PPP');
  };

  const handlePrintCheckInSheet = async () => {
    const printableIdSource = idCardFile
      ? await readFileAsDataUrl(idCardFile)
      : await resolveIdCardDataUrl(formData.idCardPath ?? formData.idPreview ?? null);

    const selectedRooms = formData.isGroupEntry
      ? formData.roomNumbers.filter((item) => item.trim().length > 0)
      : [formData.roomNumber];

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      setSaveStatus({ type: 'error', message: 'Unable to open print window. Please allow pop-ups and try again.' });
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Guest Check-in Print</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
            .sheet { width: 100%; min-height: 100%; border: 1px solid #d1d5db; border-radius: 10px; padding: 16px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 12px; }
            .title { font-size: 20px; font-weight: 800; margin: 0; }
            .subtitle { margin: 4px 0 0; color: #475569; font-size: 12px; }
            .meta { text-align: right; font-size: 12px; color: #475569; }
            .grid { display: grid; grid-template-columns: 1fr 220px; gap: 14px; }
            .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
            .field { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
            .label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
            .value { font-size: 13px; font-weight: 600; color: #0f172a; min-height: 16px; word-break: break-word; }
            .id-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; }
            .id-card-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
            .id-card-img { width: 100%; height: 260px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
            .id-placeholder { width: 100%; height: 260px; border-radius: 8px; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 12px; }
            .terms { margin-top: 14px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 12px; color: #334155; line-height: 1.5; }
            .signatures { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .sig-box { padding-top: 42px; border-top: 1px solid #334155; font-size: 12px; font-weight: 700; color: #0f172a; text-align: center; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <h1 class="title">Guest Check-in Sheet</h1>
                <p class="subtitle">Print copy for physical signature</p>
              </div>
              <div class="meta">
                <div>Printed: ${escapeHtml(format(new Date(), 'PPP p'))}</div>
                <div>Room(s): ${escapeHtml(selectedRooms.join(', ') || String(roomNumber))}</div>
              </div>
            </div>

            <div class="grid">
              <div class="field-grid">
                <div class="field"><span class="label">Guest Name</span><div class="value">${escapeHtml(formData.guestName || '-')}</div></div>
                <div class="field"><span class="label">Mobile Number</span><div class="value">${escapeHtml(formData.phone || '-')}</div></div>
                <div class="field"><span class="label">Nationality</span><div class="value">${escapeHtml(formData.nationality || '-')}</div></div>
                <div class="field"><span class="label">Total Guests</span><div class="value">${escapeHtml(formData.totalGuests || '1')}</div></div>
                <div class="field"><span class="label">Check-in</span><div class="value">${escapeHtml(`${formatDateValue(formData.checkInDate)} ${formData.checkInTime || ''}`.trim())}</div></div>
                <div class="field"><span class="label">Check-out</span><div class="value">${escapeHtml(`${formatDateValue(formData.checkOutDate)} ${formData.checkOutTime || ''}`.trim())}</div></div>
                <div class="field"><span class="label">Address</span><div class="value">${escapeHtml(formData.postalAddress || '-')}</div></div>
                <div class="field"><span class="label">Purpose of Visit</span><div class="value">${escapeHtml(formData.purposeOfVisit || '-')}</div></div>
              </div>

              <div class="id-card">
                <div class="id-card-label">ID Card / Document</div>
                ${printableIdSource
        ? `<img class="id-card-img" src="${escapeHtml(printableIdSource)}" alt="ID Card" />`
        : '<div class="id-placeholder">No ID image attached</div>'}
              </div>
            </div>

            <div class="terms">
              I confirm that the above information is accurate and agree to hotel policies and local regulations.
            </div>

            <div class="signatures">
              <div class="sig-box">Customer Signature</div>
              <div class="sig-box">Reception Signature</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 300);
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
                <label htmlFor="guestName" className="block text-sm font-bold text-slate-700 mb-1">Full Name (M/S/MR/MRS/MISS) <span className="text-rose-500">*</span></label>
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
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      setGuestHistoryList([]);
                    }}
                    required
                  />
                </div>
                {formData.phone.trim().length > 0 && formData.phone.trim().length < 4 ? (
                  <p className="mt-2 text-xs font-bold text-slate-500">Type at least 4 digits to see matching guest history.</p>
                ) : null}
                {isSearchingHistory ? (
                  <p className="mt-2 text-xs font-bold text-slate-500">Searching guest history...</p>
                ) : null}
                {guestHistoryList.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-800">
                      Matching guests for this phone number:
                    </p>
                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {guestHistoryList.map((guest) => (
                        <div key={guest.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-slate-800">{guest.guestName}</p>
                            <p className="text-[11px] font-medium text-slate-600">
                              Room {guest.roomNumber} • {guest.checkInDate} to {guest.checkOutDate}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void applyGuestHistory(guest)}
                            className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white hover:bg-amber-700"
                          >
                            Fill
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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

              {!formData.isGroupEntry ? (
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
                        roomNumbers: [e.target.value],
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
              ) : null}

              {formData.isGroupEntry && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="block text-xs font-bold text-slate-500">Assign Rooms For Group</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllGroupRooms}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 hover:bg-emerald-100"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearGroupRooms}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 hover:bg-slate-100"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
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
                      ? `Selected ${formData.roomNumbers.length} room(s): ${formData.roomNumbers.join(', ')}`
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
            <label className="block text-sm font-bold text-slate-700 mb-2">ID Card / Document <span className="text-rose-500">*</span></label>
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Upload ID document"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,application/pdf,.pdf"
            />

            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsIdCardActionOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsIdCardActionOpen(true);
                }
              }}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer"
            >
              {currentIdCardDisplaySrc ? (
                isPdfDocument ? (
                  <div className="h-40 w-full rounded-lg border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-700">
                    <FileText size={28} className="text-emerald-600 mb-2" />
                    <span className="text-sm font-black">PDF attached</span>
                    <span className="text-xs text-slate-500 mt-1">Click to replace with photo or file</span>
                  </div>
                ) : (
                  <img
                    src={currentIdCardDisplaySrc}
                    alt="ID Preview"
                    className="h-40 w-full object-cover rounded-lg shadow-md"
                    onError={() => {
                      setFormData((prev) => ({ ...prev, idPreview: null, idCardPath: null }));
                      setIdCardFile(null);
                      setIsIdCardUploadMode(true);
                    }}
                  />
                )
              ) : (
                <>
                  <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-emerald-600">
                    <Camera size={24} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Upload file or open camera</span>
                </>
              )}
            </div>

            {!currentIdCardDisplaySrc ? (
              <input
                type="text"
                value=""
                readOnly
                required
                aria-hidden="true"
                className="absolute pointer-events-none opacity-0 h-0 w-0"
              />
            ) : null}
          </section>
        </form>

        {isIdCardActionOpen ? (
          <div className="fixed inset-0 z-[121] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl space-y-3">
              <h3 className="text-base font-black text-slate-800">Add ID Card</h3>
              <p className="text-xs text-slate-500">Choose how you want to attach ID card.</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsIdCardActionOpen(false);
                    void openCamera();
                  }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
                >
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsIdCardActionOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100"
                >
                  Upload File (Image or PDF)
                </button>
                {currentIdCardDisplaySrc ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, idPreview: null, idCardPath: null }));
                      setIdCardFile(null);
                      setIsIdCardUploadMode(true);
                      setIsIdCardActionOpen(false);
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100"
                  >
                    Remove Current ID
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setIsIdCardActionOpen(false)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {isCameraOpen ? (
          <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl space-y-3">
              <h3 className="text-lg font-black text-slate-800">Capture ID Card</h3>
              <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full rounded-xl bg-black max-h-[60vh] object-contain" />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCameraOpen(false);
                    stopCameraStream();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Capture Photo
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Sticky Footer Button */}
        <div className="p-6 border-t bg-white sticky bottom-0">
          {saveStatus ? (
            <p className={`mb-3 rounded-xl px-4 py-2 text-sm font-bold ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {saveStatus.message}
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handlePrintCheckInSheet()}
              className="w-full py-4 bg-white text-emerald-800 border-2 border-emerald-700 rounded-2xl font-black text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Print Check-in Sheet
            </button>
            <button 
              type="button"
              onClick={() => void submitGuest()}
              disabled={isSaving}
              className="w-full py-4 bg-emerald-800 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-900 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? 'Saving...' : 'Check-in Guest'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}