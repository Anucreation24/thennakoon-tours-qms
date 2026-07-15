'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/providers/ProfileProvider';
import { createClient } from '@/utils/supabase/client';
import { Loader2, FileText, Car, CheckSquare, Layers, TrendingUp, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  createdToday: number;
  createdThisMonth: number;
  totalActiveVehicles: number;
  totalDrafts: number;
  totalGenerated: number;
}

interface RecentQuotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  quotation_date: string;
  grand_total: number;
  status: string;
  vehicle_snapshot: {
    name: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    createdToday: 0,
    createdThisMonth: 0,
    totalActiveVehicles: 0,
    totalDrafts: 0,
    totalGenerated: 0
  });
  const [recentQuotes, setRecentQuotes] = useState<RecentQuotation[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Start of month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

      // Run parallel counts
      const [
        todayRes,
        monthRes,
        vehiclesRes,
        draftsRes,
        generatedRes,
        recentQuotesRes
      ] = await Promise.all([
        // Today's quotes
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('quotation_date', todayStr),
        // This month's quotes
        supabase.from('quotations').select('id', { count: 'exact', head: true }).gte('quotation_date', startOfMonth),
        // Active vehicles
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
        // Draft quotations
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('status', 'Draft'),
        // Generated quotations
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('status', 'Generated'),
        // Recent 5 quotations
        supabase.from('quotations').select('id, quotation_number, customer_name, quotation_date, grand_total, status, vehicle_snapshot').order('created_at', { ascending: false }).limit(5)
      ]);

      setStats({
        createdToday: todayRes.count || 0,
        createdThisMonth: monthRes.count || 0,
        totalActiveVehicles: vehiclesRes.count || 0,
        totalDrafts: draftsRes.count || 0,
        totalGenerated: generatedRes.count || 0
      });

      setRecentQuotes((recentQuotesRes.data as any) || []);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { name: 'Quotations Created Today', value: stats.createdToday, icon: FileText, color: 'text-primary' },
    { name: 'Quotations This Month', value: stats.createdThisMonth, icon: TrendingUp, color: 'text-green-400' },
    { name: 'Active Vehicles', value: stats.totalActiveVehicles, icon: Car, color: 'text-blue-400' },
    { name: 'Draft Quotations', value: stats.totalDrafts, icon: Layers, color: 'text-zinc-400' },
    { name: 'Generated Quotations', value: stats.totalGenerated, icon: CheckSquare, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h2 className="text-xl font-bold text-white">Welcome back, {profile?.full_name}!</h2>
        <p className="text-xs text-zinc-400">Here is the quick overview for Thennakoon Tours today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="bg-[#151516] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider max-w-[120px]">{card.name}</span>
                <Icon size={18} className={card.color} />
              </div>
              <span className="text-2xl font-bold text-white tracking-wide">{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* Recent Activity / Recent Quotations */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Recent Quotations</h3>
            <Link
              href="/dashboard/quotations"
              className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
            >
              View All
              <ArrowRight size={12} />
            </Link>
          </div>

          {recentQuotes.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              No quotations created yet. Click "New Quotation" to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Quotation #</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-sm text-zinc-300">
                  {recentQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-zinc-900/30">
                      <td className="py-3.5 px-4 font-bold text-white">{q.quotation_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{q.customer_name}</td>
                      <td className="py-3.5 px-4 text-zinc-400">{q.vehicle_snapshot?.name || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-zinc-500">{new Date(q.quotation_date).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-bold text-primary">
                        LKR {q.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          q.status === 'Accepted'
                            ? 'bg-green-500/10 text-green-400'
                            : q.status === 'Draft'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/dashboard/quotations`}
                          className="inline-flex justify-center rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 text-xs font-semibold"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
