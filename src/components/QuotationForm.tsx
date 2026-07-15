'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useProfile } from '@/providers/ProfileProvider';
import { Loader2, Save, ArrowLeft, Plus, Trash2, Calendar, FileText, Info } from 'lucide-react';
import { differenceInDays, addHours, format } from 'date-fns';

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  registration_number: string;
  category: string;
  image_url: string | null;
  daily_rate: number;
  refundable_deposit: number;
  allowed_km: number;
  extra_km_rate: number;
}

interface StaffProfile {
  id: string;
  full_name: string;
  role: string;
}

interface QuotationFormProps {
  quotationId?: string; // If editing
}

export default function QuotationForm({ quotationId }: QuotationFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  // Default snapshots loaded from settings
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [quotationSettings, setQuotationSettings] = useState<any>(null);
  const [qrSettings, setQrSettings] = useState<any>(null);

  // Section A - Quotation Details
  const [quotationNumber, setQuotationNumber] = useState('');
  const [manualQuoteNumber, setManualQuoteNumber] = useState(false);
  const [quotationDate, setQuotationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [validityHours, setValidityHours] = useState(24);
  const [status, setStatus] = useState<'Draft' | 'Generated'>('Draft');

  // Section B - Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerReference, setCustomerReference] = useState('');

  // Section C - Rental Details
  const [rentalStartDate, setRentalStartDate] = useState('');
  const [rentalEndDate, setRentalEndDate] = useState('');
  const [rentalDays, setRentalDays] = useState<number>(0);
  const [manualRentalDays, setManualRentalDays] = useState(false);
  const [destination, setDestination] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [tripNotes, setTripNotes] = useState('');

  // Section D - Vehicle Selection
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Section E - Pricing & Calculations
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [refundableDeposit, setRefundableDeposit] = useState<number>(0);
  const [allowedKm, setAllowedKm] = useState<number>(0);
  const [extraKmRate, setExtraKmRate] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);

  // Section F - Notes
  const [specialNotes, setSpecialNotes] = useState<string[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [importantNotes, setImportantNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // Section G - Staff
  const [preparedBy, setPreparedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';
  const isEditing = !!quotationId;

  // Load initial settings and lists
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Fetch active vehicles
        const { data: vehData } = await supabase
          .from('vehicles')
          .select('*')
          .eq('status', 'Active');
        setVehicles(vehData || []);

        // Fetch staff profiles for dropdown
        const { data: staffData } = await supabase
          .from('profiles')
          .select('id, full_name, role');
        setStaffList(staffData || []);

        // Load Settings rows
        const [compRes, quotRes, qrRes] = await Promise.all([
          supabase.from('company_settings').select('*').limit(1).single(),
          supabase.from('quotation_settings').select('*').limit(1).single(),
          supabase.from('qr_settings').select('*').limit(1).single()
        ]);

        if (!compRes.error) setCompanySettings(compRes.data);
        if (!quotRes.error) {
          setQuotationSettings(quotRes.data);
          setTaxPercentage(parseFloat(quotRes.data.default_tax_percentage) || 0);
          setValidityHours(quotRes.data.default_validity_hours || 24);
          setImportantNotes(quotRes.data.bank_payment_instructions || '');
          setSpecialNotes(quotRes.data.default_special_notes || []);
        }
        if (!qrRes.error) setQrSettings(qrRes.data);

        // Default Prepared By
        if (profile) {
          setPreparedBy(profile.id);
        }

        // If editing, load the existing quotation
        if (isEditing) {
          const { data: qData, error } = await supabase
            .from('quotations')
            .select('*')
            .eq('id', quotationId)
            .single();

          if (error) {
            alert('Quotation not found.');
            router.push('/dashboard/quotations');
            return;
          }

          // Populate fields from qData
          setQuotationNumber(qData.quotation_number);
          setQuotationDate(qData.quotation_date);
          setStatus(qData.status);
          
          // Customer
          setCustomerName(qData.customer_name);
          setCustomerPhone(qData.customer_phone || '');
          setCustomerEmail(qData.customer_email || '');
          setCustomerAddress(qData.customer_address || '');
          setCustomerCompany(qData.company_name || '');
          setCustomerReference(qData.customer_reference || '');

          // Rental
          setRentalStartDate(qData.rental_start_date || '');
          setRentalEndDate(qData.rental_end_date || '');
          setRentalDays(qData.rental_days || 0);
          setManualRentalDays(true); // Treat as manual once loaded
          setDestination(qData.destination || '');
          setPickupLocation(qData.pickup_location || '');
          setDropoffLocation(qData.dropoff_location || '');
          setTripNotes(qData.internal_notes || '');

          // Vehicle
          setSelectedVehicleId(qData.vehicle_id || '');
          setDailyRate(Number(qData.daily_rate));
          setRefundableDeposit(Number(qData.refundable_deposit));
          setAllowedKm(Number(qData.allowed_km));
          setExtraKmRate(Number(qData.extra_km_rate));
          setAdditionalCharges(Number(qData.additional_charges));
          setDiscount(Number(qData.discount));
          
          // Calculate tax percentage based on tax amount and rental total
          const rentTotal = Number(qData.rental_total);
          if (rentTotal > 0) {
            setTaxPercentage(Math.round((Number(qData.tax_amount) / rentTotal) * 100));
          }

          // Notes
          setSpecialNotes(qData.special_notes || []);
          setImportantNotes(qData.important_notes || '');
          setTermsAndConditions(qData.terms_and_conditions || '');

          // Staff
          setPreparedBy(qData.prepared_by || '');
          setApprovedBy(qData.approved_by || '');
          setInternalNotes(qData.internal_notes || '');
          
          // Setup selected vehicle representation
          if (qData.vehicle_snapshot) {
            setSelectedVehicle(qData.vehicle_snapshot as Vehicle);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [quotationId, profile]);

  // Handle Vehicle change
  useEffect(() => {
    if (selectedVehicleId) {
      const v = vehicles.find((veh) => veh.id === selectedVehicleId);
      if (v) {
        setSelectedVehicle(v);
        // Autofill rates
        setDailyRate(Number(v.daily_rate));
        setRefundableDeposit(Number(v.refundable_deposit));
        setAllowedKm(Number(v.allowed_km));
        setExtraKmRate(Number(v.extra_km_rate));
      }
    } else {
      setSelectedVehicle(null);
    }
  }, [selectedVehicleId, vehicles]);

  // Calculate rental days from start and end dates
  useEffect(() => {
    if (rentalStartDate && rentalEndDate && !manualRentalDays) {
      const start = new Date(rentalStartDate);
      const end = new Date(rentalEndDate);
      // diff in days + 1 (since rental includes start and end day)
      const days = differenceInDays(end, start) + 1;
      setRentalDays(days > 0 ? days : 0);
    }
  }, [rentalStartDate, rentalEndDate, manualRentalDays]);

  // Calculations
  const rentalTotal = dailyRate * rentalDays;
  const subtotal = rentalTotal + refundableDeposit + additionalCharges;
  const taxAmount = (rentalTotal * taxPercentage) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);

  const handleAddSpecialNote = () => {
    if (newNoteText.trim()) {
      setSpecialNotes([...specialNotes, newNoteText.trim()]);
      setNewNoteText('');
    }
  };

  const handleRemoveSpecialNote = (idx: number) => {
    setSpecialNotes(specialNotes.filter((_, i) => i !== idx));
  };

  const handleSaveQuotation = async () => {
    if (!customerName) {
      alert('Customer Name is required.');
      return;
    }

    setSaving(true);
    try {
      const qDateObj = new Date(quotationDate);
      const validUntilObj = addHours(qDateObj, validityHours);

      // Create snapshots
      const vehicleSnapshotVal = selectedVehicle ? {
        id: selectedVehicle.id,
        name: selectedVehicle.name,
        brand: selectedVehicle.brand,
        model: selectedVehicle.model,
        year: selectedVehicle.year,
        registration_number: selectedVehicle.registration_number,
        image_url: selectedVehicle.image_url,
        daily_rate: selectedVehicle.daily_rate,
        refundable_deposit: selectedVehicle.refundable_deposit,
        allowed_km: selectedVehicle.allowed_km,
        extra_km_rate: selectedVehicle.extra_km_rate,
      } : {};

      const companySnapshotVal = companySettings ? {
        company_name: companySettings.company_name,
        registration_number: companySettings.registration_number,
        address: companySettings.address,
        phone_numbers: companySettings.phone_numbers,
        email: companySettings.email,
        website: companySettings.website,
      } : {};

      const bankSnapshotVal = quotationSettings ? {
        bank_account_name: quotationSettings.bank_account_name,
        bank_account_number: quotationSettings.bank_account_number,
        bank_name: quotationSettings.bank_name,
        bank_branch: quotationSettings.bank_branch,
        bank_swift_code: quotationSettings.bank_swift_code,
        bank_payment_instructions: quotationSettings.bank_payment_instructions,
      } : {};

      const qrSnapshotVal = qrSettings ? {
        qr_image_url: qrSettings.qr_image_url,
        enabled: qrSettings.enabled && quotationSettings?.show_qr_code,
        label: qrSettings.label,
        purpose: qrSettings.purpose,
      } : {};

      let finalQuotationNumber = quotationNumber;
      let sequence = 0;
      const yearVal = qDateObj.getFullYear();

      if (!isEditing) {
        if (!manualQuoteNumber || !quotationNumber) {
          // Safe Database Level Auto-numbering
          const { data: seqData, error: seqError } = await supabase.rpc(
            'generate_next_quotation_number',
            { target_year: yearVal }
          );

          if (seqError) throw seqError;

          finalQuotationNumber = seqData.quotation_number;
          sequence = seqData.sequence;
        } else {
          // Manual input: verify uniqueness
          const { data: exists } = await supabase
            .from('quotations')
            .select('id')
            .eq('quotation_number', quotationNumber)
            .limit(1);

          if (exists && exists.length > 0) {
            throw new Error('This quotation number already exists. Please choose another.');
          }
        }
      }

      const quotationData = {
        quotation_number: finalQuotationNumber,
        quotation_year: yearVal,
        quotation_sequence: sequence || undefined,
        status,
        quotation_date: quotationDate,
        valid_until: validUntilObj.toISOString(),
        
        // Customer
        customer_name: customerName,
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,
        customer_address: customerAddress || null,
        company_name: customerCompany || null,
        customer_reference: customerReference || null,

        // Rental
        rental_start_date: rentalStartDate || null,
        rental_end_date: rentalEndDate || null,
        rental_days: rentalDays,
        destination: destination || null,
        pickup_location: pickupLocation || null,
        dropoff_location: dropoffLocation || null,

        // Rates
        vehicle_id: selectedVehicleId || null,
        vehicle_snapshot: vehicleSnapshotVal,
        daily_rate: dailyRate,
        refundable_deposit: refundableDeposit,
        allowed_km: allowedKm,
        extra_km_rate: extraKmRate,

        // Pricing
        rental_total: rentalTotal,
        additional_charges: additionalCharges,
        discount: discount,
        tax_amount: taxAmount,
        grand_total: grandTotal,

        // Notes
        special_notes: specialNotes,
        important_notes: importantNotes,
        terms_and_conditions: termsAndConditions,

        // Snapshots
        company_snapshot: companySnapshotVal,
        bank_snapshot: bankSnapshotVal,
        qr_snapshot: qrSnapshotVal,

        // Staff
        prepared_by: preparedBy || null,
        approved_by: approvedBy || null,
        internal_notes: internalNotes || null,
        
        // Updated info
        updated_by: profile?.id,
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        const { error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', quotationId);

        if (error) throw error;

        // Log edit
        await supabase.from('quotation_activity_logs').insert({
          action: 'Quotation edited',
          entity_type: 'quotation',
          entity_id: quotationId,
          user_id: profile?.id,
          change_summary: `Edited quotation ${finalQuotationNumber} for customer ${customerName}`
        });

      } else {
        const { data: newQ, error } = await supabase
          .from('quotations')
          .insert({
            ...quotationData,
            created_by: profile?.id
          })
          .select()
          .single();

        if (error) throw error;

        // Log create
        if (newQ) {
          await supabase.from('quotation_activity_logs').insert({
            action: 'Quotation created',
            entity_type: 'quotation',
            entity_id: newQ.id,
            user_id: profile?.id,
            change_summary: `Created quotation ${finalQuotationNumber} for customer ${customerName}`
          });
        }
      }

      router.push('/dashboard/quotations');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred while saving the quotation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top action row */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleSaveQuotation}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-black hover:bg-yellow-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin text-black" /> : <Save size={14} />}
            {isEditing ? 'Update Quotation' : 'Save Quotation'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Form Fields (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section A: Details */}
          <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Section A – Quotation Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quotation Number</label>
                  {isOwnerOrAdmin && !isEditing && (
                    <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualQuoteNumber}
                        onChange={(e) => setManualQuoteNumber(e.target.checked)}
                        className="rounded bg-zinc-950 border-zinc-800 text-primary focus:ring-primary"
                      />
                      Manual Override
                    </label>
                  )}
                </div>
                <input
                  type="text"
                  disabled={!manualQuoteNumber || isEditing}
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  placeholder={manualQuoteNumber ? "e.g. QT-2026-9999" : "Automatically Generated"}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Quotation Date</label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Validity Period (Hours)</label>
                <input
                  type="number"
                  value={validityHours}
                  onChange={(e) => setValidityHours(parseInt(e.target.value) || 24)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="Draft">Draft</option>
                  <option value="Generated">Generated (Final)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section B: Customer Details */}
          <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Section B – Customer Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +94 77 123 4567"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. 123 Main St, Colombo"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Customer Reference</label>
                <input
                  type="text"
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                  placeholder="e.g. Ref #9988"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section C: Rental Details */}
          <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              Section C – Rental Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Rental Start Date</label>
                <input
                  type="date"
                  value={rentalStartDate}
                  onChange={(e) => setRentalStartDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Rental End Date</label>
                <input
                  type="date"
                  value={rentalEndDate}
                  onChange={(e) => setRentalEndDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Number of Rental Days</label>
                  <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualRentalDays}
                      onChange={(e) => setManualRentalDays(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800 text-primary"
                    />
                    Manual Override
                  </label>
                </div>
                <input
                  type="number"
                  disabled={!manualRentalDays}
                  value={rentalDays}
                  onChange={(e) => setRentalDays(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Galle, Kandy"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Pickup Location</label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="e.g. Nugegoda Office"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Drop-off Location</label>
                <input
                  type="text"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  placeholder="e.g. Colombo Airport"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section D: Vehicle */}
          <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus size={16} className="text-primary" />
              Section D – Vehicle Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Select Vehicle</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose active vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registration_number})
                    </option>
                  ))}
                </select>
              </div>

              {selectedVehicle && (
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-zinc-950/40 rounded-xl border border-zinc-850">
                  {selectedVehicle.image_url ? (
                    <div className="w-full sm:w-32 h-20 bg-zinc-950 rounded-lg overflow-hidden shrink-0 border border-zinc-800">
                      <img src={selectedVehicle.image_url} alt={selectedVehicle.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full sm:w-32 h-20 bg-zinc-950 rounded-lg flex items-center justify-center text-zinc-700 text-xs shrink-0 border border-zinc-800">
                      No Photo
                    </div>
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">{selectedVehicle.name}</h4>
                    <p className="text-xs text-zinc-400">Category: {selectedVehicle.category} · Year: {selectedVehicle.year}</p>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-wider">Plate: {selectedVehicle.registration_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section F: Notes */}
          <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Section F – Special & Important Notes
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Special Notes (Add itemized terms)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add special term..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialNote}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-500"
                  >
                    Add
                  </button>
                </div>
                
                <div className="space-y-2 mt-3">
                  {specialNotes.map((note, index) => (
                    <div key={index} className="flex justify-between items-start gap-2 p-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs">
                      <span className="text-zinc-300">{note}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialNote(index)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Important Notes (Payment info)</label>
                <textarea
                  value={importantNotes}
                  onChange={(e) => setImportantNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Terms and Conditions</label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Terms & Conditions (optional)..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section G: Staff */}
          <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Info size={16} className="text-primary" />
              Section G – Staff & Internal Notes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Prepared By</label>
                <select
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="">-- Choose user --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Approved By</label>
                <select
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="">-- Choose Approver (Owner/Admin) --</option>
                  {staffList
                    .filter((s) => s.role === 'owner' || s.role === 'admin')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Internal Notes (Visible only to staff)</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Pricing Panel (Right column - sticky) */}
        <div className="sticky top-20 bg-[#151516] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Info size={16} className="text-primary" />
            Section E – Pricing & Totals
          </h3>

          <div className="space-y-4 text-xs">
            {/* Daily Rate Override */}
            <div>
              <label className="block text-zinc-500 mb-1">Daily Rate (LKR)</label>
              <input
                type="number"
                value={dailyRate}
                onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Refundable Deposit Override */}
            <div>
              <label className="block text-zinc-500 mb-1">Refundable Deposit (LKR)</label>
              <input
                type="number"
                value={refundableDeposit}
                onChange={(e) => setRefundableDeposit(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Allowed KM */}
            <div>
              <label className="block text-zinc-500 mb-1">Allowed KM</label>
              <input
                type="number"
                value={allowedKm}
                onChange={(e) => setAllowedKm(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Extra KM Rate */}
            <div>
              <label className="block text-zinc-500 mb-1">Extra KM Rate (LKR)</label>
              <input
                type="number"
                value={extraKmRate}
                onChange={(e) => setExtraKmRate(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Additional Charges */}
            <div>
              <label className="block text-zinc-500 mb-1">Additional Charges (LKR)</label>
              <input
                type="number"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-zinc-500 mb-1">Discount (LKR)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Tax Percentage */}
            <div>
              <label className="block text-zinc-500 mb-1">Tax Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Display calculations */}
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <div className="flex justify-between text-zinc-400">
                <span>Rental Total (Daily * Days):</span>
                <span>LKR {rentalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Refundable Deposit:</span>
                <span>LKR {refundableDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Tax amount:</span>
                <span>LKR {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Discount:</span>
                <span className="text-red-400">- LKR {discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-sm font-bold text-white">
                <span>Grand Total:</span>
                <span className="text-primary text-base">LKR {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={handleSaveQuotation}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-black hover:bg-yellow-500 disabled:opacity-50 mt-4"
            >
              {saving ? <Loader2 size={16} className="animate-spin text-black" /> : <Save size={16} />}
              {isEditing ? 'Update Quotation' : 'Save Quotation'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
