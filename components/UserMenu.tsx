"use client";

import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function UserMenu() {
  const { user, signOutUser } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!user) return null;

  const name = user.name ?? user.email ?? "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-hairline hover:border-cyan/50 px-2 py-1.5 transition-all duration-200 hover:shadow-glow-cyan"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="w-5 h-5 rounded-full bg-surfaceRaised text-[10px] flex items-center justify-center text-cyan font-mono">
            {initial}
          </span>
        )}
        <span className="text-xs font-mono text-muted max-w-[120px] truncate">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-hairline bg-surface/95 backdrop-blur-md shadow-glow-cyan overflow-hidden z-10">
          <button
            onClick={() => signOutUser()}
            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surfaceRaised hover:text-warn transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
