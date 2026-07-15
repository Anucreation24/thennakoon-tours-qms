'use client';

import React, { useEffect, useState } from 'react';
import { useProfile } from '@/providers/ProfileProvider';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Edit, Save, X, History, User } from 'lucide-react';

interface VehicleRate {
  id: string;
  name: string;
  brand: string;
  model: string;
  daily_rate: number;
  refundable_deposit: number;
  allowed_km: number;
  extra_km_rate: number;
  status: string;
  updated_at: string;
}

interface RateHistory {
  id: string;
  daily_rate: number;
  refundable_deposit: number;
  allowed_km: number;
  extra_km_rate: number;
  status: string;
  updated_at: string;
  profiles: {
    full_name: string;
  } | null;
}

export default function RatesPage() {
  const { profile } = useProfile();
  const supabase = createClient();

  const [rates, setRates] = useState<VehicleRate[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit rates states
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [refundableDeposit, setRefundableDeposit] = useState<number>(0);
  const [allowedKm, setAllowedKm] = useState<number>(0);
  const [extraKmRate, setExtraKmRate] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // History states
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<VehicleRate | null>(null);
  const [historyList, setHistoryList] = useState<RateHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';

  const fetchRates = async () => {
    setLoading(true);
    // Fetch vehicles (excluding archived ones for Rate Cards display)
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .neq('status', 'Archived')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setRates(data as VehicleRate[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const startEditing = (vehicle: VehicleRate) => {
    setEditingVehicleId(vehicle.id);
    setDailyRate(vehicle.daily_rate);
    setRefundableDeposit(vehicle.refundable_deposit);
    setAllowedKm(vehicle.allowed_km);
    setExtraKmRate(vehicle.extra_km_rate);
  };

  const handleSaveRates = async (vehicleId: string, vehicleName: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          daily_rate: dailyRate,
          refundable_deposit: refundableDeposit,
          allowed_km: allowedKm,
          extra_km_rate: extraKmRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        alert(error.message);
      } else {
        // Log activity
        await supabase.from('quotation_activity_logs').insert({
          action: 'Rate updated',
          entity_type: 'rate',
          entity_id: vehicleId,
          user_id: profile?.id,
          change_summary: `Updated rates for ${vehicleName}: Daily LKR ${dailyRate.toLocaleString()}, Deposit LKR ${refundableDeposit.toLocaleString()}`
        });

        setEditingVehicleId(null);
        fetchRates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const fetchHistory = async (vehicle: VehicleRate) => {
    setSelectedVehicleHistory(vehicle);
    setLoadingHistory(true);
    
    const { data, error } = await supabase
      .from('vehicle_rate_cards')
      .select(`
        id,
        daily_rate,
        refundable_deposit,
        allowed_km,
        extra_km_rate,
        status,
        updated_at,
        profiles (
          full_name
        )
      `)
      .eq('vehicle_id', vehicle.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setHistoryList(data as any);
    }
    setLoadingHistory(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Rate Cards</h2>
        <p className="text-xs text-zinc-400">View and update daily rates, allowed mileage, and extra kilometre rates.</p>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rates Table */}
        <div className="lg:col-span-2 bg-[#151516] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="px-5 py-4">Vehicle</th>
                    <th className="px-5 py-4">Daily Rate</th>
                    <th className="px-5 py-4">Deposit</th>
                    <th className="px-5 py-4 text-center">Allowed KM</th>
                    <th className="px-5 py-4">Extra KM</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                  {rates.map((v) => {
                    const isEditing = editingVehicleId === v.id;
                    return (
                      <tr key={v.id} className="hover:bg-zinc-900/30">
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">{v.name}</div>
                          <div className="text-[10px] text-zinc-500 capitalize">{v.brand} · {v.model}</div>
                        </td>
                        
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={dailyRate}
                              onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white"
                            />
                          ) : (
                            <span className="font-semibold text-primary">LKR {v.daily_rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={refundableDeposit}
                              onChange={(e) => setRefundableDeposit(parseFloat(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white"
                            />
                          ) : (
                            <span className="text-zinc-400">LKR {v.refundable_deposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={allowedKm}
                              onChange={(e) => setAllowedKm(parseFloat(e.target.value) || 0)}
                              className="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white text-center"
                            />
                          ) : (
                            <span className="text-zinc-400 font-mono">{v.allowed_km} km</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={extraKmRate}
                              onChange={(e) => setExtraKmRate(parseFloat(e.target.value) || 0)}
                              className="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white"
                            />
                          ) : (
                            <span className="text-zinc-400">LKR {v.extra_km_rate} / km</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveRates(v.id, v.name)}
                                  disabled={saving}
                                  className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30"
                                >
                                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                </button>
                                <button
                                  onClick={() => setEditingVehicleId(null)}
                                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                {isOwnerOrAdmin && (
                                  <button
                                    onClick={() => startEditing(v)}
                                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                    title="Edit Rates"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => fetchHistory(v)}
                                  className={`p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white ${
                                    selectedVehicleHistory?.id === v.id ? 'bg-zinc-800 text-white' : ''
                                  }`}
                                  title="View Rate History"
                                >
                                  <History size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History Panel */}
        <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-[400px]">
          <h3 className="text-base font-bold text-white mb-4">Rate Cards History</h3>
          
          {!selectedVehicleHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 text-xs py-8">
              <History className="h-8 w-8 mb-2 opacity-30" />
              Select a vehicle to view its rate adjustment logs.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="border-b border-zinc-800 pb-2">
                <h4 className="font-bold text-white text-sm">{selectedVehicleHistory.name}</h4>
                <p className="text-[10px] text-zinc-500">History of rate adjustments</p>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : historyList.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No historical entries found. Rates are at default.</p>
              ) : (
                <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-5">
                  {historyList.map((entry) => (
                    <div key={entry.id} className="relative space-y-1 text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      
                      <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span>{new Date(entry.updated_at).toLocaleString()}</span>
                      </div>
                      
                      <div className="font-semibold text-zinc-300">
                        Daily: LKR {entry.daily_rate.toLocaleString()} · Deposit: LKR {entry.refundable_deposit.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Allowed KM: {entry.allowed_km} km · Extra: LKR {entry.extra_km_rate} / km
                      </div>

                      {entry.profiles && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <User size={10} />
                          <span>By: {entry.profiles.full_name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
