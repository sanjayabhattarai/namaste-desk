"use client";

export default function TopNav() {
  return (
    <nav className="bg-emerald-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg">
            <span className="text-emerald-900 font-black text-xl px-1">N</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Welcome to Namaste Desk</h1>
        </div>
      </div>
    </nav>
  );
}
