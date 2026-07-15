'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/providers/ProfileProvider';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Car,
  CreditCard,
  Settings,
  Users,
  LogOut,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, logout } = useProfile();

  const isOwner = profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'staff';

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'] },
    { name: 'New Quotation', href: '/dashboard/quotations/new', icon: PlusCircle, roles: ['owner', 'admin', 'staff'] },
    { name: 'Quotations', href: '/dashboard/quotations', icon: FileText, roles: ['owner', 'admin', 'staff'] },
    { name: 'Vehicles', href: '/dashboard/vehicles', icon: Car, roles: ['owner', 'admin', 'staff'] },
    { name: 'Rate Cards', href: '/dashboard/rates', icon: CreditCard, roles: ['owner', 'admin'] },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['owner', 'admin'] },
    { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['owner'] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(profile?.role || '')
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-[#0a0a0b] text-zinc-300 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-black text-lg">
              T
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide text-sm">THENNAKOON</span>
              <span className="text-[10px] text-primary font-bold tracking-widest uppercase">TOURS</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-black font-semibold'
                    : 'hover:bg-zinc-800 hover:text-white text-zinc-400'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-black' : 'text-zinc-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                {profile?.full_name || 'Loading...'}
              </span>
              <span className="text-[11px] text-zinc-500 capitalize">
                {profile?.role || ''}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="flex w-full items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
