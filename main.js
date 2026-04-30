const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs'); 
const isDev = require('electron-is-dev');
const serve = require('electron-serve').default;
const loadURL = serve({ directory: 'out' });

// 1. Keep this for Development Mode
const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

// 2. Point to your CUSTOM generated folder
const clientPath = isDev 
  ? path.join(__dirname, 'generated', 'client')
  : path.join(process.resourcesPath, 'app.asar.unpacked', 'generated', 'client');

// 3. Load Prisma and the Adapter
const { PrismaClient } = require(clientPath);
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

// --- SECTION 4: THE SIMPLE PATH ---
// We go back to the basic way that worked for you
const dbDir = app.getPath('userData'); 
const dbPath = path.join(dbDir, 'namaste.db');
const prismaDbUrl = `file:${dbPath.split(path.sep).join('/')}`;

process.env.DATABASE_URL = prismaDbUrl;

// --- SECTION 5: THE SIMPLE PRISMA ---
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbPath })
  // We removed the __internal engine stuff that might be crashing it
});

const getFileExtensionFromMime = (mimeType, fallbackName = '') => {
  const normalizedMimeType = String(mimeType || '').toLowerCase();

  if (normalizedMimeType === 'image/jpeg') return '.jpg';
  if (normalizedMimeType === 'image/png') return '.png';
  if (normalizedMimeType === 'image/webp') return '.webp';
  if (normalizedMimeType === 'image/gif') return '.gif';

  const fallbackExt = path.extname(fallbackName || '').toLowerCase();
  if (fallbackExt) return fallbackExt;

  return '.jpg';
};

const getMimeTypeFromExtension = (filePath) => {
  const ext = path.extname(String(filePath || '')).toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.pdf') return 'application/pdf';

  return 'application/octet-stream';
};

const toLocalPathFromFileUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  if (/^file:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      let pathname = decodeURIComponent(parsed.pathname || '');

      if (/^\/[a-zA-Z]:\//.test(pathname)) {
        pathname = pathname.slice(1);
      }

      return pathname;
    } catch {
      return raw;
    }
  }

  return raw;
};

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
};

const mapRateCurrency = (currency) => {
  if (currency === 'US$') {
    return 'USD';
  }

  if (currency === 'INR') {
    return 'INR';
  }

  return 'NPR';
};

const toGuestSummary = (guest) => {
  if (!guest) {
    return null;
  }

  return {
    id: guest.id,
    owner_id: guest.owner_id,
    isGroupEntry: guest.isGroupEntry,
    roomNumber: guest.roomNumber,
    roomNumbers: guest.roomNumbers,
    guestName: guest.guestName,
    profession: guest.profession,
    postalAddress: guest.postalAddress,
    phone: guest.phone,
    email: guest.email,
    nationality: guest.nationality,
    passportNumber: guest.passportNumber,
    citizenshipNumber: guest.citizenshipNumber,
    entryPoint: guest.entryPoint,
    arrivedFrom: guest.arrivedFrom,
    departureTo: guest.departureTo,
    modeOfTravel: guest.modeOfTravel,
    purposeOfVisit: guest.purposeOfVisit,
    agentName: guest.agentName,
    remarks: guest.remarks,
    roomPrice: guest.roomPrice,
    rateCurrency: guest.rateCurrency,
    advancePaid: guest.advancePaid,
    totalGuests: guest.totalGuests,
    checkInDate: guest.checkInDate,
    checkOutDate: guest.checkOutDate,
    checkInTime: guest.checkInTime,
    checkOutTime: guest.checkOutTime,
    idPreview: guest.idPreview,
    idCardPath: guest.idCardPath,
    syncedToCloud: guest.syncedToCloud,
    createdAt: guest.createdAt,
    updatedAt: guest.updatedAt,
  };
};

const toRoomStatusSnapshot = (row) => ({
  id: row.id,
  owner_id: row.owner_id,
  roomNumber: row.roomNumber,
  currentGuestStayId: row.currentGuestStayId,
  currentGuestStay: toGuestSummary(row.currentGuestStay),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toBillRecord = (row) => ({
  id: (() => {
    const rawId = String(row.id || '');
    const separatorIndex = rawId.lastIndexOf(':');
    const legacyId = separatorIndex >= 0 ? rawId.slice(separatorIndex + 1) : rawId;
    const parsed = Number(legacyId);
    return Number.isFinite(parsed) ? parsed : 0;
  })(),
  roomNumber: Number(row.roomNumber),
  guestName: String(row.guestName || ''),
  phone: String(row.phone || ''),
  roomPrice: Number(row.roomPrice || 0),
  advancePaid: Number(row.advancePaid || 0),
  days: Number(row.days || 1),
  foodItems: Array.isArray(row.foodItems) ? row.foodItems : [],
  discount: Number(row.discount || 0),
  grandTotal: Number(row.grandTotal || 0),
  date: String(row.date || ''),
});

const toBillStorageId = (ownerId, billId) => `${ownerId}:${String(billId).trim()}`;

// 1. Add 'async' here
async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // Resolve the expected production index file in several common locations.
  const possibleProdIndexPaths = [
    path.join(__dirname, 'out', 'index.html'),
    path.join(process.resourcesPath, 'out', 'index.html'),
    path.join(app.getAppPath(), 'out', 'index.html'),
  ];

  const prodIndexPath = possibleProdIndexPaths.find((p) => fsSync.existsSync(p));

  // Priority: 1) Explicit ELECTRON_START_URL env (dev override)
  //           2) Packaged export (out/index.html served via electron-serve)
  //           3) Dev server (http://localhost:3000)
  try {
    if (process.env.ELECTRON_START_URL) {
      console.log('Loading from ELECTRON_START_URL:', process.env.ELECTRON_START_URL);
      await mainWindow.loadURL(process.env.ELECTRON_START_URL);
      return;
    }

    if (prodIndexPath) {
      console.log('Packaged export found, serving from:', prodIndexPath);
      await loadURL(mainWindow);
      return;
    }

    // Fallback to dev server if present (useful during development/testing)
    if (isDev) {
      console.log('Dev mode detected, loading dev server at:', devServerUrl);
      await mainWindow.loadURL(devServerUrl);
      return;
    }

    // Last resort: try to load the app:// handler (may still work)
    console.warn('No production export found and not in dev mode — attempting to serve via electron-serve.');
    await loadURL(mainWindow);
  } catch (err) {
    console.error('Failed to load renderer URL, attempting safe fallback:', err);
    // Try a direct file load as a final fallback
    try {
      const fallback = prodIndexPath || path.join(__dirname, 'out', 'index.html');
      if (fsSync.existsSync(fallback)) {
        await mainWindow.loadFile(fallback);
      } else {
        // Show a minimal error page so the window isn't white
        mainWindow.loadURL('data:text/html,<h1>Application failed to start</h1><p>See console for details.</p>');
      }
    } catch (e) {
      console.error('Final fallback failed:', e);
    }
  }
}
app.whenReady().then(async () => {
  // 1. Ensure the main Database Directory exists in AppData
  if (!fsSync.existsSync(dbDir)) {
    fsSync.mkdirSync(dbDir, { recursive: true });
    console.log("Main AppData directory created at:", dbDir);
  }

  // 2. Ensure the ID Cards Directory exists (Fixes ENOENT errors)
  const idCardsDir = path.join(dbDir, 'guest-id-cards');
  if (!fsSync.existsSync(idCardsDir)) {
    fsSync.mkdirSync(idCardsDir, { recursive: true });
    console.log("ID cards directory created at:", idCardsDir);
  }

  // 3. Database Initial Setup (Template Copying)
  if (!fsSync.existsSync(dbPath)) {
    console.log("Database not found. Copying template...");
    
    const templatePath = isDev 
      ? path.join(__dirname, 'prisma', 'dev.db')
      : path.join(process.resourcesPath, 'namaste-template.db');

    try {
      // This physically copies the file from your app bundle to the writable AppData folder
      fsSync.copyFileSync(templatePath, dbPath);
      console.log("Database template successfully copied to:", dbPath);
    } catch (err) {
      console.error("FATAL: Failed to copy database template:", err);
      // If this fails, the app will crash later because the DB is missing
    }
  }

  // 4. Connect Prisma and set SQLite optimizations
  try {
    await prisma.$connect();
    // Enable Foreign Keys for SQLite relationships
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    console.log("Prisma connected successfully to:", dbPath);
  } catch (e) {
    console.error("Prisma Connection Error:", e);
  }

  // 5. Finally, launch the window
 await createWindow();
});

ipcMain.handle('save-guest', async (_event, formData) => {
  const ownerId = String(formData?.owner_id ?? '').trim();

  if (!ownerId) {
    throw new Error('Missing owner_id for local guest save.');
  }

  const uniqueRoomNumbers = Array.from(new Set(
    (Array.isArray(formData?.roomNumbers) && formData.roomNumbers.length > 0)
      ? formData.roomNumbers.map((roomNumber) => String(roomNumber).trim()).filter(Boolean)
      : [String(formData?.roomNumber ?? '').trim()].filter(Boolean),
  ));

  const guestStayId = `${String(ownerId).replace(/[^a-zA-Z0-9_-]/g, '_')}-${String(Date.now())}`;

  let storedIdCardPath = null;
  const parsedDataUrl = parseDataUrl(formData?.idCardDataUrl);

  if (parsedDataUrl?.base64) {
    const userDataDir = app.getPath('userData');
    const idCardDir = path.join(userDataDir, 'guest-id-cards', ownerId);
    await fs.mkdir(idCardDir, { recursive: true });

    const fileExtension = getFileExtensionFromMime(parsedDataUrl.mimeType, formData?.idCardFileName);
    const fileName = `${guestStayId}${fileExtension}`;
    const absoluteFilePath = path.join(idCardDir, fileName);

    await fs.writeFile(absoluteFilePath, Buffer.from(parsedDataUrl.base64, 'base64'));
    storedIdCardPath = absoluteFilePath;
  } else {
    const existingIdCardPath = String(formData?.existingIdCardPath ?? '').trim();
    if (existingIdCardPath) {
      storedIdCardPath = existingIdCardPath;
    }
  }

  const createdGuestStay = await prisma.$transaction(async (tx) => {
    const guest = await tx.guestStay.create({
      data: {
        owner_id: ownerId,
        isGroupEntry: Boolean(formData?.isGroupEntry),
        roomNumber: String(formData?.roomNumber ?? ''),
        roomNumbers: uniqueRoomNumbers,
        guestName: String(formData?.guestName ?? ''),
        profession: formData?.profession || null,
        postalAddress: formData?.postalAddress || null,
        phone: String(formData?.phone ?? ''),
        email: formData?.email || null,
        nationality: String(formData?.nationality ?? ''),
        passportNumber: formData?.passportNumber || null,
        citizenshipNumber: formData?.citizenshipNumber || null,
        entryPoint: formData?.entryPoint || null,
        arrivedFrom: formData?.arrivedFrom || null,
        departureTo: formData?.departureTo || null,
        modeOfTravel: formData?.modeOfTravel || null,
        purposeOfVisit: formData?.purposeOfVisit || null,
        agentName: formData?.agentName || null,
        remarks: formData?.remarks || null,
        roomPrice: String(formData?.roomPrice ?? ''),
        rateCurrency: mapRateCurrency(formData?.rateCurrency),
        advancePaid: String(formData?.advancePaid ?? '0'),
        totalGuests: String(formData?.totalGuests ?? '1'),
        checkInDate: String(formData?.checkInDate ?? ''),
        checkOutDate: String(formData?.checkOutDate ?? ''),
        checkInTime: String(formData?.checkInTime ?? ''),
        checkOutTime: String(formData?.checkOutTime ?? ''),
        idPreview: storedIdCardPath,
        idCardPath: storedIdCardPath,
        syncedToCloud: false,
      },
    });

    await Promise.all(uniqueRoomNumbers.map((roomNumber) => tx.roomStatus.upsert({
      where: {
        owner_id_roomNumber: {
          owner_id: ownerId,
          roomNumber,
        },
      },
      create: {
        owner_id: ownerId,
        roomNumber,
        currentGuestStayId: guest.id,
      },
      update: {
        currentGuestStayId: guest.id,
      },
    })));

    return guest;
  });

  return { id: createdGuestStay.id, idCardPath: storedIdCardPath };
});

ipcMain.handle('search-guests', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();
  const phoneQuery = String(payload?.phone ?? '').trim();

  if (!ownerId || !phoneQuery) {
    return null;
  }

  const guest = await prisma.guestStay.findFirst({
    where: {
      owner_id: ownerId,
      phone: {
        contains: phoneQuery,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  });

  if (!guest) {
    return null;
  }

  return {
    id: guest.id,
    guestName: guest.guestName,
    nationality: guest.nationality,
    profession: guest.profession,
    postalAddress: guest.postalAddress,
    phone: guest.phone,
    owner_id: guest.owner_id,
    idPreview: guest.idPreview,
    idCardPath: guest.idCardPath,
  };
});

ipcMain.handle('search-guests-list', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();
  const query = String(payload?.query ?? '').trim();

  if (!ownerId || query.length < 1) {
    return [];
  }

  const normalizedQuery = query.toLowerCase();
  const normalizedPhoneQuery = query.replace(/[\s+\-()]/g, '').toLowerCase();

  const guests = await prisma.guestStay.findMany({
    where: {
      owner_id: ownerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 300,
  });

  const filteredGuests = guests
    .filter((guest) => {
      const guestName = String(guest.guestName || '').toLowerCase();
      const rawPhone = String(guest.phone || '').toLowerCase();
      const normalizedPhone = rawPhone.replace(/[\s+\-()]/g, '');

      return (
        guestName.includes(normalizedQuery)
        || rawPhone.includes(normalizedQuery)
        || normalizedPhone.includes(normalizedPhoneQuery)
      );
    })
    .slice(0, 25);

  return filteredGuests.map((guest) => ({
    id: guest.id,
    guestName: guest.guestName,
    phone: guest.phone,
    roomNumber: guest.roomNumber,
    nationality: guest.nationality,
    profession: guest.profession,
    postalAddress: guest.postalAddress,
    checkInDate: guest.checkInDate,
    checkOutDate: guest.checkOutDate,
    idCardPath: guest.idCardPath,
    idPreview: guest.idPreview,
    createdAt: guest.createdAt,
  }));
});

ipcMain.handle('read-id-card-data-url', async (_event, payload) => {
  const source = String(payload?.source ?? '').trim();

  if (!source) {
    return null;
  }

  if (/^data:/i.test(source)) {
    return source;
  }

  const localPath = toLocalPathFromFileUrl(source);

  try {
    const fileBuffer = await fs.readFile(localPath);
    const mimeType = getMimeTypeFromExtension(localPath);
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Failed to read ID card file for preview:', error);
    return null;
  }
});

ipcMain.handle('get-guest-stays', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();

  if (!ownerId) {
    return [];
  }

  const guests = await prisma.guestStay.findMany({
    where: {
      owner_id: ownerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return guests.map(toGuestSummary);
});

ipcMain.handle('get-room-statuses', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();

  if (!ownerId) {
    return [];
  }

  const roomStatuses = await prisma.roomStatus.findMany({
    where: {
      owner_id: ownerId,
    },
    include: {
      currentGuestStay: true,
    },
    orderBy: {
      roomNumber: 'asc',
    },
  });

  return roomStatuses.map(toRoomStatusSnapshot);
});

ipcMain.handle('release-room-status', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();
  const roomNumber = String(payload?.roomNumber ?? '').trim();

  if (!ownerId || !roomNumber) {
    return null;
  }

  const existing = await prisma.roomStatus.findUnique({
    where: {
      owner_id_roomNumber: {
        owner_id: ownerId,
        roomNumber,
      },
    },
    include: {
      currentGuestStay: true,
    },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.roomStatus.update({
    where: {
      owner_id_roomNumber: {
        owner_id: ownerId,
        roomNumber,
      },
    },
    data: {
      currentGuestStayId: null,
    },
    include: {
      currentGuestStay: true,
    },
  });

  return toRoomStatusSnapshot(updated);
});

ipcMain.handle('save-bill', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();
  const bill = payload?.bill;

  if (!ownerId || !bill) {
    return null;
  }

  const billId = String(bill.id ?? '').trim();
  if (!billId) {
    throw new Error('Missing bill id for local bill save.');
  }

  const storageId = toBillStorageId(ownerId, billId);

  const saved = await prisma.bill.upsert({
    where: { id: storageId },
    create: {
      id: storageId,
      owner_id: ownerId,
      roomNumber: Number(bill.roomNumber ?? 0),
      guestName: String(bill.guestName ?? ''),
      phone: String(bill.phone ?? ''),
      roomPrice: Number(bill.roomPrice ?? 0),
      advancePaid: Number(bill.advancePaid ?? 0),
      days: Number(bill.days ?? 1),
      foodItems: Array.isArray(bill.foodItems) ? bill.foodItems : [],
      discount: Number(bill.discount ?? 0),
      grandTotal: Number(bill.grandTotal ?? 0),
      date: String(bill.date ?? ''),
    },
    update: {
      owner_id: ownerId,
      roomNumber: Number(bill.roomNumber ?? 0),
      guestName: String(bill.guestName ?? ''),
      phone: String(bill.phone ?? ''),
      roomPrice: Number(bill.roomPrice ?? 0),
      advancePaid: Number(bill.advancePaid ?? 0),
      days: Number(bill.days ?? 1),
      foodItems: Array.isArray(bill.foodItems) ? bill.foodItems : [],
      discount: Number(bill.discount ?? 0),
      grandTotal: Number(bill.grandTotal ?? 0),
      date: String(bill.date ?? ''),
    },
  });

  return toBillRecord(saved);
});

ipcMain.handle('get-bills', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();

  if (!ownerId) {
    return [];
  }

  const bills = await prisma.bill.findMany({
    where: { owner_id: ownerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  return bills.map(toBillRecord);
});

ipcMain.handle('migrate-bills-to-sqlite', async (_event, payload) => {
  const ownerId = String(payload?.owner_id ?? '').trim();
  const bills = Array.isArray(payload?.bills) ? payload.bills : [];

  if (!ownerId || bills.length === 0) {
    return { importedCount: 0 };
  }

  let importedCount = 0;

  for (const bill of bills) {
    const billId = String(bill?.id ?? '').trim();
    if (!billId) {
      continue;
    }

    const storageId = toBillStorageId(ownerId, billId);

    await prisma.bill.upsert({
      where: { id: storageId },
      create: {
        id: storageId,
        owner_id: ownerId,
        roomNumber: Number(bill.roomNumber ?? 0),
        guestName: String(bill.guestName ?? ''),
        phone: String(bill.phone ?? ''),
        roomPrice: Number(bill.roomPrice ?? 0),
        advancePaid: Number(bill.advancePaid ?? 0),
        days: Number(bill.days ?? 1),
        foodItems: Array.isArray(bill.foodItems) ? bill.foodItems : [],
        discount: Number(bill.discount ?? 0),
        grandTotal: Number(bill.grandTotal ?? 0),
        date: String(bill.date ?? ''),
      },
      update: {
        owner_id: ownerId,
        roomNumber: Number(bill.roomNumber ?? 0),
        guestName: String(bill.guestName ?? ''),
        phone: String(bill.phone ?? ''),
        roomPrice: Number(bill.roomPrice ?? 0),
        advancePaid: Number(bill.advancePaid ?? 0),
        days: Number(bill.days ?? 1),
        foodItems: Array.isArray(bill.foodItems) ? bill.foodItems : [],
        discount: Number(bill.discount ?? 0),
        grandTotal: Number(bill.grandTotal ?? 0),
        date: String(bill.date ?? ''),
      },
    });

    importedCount += 1;
  }

  return { importedCount };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await prisma.$disconnect();
});