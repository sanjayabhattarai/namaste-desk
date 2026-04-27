# 🏨 Namaste Desk

**Namaste Desk** is a professional, desktop-first Hotel Management System (PMS) designed for small to mid-sized hotels. It combines the reliability of a **local-first desktop application** with the management power of a **cloud-based SaaS**.

By leveraging **Electron**, **Next.js**, and **SQLite**, Namaste Desk ensures that guest operations never stop, even during internet outages, while providing hotel owners with centralized control via **Supabase**.

---

## Key Features

* **Offline-Ready Operations:** Guest check-ins, ID card storage, and billing work 100% offline.
* **Visual Room Timeline:** Interactive calendar-style dashboard for managing room occupancy and stays.
* **Privacy-First Guest Records:** Sensitive guest data and ID card captures are stored locally on the device, never sent to the cloud.
* **Smart History Autofill:** Instant retrieval of returning guest details from local SQLite via phone number lookup.
* **Hybrid Cloud Management:** Owner profiles, room masters, and subscription approvals are managed securely via Supabase.
* **Integrated Billing:** Localized billing system with thermal print-ready receipts and automated record-keeping.

---

## 🏗️ Architecture & Data Flow

Namaste Desk uses a sophisticated multi-layer storage strategy to balance performance, privacy, and control:

| Data Type | Storage Location | Sync Strategy |
| :--- | :--- | :--- |
| **Owner Auth & Profile** | Supabase Cloud | Real-time Cloud |
| **Room Master Config** | Supabase Cloud | Fetched at Login |
| **Guest Records (PII)** | Local SQLite (Prisma) | **Device Only** |
| **ID Card Documents** | Local Filesystem | **Device Only** |
| **Billing & Receipts** | Local SQLite (Prisma) | **Device Only** |


---

## 🛠️ Tech Stack

* **App Shell:** Electron 41 (Desktop Runtime)
* **Frontend:** Next.js 16 (App Router) + React 19
* **Styling:** Tailwind CSS v4
* **Local Database:** SQLite + Prisma ORM (via `better-sqlite3`)
* **Cloud Backend:** Supabase (Auth + PostgreSQL)
* **Icons/UI:** Lucide React + Radix UI

---

## ⚙️ Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-profile/namaste-desk.git
   cd namaste-desk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL="file:./prisma/dev.db"
   ```

4. **Initialize Local Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

## 💻 Development Scripts

* `npm run dev:desktop` – **Recommended:** Launches Electron and Next.js concurrently.
* `npm run dev` – Runs the Next.js frontend in the browser (limited hardware access).
* `npm run rebuild:electron` – Rebuilds native `better-sqlite3` bindings for your OS.
* `npm run lint` – Runs ESLint to check for code quality issues.

---

## ⚖️ License

Private / Proprietary. All rights reserved.

