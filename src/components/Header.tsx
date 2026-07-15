'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useProfile } from '@/providers/ProfileProvider';

interface HeaderProps {
  onMenuToggle: () => void;
  title: string;
}

export default function Header({ onMenuToggle, title }: HeaderProps) {
  const { profile } = useProfile();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-[#0f0f10]/80 backdrop-blur-md px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-white tracking-wide">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info Badge */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="text-xs font-semibold text-zinc-200">{profile?.full_name}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{profile?.role}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm text-primary border border-zinc-700">
          {profile?.full_name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
