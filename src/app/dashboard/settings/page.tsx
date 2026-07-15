'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useProfile } from '@/providers/ProfileProvider';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Upload, Trash2, CheckCircle2, AlertTriangle, Building, Landmark, QrCode, Sliders, FileText } from 'lucide-react';

interface CompanySettings {
  company_name: string;
  registration_number: string;
  address: string;
  phone_numbers: string;
  email: string;
  website: string;
  letterhead_image_url: string | null;
  letterhead_enabled: boolean;
}

interface QuotationSettings {
  heading: string;
  prefix: string;
  default_validity_hours: number;
  default_currency: string;
  default_tax_percentage: number;
  show_vehicle_image: boolean;
  show_qr_code: boolean;
  show_signature: boolean;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  bank_branch: string;
  bank_swift_code: string;
  bank_payment_instructions: string;
  default_special_notes: string[];
}

interface QrSettings {
  qr_image_url: string | null;
  enabled: boolean;
  label: string;
  purpose: 'Bank Payment' | 'Website' | 'WhatsApp' | 'Google Review' | 'Custom';
}

export default function SettingsPage() {
  const { profile } = useProfile();
  const supabase = createClient();
  const letterheadRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'company' | 'pdf' | 'bank' | 'notes' | 'qr'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for Settings Data
  const [company, setCompany] = useState<CompanySettings>({
    company_name: '',
    registration_number: '',
    address: '',
    phone_numbers: '',
    email: '',
    website: '',
    letterhead_image_url: null,
    letterhead_enabled: true
  });

  const [quotation, setQuotation] = useState<QuotationSettings>({
    heading: '',
    prefix: '',
    default_validity_hours: 24,
    default_currency: 'LKR',
    default_tax_percentage: 0,
    show_vehicle_image: true,
    show_qr_code: true,
    show_signature: false,
    bank_account_name: '',
    bank_account_number: '',
    bank_name: '',
    bank_branch: '',
    bank_swift_code: '',
    bank_payment_instructions: '',
    default_special_notes: []
  });

  const [qr, setQr] = useState<QrSettings>({
    qr_image_url: null,
    enabled: true,
    label: '',
    purpose: 'Bank Payment'
  });

  const [newNote, setNewNote] = useState('');

  // Fixed seeded IDs
  const COMPANY_ID = 'd3b07384-d113-4c91-9c6a-681b83d8e5df';
  const QUOTATION_ID = 'e94d80a1-c7d6-4447-975f-fb36a5293671';
  const QR_ID = 'fa619d85-f5f4-42f7-b247-c0e86b24df41';

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [compRes, quotRes, qrRes] = await Promise.all([
        supabase.from('company_settings').select('*').eq('id', COMPANY_ID).single(),
        supabase.from('quotation_settings').select('*').eq('id', QUOTATION_ID).single(),
        supabase.from('qr_settings').select('*').eq('id', QR_ID).single()
      ]);

      if (compRes.error) console.error(compRes.error);
      else setCompany(compRes.data as CompanySettings);

      if (quotRes.error) console.error(quotRes.error);
      else setQuotation(quotRes.data as QuotationSettings);

      if (qrRes.error) console.error(qrRes.error);
      else setQr(qrRes.data as QrSettings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Update Company
      const { error: compError } = await supabase
        .from('company_settings')
        .update(company)
        .eq('id', COMPANY_ID);
      if (compError) throw compError;

      // Update Quotation Settings
      const { error: quotError } = await supabase
        .from('quotation_settings')
        .update(quotation)
        .eq('id', QUOTATION_ID);
      if (quotError) throw quotError;

      // Update QR Settings
      const { error: qrError } = await supabase
        .from('qr_settings')
        .update(qr)
        .eq('id', QR_ID);
      if (qrError) throw qrError;

      // Log Settings Update
      await supabase.from('quotation_activity_logs').insert({
        action: 'Settings updated',
        entity_type: 'settings',
        entity_id: COMPANY_ID,
        user_id: profile?.id,
        change_summary: 'Updated global quotation and company details settings'
      });

      setSuccessMsg('Settings saved successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        alert('File size exceeds 25MB limit.');
        return;
      }
      try {
        setSaving(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `letterhead_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('branding').upload(filePath, file);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(filePath);
        setCompany((prev) => ({ ...prev, letterhead_image_url: publicUrl }));
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleUploadQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('QR code file must be less than 5MB.');
        return;
      }
      try {
        setSaving(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `qr_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('branding').upload(filePath, file);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(filePath);
        setQr((prev) => ({ ...prev, qr_image_url: publicUrl }));
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setQuotation((prev) => ({
        ...prev,
        default_special_notes: [...prev.default_special_notes, newNote.trim()]
      }));
      setNewNote('');
    }
  };

  const handleRemoveNote = (index: number) => {
    setQuotation((prev) => ({
      ...prev,
      default_special_notes: prev.default_special_notes.filter((_, i) => i !== index)
    }));
  };

  if (profile?.role === 'staff') {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center text-red-400">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm">Staff members are not authorized to view or edit system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-white">System Settings</h2>
        <p className="text-xs text-zinc-400">Manage company details, bank configurations, default terms and QR codes.</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-900/50 p-4 text-sm text-green-400">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-900/50 p-4 text-sm text-red-400">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Tabs Sidebar */}
          <div className="flex flex-col gap-1.5 bg-[#151516] border border-zinc-800 rounded-2xl p-3 shadow-md">
            <button
              onClick={() => setActiveTab('company')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'company' ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Building size={16} />
              Company details
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'pdf' ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Sliders size={16} />
              PDF Settings
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'bank' ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Landmark size={16} />
              Bank details
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'notes' ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <FileText size={16} />
              Default Notes
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'qr' ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <QrCode size={16} />
              QR Code
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="md:col-span-3 bg-[#151516] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* Tab: Company Details */}
            {activeTab === 'company' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white mb-2">Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Company Name</label>
                    <input
                      type="text"
                      value={company.company_name}
                      onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Registration Number</label>
                    <input
                      type="text"
                      value={company.registration_number}
                      onChange={(e) => setCompany({ ...company, registration_number: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Address</label>
                    <input
                      type="text"
                      value={company.address}
                      onChange={(e) => setCompany({ ...company, address: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Phone Numbers</label>
                    <input
                      type="text"
                      value={company.phone_numbers}
                      onChange={(e) => setCompany({ ...company, phone_numbers: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Website</label>
                    <input
                      type="text"
                      value={company.website}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-850 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Quotation Letterhead</h4>
                      <p className="text-xs text-zinc-500">Enable or upload a custom background letterhead for PDF downloads.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={company.letterhead_enabled}
                        onChange={(e) => setCompany({ ...company, letterhead_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-black"></div>
                    </label>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => letterheadRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white"
                    >
                      <Upload size={16} />
                      Upload Letterhead
                    </button>
                    <input
                      type="file"
                      ref={letterheadRef}
                      onChange={handleUploadLetterhead}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {company.letterhead_image_url && (
                    <div className="relative w-36 h-48 border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950">
                      <img src={company.letterhead_image_url} alt="Letterhead Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setCompany({ ...company, letterhead_image_url: null })}
                        className="absolute top-2 right-2 rounded-full p-1 bg-black/80 text-zinc-400 hover:text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: PDF Settings */}
            {activeTab === 'pdf' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white mb-2">PDF Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Quotation Heading</label>
                    <input
                      type="text"
                      value={quotation.heading}
                      onChange={(e) => setQuotation({ ...quotation, heading: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Prefix</label>
                    <input
                      type="text"
                      value={quotation.prefix}
                      onChange={(e) => setQuotation({ ...quotation, prefix: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Default Validity (Hours)</label>
                    <input
                      type="number"
                      value={quotation.default_validity_hours}
                      onChange={(e) => setQuotation({ ...quotation, default_validity_hours: parseInt(e.target.value) || 24 })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Default Tax Percentage (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={quotation.default_tax_percentage}
                      onChange={(e) => setQuotation({ ...quotation, default_tax_percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-850 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Show Vehicle Image</h4>
                      <p className="text-xs text-zinc-500">Include vehicle thumbnail image in the quotation details.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quotation.show_vehicle_image}
                        onChange={(e) => setQuotation({ ...quotation, show_vehicle_image: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:bg-primary peer-checked:after:bg-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Show QR Code</h4>
                      <p className="text-xs text-zinc-500">Display QR payment code in the PDF footer.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quotation.show_qr_code}
                        onChange={(e) => setQuotation({ ...quotation, show_qr_code: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:bg-primary peer-checked:after:bg-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Require Approval Signature Line</h4>
                      <p className="text-xs text-zinc-500">Add signature/approval placeholder at the bottom of the quotation.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quotation.show_signature}
                        onChange={(e) => setQuotation({ ...quotation, show_signature: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:bg-primary peer-checked:after:bg-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Bank Details */}
            {activeTab === 'bank' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white mb-2">Bank Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Account Name</label>
                    <input
                      type="text"
                      value={quotation.bank_account_name}
                      onChange={(e) => setQuotation({ ...quotation, bank_account_name: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={quotation.bank_account_number}
                      onChange={(e) => setQuotation({ ...quotation, bank_account_number: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={quotation.bank_name}
                      onChange={(e) => setQuotation({ ...quotation, bank_name: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Branch</label>
                    <input
                      type="text"
                      value={quotation.bank_branch}
                      onChange={(e) => setQuotation({ ...quotation, bank_branch: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Swift Code</label>
                    <input
                      type="text"
                      value={quotation.bank_swift_code}
                      onChange={(e) => setQuotation({ ...quotation, bank_swift_code: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Payment Instructions</label>
                    <textarea
                      value={quotation.bank_payment_instructions}
                      onChange={(e) => setQuotation({ ...quotation, bank_payment_instructions: e.target.value })}
                      rows={4}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Default Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white mb-2">Default Special Notes</h3>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter default term/note..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-500"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2 mt-4">
                  {quotation.default_special_notes.map((note, index) => (
                    <div key={index} className="flex items-start justify-between gap-4 p-3 bg-zinc-900 border border-zinc-850 rounded-xl text-sm">
                      <span className="text-zinc-300">{note}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(index)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: QR Code Settings */}
            {activeTab === 'qr' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white mb-2">QR Code Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Enable QR Code</h4>
                    <p className="text-xs text-zinc-500">Include QR image in generated quotations.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qr.enabled}
                      onChange={(e) => setQr({ ...qr, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:bg-primary peer-checked:after:bg-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">QR Label</label>
                    <input
                      type="text"
                      value={qr.label}
                      onChange={(e) => setQr({ ...qr, label: e.target.value })}
                      placeholder="WhatsApp Payment Slip"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">QR Purpose</label>
                    <select
                      value={qr.purpose}
                      onChange={(e) => setQr({ ...qr, purpose: e.target.value as any })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Bank Payment">Bank Payment</option>
                      <option value="Website">Website</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Google Review">Google Review</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-850 space-y-4">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">QR Code Image</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => qrRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white"
                    >
                      <Upload size={16} />
                      Upload QR Code
                    </button>
                    <input
                      type="file"
                      ref={qrRef}
                      onChange={handleUploadQr}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {qr.qr_image_url && (
                    <div className="relative w-32 h-32 border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950">
                      <img src={qr.qr_image_url} alt="QR Code Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setQr({ ...qr, qr_image_url: null })}
                        className="absolute top-2 right-2 rounded-full p-1 bg-black/80 text-zinc-400 hover:text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Buttons */}
            <div className="flex justify-end pt-4 border-t border-zinc-850">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-black hover:bg-yellow-500 disabled:opacity-50 min-w-[120px]"
              >
                {saving ? <Loader2 size={16} className="animate-spin text-black" /> : 'Save Settings'}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
