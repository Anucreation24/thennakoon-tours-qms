'use client';

import React, { useState, useEffect } from 'react';
import { useProfile } from '@/providers/ProfileProvider';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Find page title based on path
  const getPageTitle = () => {
    if (pathname.includes('/quotations/new')) return 'New Quotation';
    if (pathname.includes('/quotations/edit')) return 'Edit Quotation';
    if (pathname.includes('/quotations')) return 'Quotations';
    if (pathname.includes('/vehicles')) return 'Vehicles';
    if (pathname.includes('/rates')) return 'Rate Cards';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.includes('/users')) return 'Users';
    return 'Dashboard';
  };

  useEffect(() => {
    // If auth loading is done and there's no profile, redirect to login
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0b] text-white">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
        </div>
        <p className="text-zinc-400 text-sm tracking-wider uppercase font-semibold">
          Thennakoon Tours
        </p>
      </div>
    );
  }

  if (!profile) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-zinc-100 flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Top Navbar */}
        <Header onMenuToggle={() => setSidebarOpen(true)} title={getPageTitle()} />

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
