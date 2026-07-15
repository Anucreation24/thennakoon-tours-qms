'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/providers/ProfileProvider';
import { createClient } from '@/utils/supabase/client';
import { generateQuotationPdf } from '@/utils/pdfGenerator';
import { Loader2, Plus, Search, Eye, Edit2, Copy, FileDown, EyeIcon, Trash2, Archive, Calendar } from 'lucide-react';

interface QuotationList {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string | null;
  quotation_date: string;
  rental_start_date: string | null;
  rental_end_date: string | null;
  grand_total: number;
  status: 'Draft' | 'Generated' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled';
  created_at: string;
  vehicle_snapshot: {
    name: string;
  };
  profiles: {
    full_name: string;
  } | null;
}

export default function QuotationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useProfile();

  const [quotations, setQuotations] = useState<QuotationList[]>([]);
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchNumber, setSearchNumber] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';
  const isStaff = profile?.role === 'staff';

  const fetchQuotations = async () => {
    setLoading(true);
    // Fetch profiles relation for "created by"
    let query = supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        customer_name,
        customer_phone,
        quotation_date,
        rental_start_date,
        rental_end_date,
        grand_total,
        status,
        created_at,
        vehicle_snapshot,
        profiles!quotations_created_by_fkey (
          full_name
        )
      `);

    // If staff, hide archived quotations
    if (isStaff) {
      query = query.is('archived_at', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setQuotations((data as any) || []);

      // Extract unique vehicle names for filter dropdown
      const uniqueVehicles: string[] = [];
      data?.forEach((q: any) => {
        const name = q.vehicle_snapshot?.name;
        if (name && !uniqueVehicles.includes(name)) {
          uniqueVehicles.push(name);
        }
      });
      setVehicles(uniqueVehicles);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
  }, [profile]);

  const handlePreviewPdf = async (q: any) => {
    // We need to fetch prepared_by profile to display name on PDF
    const { data: preparedByProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', q.prepared_by || q.created_by)
      .single();

    const pdfData = {
      ...q,
      prepared_by_name: preparedByProfile?.full_name || 'Staff Member'
    };

    await generateQuotationPdf(pdfData, false);
  };

  const handleDownloadPdf = async (q: any) => {
    const { data: preparedByProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', q.prepared_by || q.created_by)
      .single();

    const pdfData = {
      ...q,
      prepared_by_name: preparedByProfile?.full_name || 'Staff Member'
    };

    await generateQuotationPdf(pdfData, true);
    
    // Log activity
    await supabase.from('quotation_activity_logs').insert({
      action: 'PDF generated',
      entity_type: 'quotation',
      entity_id: q.id,
      user_id: profile?.id,
      change_summary: `Downloaded PDF for quotation ${q.quotation_number}`
    });
  };

  const handleDuplicate = async (qId: string) => {
    if (confirm('Are you sure you want to duplicate this quotation? A new draft copy will be created.')) {
      try {
        setLoading(true);
        // Load original quotation
        const { data: q, error: loadErr } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', qId)
          .single();

        if (loadErr) throw loadErr;

        // Generate a new unique quotation number for the copy
        const yearVal = new Date().getFullYear();
        const { data: seqData, error: seqErr } = await supabase.rpc(
          'generate_next_quotation_number',
          { target_year: yearVal }
        );

        if (seqErr) throw seqErr;

        const copyData = {
          ...q,
          id: undefined, // let DB generate UUID
          quotation_number: seqData.quotation_number,
          quotation_year: yearVal,
          quotation_sequence: seqData.sequence,
          status: 'Draft',
          quotation_date: new Date().toISOString().split('T')[0],
          created_by: profile?.id,
          updated_by: profile?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived_at: null
        };

        const { error: insertErr } = await supabase
          .from('quotations')
          .insert(copyData);

        if (insertErr) throw insertErr;

        // Log duplicate
        await supabase.from('quotation_activity_logs').insert({
          action: 'Quotation duplicated',
          entity_type: 'quotation',
          entity_id: qId,
          user_id: profile?.id,
          change_summary: `Duplicated quotation ${q.quotation_number} into draft ${seqData.quotation_number}`
        });

        fetchQuotations();
      } catch (err: any) {
        alert('Failed to duplicate: ' + err.message);
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (qId: string, quoteNum: string, newStatus: string) => {
    const { error } = await supabase
      .from('quotations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', qId);

    if (error) {
      alert(error.message);
    } else {
      // Log status change
      await supabase.from('quotation_activity_logs').insert({
        action: 'Status changed',
        entity_type: 'quotation',
        entity_id: qId,
        user_id: profile?.id,
        change_summary: `Changed status of quotation ${quoteNum} to ${newStatus}`
      });

      fetchQuotations();
    }
  };

  const handleArchive = async (qId: string, quoteNum: string, currentArchivedAt: string | null) => {
    const isArchive = !currentArchivedAt;
    const actionLabel = isArchive ? 'archive' : 'restore';
    
    if (confirm(`Are you sure you want to ${actionLabel} this quotation?`)) {
      const { error } = await supabase
        .from('quotations')
        .update({
          archived_at: isArchive ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', qId);

      if (error) {
        alert(error.message);
      } else {
        // Log archive/restore
        await supabase.from('quotation_activity_logs').insert({
          action: isArchive ? 'Quotation archived' : 'Quotation restored',
          entity_type: 'quotation',
          entity_id: qId,
          user_id: profile?.id,
          change_summary: `${isArchive ? 'Archived' : 'Restored'} quotation ${quoteNum}`
        });

        fetchQuotations();
      }
    }
  };

  // Filter logic
  const filteredQuotations = quotations.filter((q) => {
    const matchesNum = q.quotation_number.toLowerCase().includes(searchNumber.toLowerCase());
    const matchesCust = q.customer_name.toLowerCase().includes(searchCustomer.toLowerCase());
    const matchesPhone = q.customer_phone ? q.customer_phone.includes(searchPhone) : searchPhone === '';
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchesVehicle = filterVehicle === 'all' || q.vehicle_snapshot?.name === filterVehicle;

    // Date range filter
    let matchesDate = true;
    if (startDate && endDate) {
      const qDate = new Date(q.quotation_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      matchesDate = qDate >= start && qDate <= end;
    }

    return matchesNum && matchesCust && matchesPhone && matchesStatus && matchesVehicle && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Quotations</h2>
          <p className="text-xs text-zinc-400">View quotation history, generate professional PDFs, or duplicate records.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/quotations/new')}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-500 transition-colors"
        >
          <Plus size={16} />
          New Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-5 shadow-md space-y-4">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Search and Filters</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Quote # */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Quotation Number</label>
            <input
              type="text"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder="e.g. QT-2026-0001"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          {/* Customer */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Customer Name</label>
            <input
              type="text"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          {/* Phone */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Phone Number</label>
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="e.g. +94 77..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          {/* Status */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Generated">Generated</option>
              <option value="Sent">Sent</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Vehicle */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Vehicle</label>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          {/* Start Date */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          {/* End Date */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="bg-[#151516] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="rounded-2xl p-12 text-center text-zinc-500">
            No quotations found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-4">Quote #</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Period</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
                {filteredQuotations.map((q: any) => {
                  const isDraft = q.status === 'Draft';
                  // Staff can edit only draft. Owner/Admin can edit generated too.
                  const canEdit = isDraft || isOwnerOrAdmin;

                  return (
                    <tr key={q.id} className="hover:bg-zinc-900/30">
                      <td className="px-5 py-4 font-bold text-white">{q.quotation_number}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{q.customer_name}</div>
                        {q.customer_phone && <div className="text-[10px] text-zinc-500">{q.customer_phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{q.vehicle_snapshot?.name || 'N/A'}</td>
                      <td className="px-5 py-4 text-zinc-500">{new Date(q.quotation_date).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-zinc-500">
                        {q.rental_start_date && q.rental_end_date ? (
                          <span>
                            {new Date(q.rental_start_date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })} -{' '}
                            {new Date(q.rental_end_date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold text-primary">
                        LKR {q.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          q.status === 'Accepted'
                            ? 'bg-green-500/10 text-green-400'
                            : q.status === 'Rejected' || q.status === 'Cancelled'
                            ? 'bg-red-500/10 text-red-400'
                            : q.status === 'Generated'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePreviewPdf(q)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            title="Preview PDF"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(q)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            title="Download PDF"
                          >
                            <FileDown size={13} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => router.push(`/dashboard/quotations/edit/${q.id}`)}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(q.id)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            title="Duplicate"
                          >
                            <Copy size={13} />
                          </button>
                          {isOwnerOrAdmin && (
                            <>
                              <select
                                value={q.status}
                                onChange={(e) => handleStatusChange(q.id, q.quotation_number, e.target.value)}
                                className="rounded border border-zinc-800 bg-zinc-900 py-1 px-1 text-[10px] text-zinc-400 focus:outline-none"
                              >
                                <option value="Draft">Draft</option>
                                <option value="Generated">Generated</option>
                                <option value="Sent">Sent</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Expired">Expired</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              <button
                                onClick={() => handleArchive(q.id, q.quotation_number, q.archived_at)}
                                className={`p-1.5 rounded-lg hover:bg-zinc-800 ${
                                  q.archived_at ? 'text-green-400 hover:text-green-300' : 'text-zinc-500 hover:text-red-400'
                                }`}
                                title={q.archived_at ? 'Restore' : 'Archive'}
                              >
                                <Archive size={13} />
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
    </div>
  );
}
