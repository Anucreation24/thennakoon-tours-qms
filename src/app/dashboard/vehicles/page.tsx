'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useProfile } from '@/providers/ProfileProvider';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit, Trash2, Archive, RotateCcw, Upload, X, Info, Car } from 'lucide-react';

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  registration_number: string;
  category: 'Car' | 'SUV' | 'Van' | 'Luxury' | 'Bus' | 'Other';
  image_url: string | null;
  daily_rate: number;
  refundable_deposit: number;
  allowed_km: number;
  extra_km_rate: number;
  status: 'Active' | 'Unavailable' | 'Under Maintenance' | 'Archived';
  internal_notes: string | null;
  created_at: string;
}

export default function VehiclesPage() {
  const { profile } = useProfile();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [category, setCategory] = useState<Vehicle['category']>('Car');
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [refundableDeposit, setRefundableDeposit] = useState<number>(0);
  const [allowedKm, setAllowedKm] = useState<number>(0);
  const [extraKmRate, setExtraKmRate] = useState<number>(0);
  const [status, setStatus] = useState<Vehicle['status']>('Active');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStaff = profile?.role === 'staff';
  const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';

  const fetchVehicles = async () => {
    setLoading(true);
    let query = supabase.from('vehicles').select('*');
    
    if (isStaff) {
      // Staff can only view active or available/maintenance vehicles, definitely not archived
      query = query.neq('status', 'Archived');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setVehicles(data as Vehicle[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, [profile]);

  const openAddModal = () => {
    setEditingVehicle(null);
    setName('');
    setBrand('');
    setModel('');
    setYear(new Date().getFullYear());
    setRegistrationNumber('');
    setCategory('Car');
    setDailyRate(0);
    setRefundableDeposit(0);
    setAllowedKm(0);
    setExtraKmRate(0);
    setStatus('Active');
    setInternalNotes('');
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setErrorMsg(null);
    setShowModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setName(vehicle.name);
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setYear(vehicle.year);
    setRegistrationNumber(vehicle.registration_number);
    setCategory(vehicle.category);
    setDailyRate(vehicle.daily_rate);
    setRefundableDeposit(vehicle.refundable_deposit);
    setAllowedKm(vehicle.allowed_km);
    setExtraKmRate(vehicle.extra_km_rate);
    setStatus(vehicle.status);
    setInternalNotes(vehicle.internal_notes || '');
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(vehicle.image_url);
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limit to 25MB
      if (file.size > 25 * 1024 * 1024) {
        alert('File size exceeds the 25MB limit.');
        return;
      }

      // Check format
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file format. Please upload JPG, PNG, or WEBP.');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const logActivity = async (action: string, entityId: string, summary: string) => {
    await supabase.from('quotation_activity_logs').insert({
      action,
      entity_type: 'vehicle',
      entity_id: entityId,
      user_id: profile?.id,
      change_summary: summary
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg(null);

    if (!name || !brand || !model || !registrationNumber || dailyRate < 0 || refundableDeposit < 0) {
      setErrorMsg('Please fill in all required fields and ensure numeric values are valid.');
      setFormLoading(false);
      return;
    }

    try {
      let finalImageUrl = existingImageUrl;

      // Handle Image Upload to Storage
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `vehicle_photos/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('vehicles')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw new Error('Image upload failed: ' + uploadError.message);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('vehicles')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const vehicleData = {
        name,
        brand,
        model,
        year,
        registration_number: registrationNumber,
        category,
        image_url: finalImageUrl,
        daily_rate: dailyRate,
        refundable_deposit: refundableDeposit,
        allowed_km: allowedKm,
        extra_km_rate: extraKmRate,
        status,
        internal_notes: internalNotes || null,
        updated_at: new Date().toISOString(),
      };

      if (editingVehicle) {
        // Update
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (error) {
          if (error.code === '23505') {
            throw new Error('A vehicle with this registration number already exists.');
          }
          throw error;
        }

        // Log edit
        await logActivity('Vehicle edited', editingVehicle.id, `Updated vehicle: ${brand} ${model} (${registrationNumber})`);
      } else {
        // Create
        const { data: newVeh, error } = await supabase
          .from('vehicles')
          .insert({
            ...vehicleData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('A vehicle with this registration number already exists.');
          }
          throw error;
        }

        // Log add
        if (newVeh) {
          await logActivity('Vehicle added', newVeh.id, `Added new vehicle: ${brand} ${model} (${registrationNumber})`);
        }
      }

      setShowModal(false);
      fetchVehicles();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the vehicle.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleArchiveStatus = async (vehicle: Vehicle, targetStatus: Vehicle['status']) => {
    const isArchive = targetStatus === 'Archived';
    const actionLabel = isArchive ? 'archive' : 'restore';
    
    if (confirm(`Are you sure you want to ${actionLabel} this vehicle?`)) {
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: targetStatus,
          archived_at: isArchive ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id);

      if (error) {
        alert(error.message);
      } else {
        await logActivity(
          isArchive ? 'Vehicle archived' : 'Vehicle restored',
          vehicle.id,
          `${isArchive ? 'Archived' : 'Restored'} vehicle: ${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})`
        );
        fetchVehicles();
      }
    }
  };

  const handleStatusChange = async (vehicleId: string, currentBrand: string, currentModel: string, currentReg: string, newStatus: Vehicle['status']) => {
    const { error } = await supabase
      .from('vehicles')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId);

    if (error) {
      alert(error.message);
    } else {
      await logActivity(
        'Status changed',
        vehicleId,
        `Changed status of ${currentBrand} ${currentModel} (${currentReg}) to ${newStatus}`
      );
      fetchVehicles();
    }
  };

  // Filter logic
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.registration_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Vehicles</h2>
          <p className="text-xs text-zinc-400">Manage vehicle details, daily rates, deposits and availability.</p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-500 transition-colors"
          >
            <Plus size={16} />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#151516] border border-zinc-800 rounded-2xl p-4">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, brand, plate..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Unavailable">Unavailable</option>
            <option value="Under Maintenance">Under Maintenance</option>
            {!isStaff && <option value="Archived">Archived</option>}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Categories</option>
            <option value="Car">Car</option>
            <option value="SUV">SUV</option>
            <option value="Van">Van</option>
            <option value="Luxury">Luxury</option>
            <option value="Bus">Bus</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-850 bg-zinc-900/10 p-12 text-center text-zinc-500">
          No vehicles found matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => (
            <div
              key={v.id}
              className={`bg-[#151516] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg flex flex-col transition-all ${
                v.status === 'Archived' ? 'opacity-50' : ''
              }`}
            >
              {/* Vehicle Photo */}
              <div className="h-44 w-full bg-zinc-950 relative flex items-center justify-center border-b border-zinc-800">
                {v.image_url ? (
                  <img
                    src={v.image_url}
                    alt={v.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-zinc-600 text-xs flex flex-col items-center gap-1">
                    <Car size={32} />
                    No Image Uploaded
                  </div>
                )}
                {/* Status Badge */}
                <span className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  v.status === 'Active'
                    ? 'bg-green-500/10 text-green-400'
                    : v.status === 'Under Maintenance'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : v.status === 'Unavailable'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {v.status}
                </span>
              </div>

              {/* Vehicle Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base tracking-wide truncate">{v.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-widest">{v.registration_number}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 capitalize">{v.brand} · {v.model} ({v.year})</p>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-zinc-850">
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Daily Rate</span>
                      <span className="text-sm font-bold text-primary">LKR {v.daily_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Deposit</span>
                      <span className="text-sm font-bold text-white">LKR {v.refundable_deposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Allowed KM</span>
                      <span className="text-xs font-semibold text-zinc-300">{v.allowed_km} km</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Extra KM Rate</span>
                      <span className="text-xs font-semibold text-zinc-300">LKR {v.extra_km_rate} / km</span>
                    </div>
                  </div>
                </div>

                {/* Operations */}
                {isOwnerOrAdmin && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-850">
                    <button
                      onClick={() => openEditModal(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 py-2 hover:bg-zinc-800 hover:text-white"
                    >
                      <Edit size={12} />
                      Edit
                    </button>
                    {v.status === 'Archived' ? (
                      <button
                        onClick={() => handleArchiveStatus(v, 'Active')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold py-2 hover:bg-green-500/20"
                      >
                        <RotateCcw size={12} />
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchiveStatus(v, 'Archived')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-550/10 text-red-400 text-xs font-semibold py-2 hover:bg-red-500/20"
                      >
                        <Archive size={12} />
                        Archive
                      </button>
                    )}
                    {/* Fast Status Change Dropdown */}
                    {v.status !== 'Archived' && (
                      <select
                        value={v.status}
                        onChange={(e) => handleStatusChange(v.id, v.brand, v.model, v.registration_number, e.target.value as any)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 py-2 px-1 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="Active">Active</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="Under Maintenance">Maintenance</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-[#151516] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h3 className="text-base font-bold text-white">{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 rounded-lg bg-red-950/20 border border-red-900/50 p-3 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Vehicle Display Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Toyota Axio Non-Hybrid"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="Car">Car</option>
                    <option value="SUV">SUV</option>
                    <option value="Van">Van</option>
                    <option value="Luxury">Luxury</option>
                    <option value="Bus">Bus</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {/* Brand */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Brand *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Toyota"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Model */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Model *</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Axio"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Registration Number */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="WP KV-2008"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Year */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Vehicle Year *</label>
                  <input
                    type="number"
                    required
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-850">
                {/* Daily Rate */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Daily Rate (LKR) *</label>
                  <input
                    type="number"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Refundable Deposit */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Refundable Deposit (LKR) *</label>
                  <input
                    type="number"
                    required
                    value={refundableDeposit}
                    onChange={(e) => setRefundableDeposit(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Allowed KM */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Allowed Kilometres (KM)</label>
                  <input
                    type="number"
                    required
                    value={allowedKm}
                    onChange={(e) => setAllowedKm(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Extra KM Rate */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Extra KM Rate (LKR)</label>
                  <input
                    type="number"
                    required
                    value={extraKmRate}
                    onChange={(e) => setExtraKmRate(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Status & Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-850">
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Unavailable">Unavailable</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Vehicle Image (Max 25MB)</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white"
                    >
                      <Upload size={16} />
                      Choose File
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {imageFile && <span className="text-xs text-zinc-400 truncate max-w-[200px]">{imageFile.name}</span>}
                  </div>
                </div>
              </div>

              {/* Preview image */}
              {(imagePreview || existingImageUrl) && (
                <div className="flex flex-col gap-2">
                  <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Image Preview</span>
                  <div className="relative w-36 h-24 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
                    <img
                      src={imagePreview || existingImageUrl!}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setExistingImageUrl(null);
                      }}
                      className="absolute top-1 right-1 rounded-full p-1 bg-black/80 text-zinc-400 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="pt-4 border-t border-zinc-850">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Internal Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notes visible only to staff/admins..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-zinc-850">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-black hover:bg-yellow-500 disabled:opacity-50"
                >
                  {formLoading ? <Loader2 size={16} className="animate-spin text-black" /> : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-sm font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
