'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Copy,
  Edit2,
  Eye,
  FileDown,
  Loader2,
  Plus,
} from 'lucide-react';

import { useProfile } from '@/providers/ProfileProvider';
import { createClient } from '@/utils/supabase/client';
import { generateQuotationPdf } from '@/utils/pdfGenerator';

type QuotationStatus =
  | 'Draft'
  | 'Generated'
  | 'Sent'
  | 'Accepted'
  | 'Rejected'
  | 'Expired'
  | 'Cancelled';

interface VehicleSnapshot {
  name?: string;
  brand?: string;
  model?: string;
  year?: string | number;
  registration_number?: string;
}

interface QuotationList {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string | null;
  quotation_date: string;
  rental_start_date: string | null;
  rental_end_date: string | null;
  grand_total: number;
  status: QuotationStatus;
  created_at: string;
  archived_at: string | null;
  vehicle_snapshot: VehicleSnapshot | null;
  profiles:
    | {
        full_name: string | null;
      }
    | null;
}

interface SequenceResult {
  quotation_number: string;
  sequence: number;
}

export default function QuotationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { profile } = useProfile();

  const [quotations, setQuotations] = useState<QuotationList[]>([]);
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [searchNumber, setSearchNumber] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isOwnerOrAdmin =
    profile?.role === 'owner' || profile?.role === 'admin';

  const isStaff = profile?.role === 'staff';

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('quotations').select(`
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
        archived_at,
        vehicle_snapshot,
        profiles!quotations_created_by_fkey (
          full_name
        )
      `);

      if (isStaff) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      const quotationData = (data ?? []) as unknown as QuotationList[];

      setQuotations(quotationData);

      const uniqueVehicles = Array.from(
        new Set(
          quotationData
            .map((quotation) => quotation.vehicle_snapshot?.name)
            .filter((name): name is string => Boolean(name))
        )
      );

      setVehicles(uniqueVehicles);
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
    } finally {
      setLoading(false);
    }
  }, [isStaff, supabase]);

  useEffect(() => {
    if (profile) {
      void fetchQuotations();
    }
  }, [profile, fetchQuotations]);

  const getFullQuotationForPdf = async (quotationId: string) => {
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .single();

    if (quotationError) {
      throw new Error(
        quotationError.message || 'Failed to load quotation details.'
      );
    }

    if (!quotation) {
      throw new Error('Quotation record was not found.');
    }

    let preparedByName = 'Staff Member';
let preparedByRole = 'Staff Member';

const profileId = quotation.prepared_by || quotation.created_by;

if (profileId) {
  const {
    data: preparedByProfile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', profileId)
    .maybeSingle();

  if (profileError) {
    console.error('Profile lookup failed:', profileError);
  } else if (preparedByProfile) {
    preparedByName =
      preparedByProfile.full_name || 'Staff Member';

    const roleMap = {
  owner: 'Director',
  admin: 'Admin & Marketing Assistant',
  staff: 'Sales Dep',

} as const;

preparedByRole =
  roleMap[
    preparedByProfile.role as keyof typeof roleMap
  ] || 'Staff Member';
  }
}

return {
  ...quotation,
  prepared_by_name: preparedByName,
  prepared_by_role: preparedByRole,
};
  };

  const handlePreviewPdf = async (quotation: QuotationList) => {
    try {
      setProcessingId(quotation.id);

      const pdfData = await getFullQuotationForPdf(quotation.id);

      await generateQuotationPdf(pdfData, false);
    } catch (error) {
      console.error('PDF preview failed:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to preview the quotation PDF.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadPdf = async (quotation: QuotationList) => {
    try {
      setProcessingId(quotation.id);

      const pdfData = await getFullQuotationForPdf(quotation.id);

      await generateQuotationPdf(pdfData, true);

      const { error: logError } = await supabase
        .from('quotation_activity_logs')
        .insert({
          action: 'PDF generated',
          entity_type: 'quotation',
          entity_id: quotation.id,
          user_id: profile?.id ?? null,
          change_summary: `Downloaded PDF for quotation ${quotation.quotation_number}`,
        });

      if (logError) {
        console.error('PDF activity log failed:', logError);
      }
    } catch (error) {
      console.error('PDF download failed:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to download the quotation PDF.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDuplicate = async (quotationId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to duplicate this quotation? A new draft copy will be created.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(quotationId);

      const { data: originalQuotation, error: loadError } =
        await supabase
          .from('quotations')
          .select('*')
          .eq('id', quotationId)
          .single();

      if (loadError) {
        throw loadError;
      }

      if (!originalQuotation) {
        throw new Error('Original quotation was not found.');
      }

      const year = new Date().getFullYear();

      const { data: sequenceData, error: sequenceError } =
        await supabase.rpc('generate_next_quotation_number', {
          target_year: year,
        });

      if (sequenceError) {
        throw sequenceError;
      }

      const sequenceResult = sequenceData as SequenceResult;

      if (
        !sequenceResult?.quotation_number ||
        sequenceResult.sequence === undefined
      ) {
        throw new Error(
          'The quotation number generator returned an invalid result.'
        );
      }

      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        quotation_number: _quotationNumber,
        quotation_year: _quotationYear,
        quotation_sequence: _quotationSequence,
        ...quotationData
      } = originalQuotation;

      const copyData = {
        ...quotationData,
        quotation_number: sequenceResult.quotation_number,
        quotation_year: year,
        quotation_sequence: sequenceResult.sequence,
        status: 'Draft',
        quotation_date: new Date().toISOString().split('T')[0],
        created_by: profile?.id ?? originalQuotation.created_by,
        updated_by: profile?.id ?? originalQuotation.updated_by,
        archived_at: null,
      };

      const { data: createdCopy, error: insertError } = await supabase
        .from('quotations')
        .insert(copyData)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!createdCopy) {
        throw new Error('The duplicated quotation was not created.');
      }

      const { error: logError } = await supabase
        .from('quotation_activity_logs')
        .insert({
          action: 'Quotation duplicated',
          entity_type: 'quotation',
          entity_id: createdCopy.id,
          user_id: profile?.id ?? null,
          change_summary: `Duplicated quotation ${originalQuotation.quotation_number} into draft ${sequenceResult.quotation_number}`,
        });

      if (logError) {
        console.error('Duplicate activity log failed:', logError);
      }

      await fetchQuotations();

      alert(
        `Quotation duplicated successfully as ${sequenceResult.quotation_number}.`
      );
    } catch (error) {
      console.error('Quotation duplication failed:', error);

      alert(
        error instanceof Error
          ? `Failed to duplicate: ${error.message}`
          : 'Failed to duplicate quotation.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (
    quotationId: string,
    quotationNumber: string,
    newStatus: QuotationStatus
  ) => {
    try {
      setProcessingId(quotationId);

      const { error } = await supabase
        .from('quotations')
        .update({
          status: newStatus,
          updated_by: profile?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quotationId);

      if (error) {
        throw error;
      }

      const { error: logError } = await supabase
        .from('quotation_activity_logs')
        .insert({
          action: 'Status changed',
          entity_type: 'quotation',
          entity_id: quotationId,
          user_id: profile?.id ?? null,
          change_summary: `Changed status of quotation ${quotationNumber} to ${newStatus}`,
        });

      if (logError) {
        console.error('Status activity log failed:', logError);
      }

      await fetchQuotations();
    } catch (error) {
      console.error('Quotation status update failed:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to update quotation status.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchive = async (
    quotationId: string,
    quotationNumber: string,
    currentArchivedAt: string | null
  ) => {
    const shouldArchive = !currentArchivedAt;
    const actionLabel = shouldArchive ? 'archive' : 'restore';

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} this quotation?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(quotationId);

      const { error } = await supabase
        .from('quotations')
        .update({
          archived_at: shouldArchive
            ? new Date().toISOString()
            : null,
          updated_by: profile?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quotationId);

      if (error) {
        throw error;
      }

      const { error: logError } = await supabase
        .from('quotation_activity_logs')
        .insert({
          action: shouldArchive
            ? 'Quotation archived'
            : 'Quotation restored',
          entity_type: 'quotation',
          entity_id: quotationId,
          user_id: profile?.id ?? null,
          change_summary: `${
            shouldArchive ? 'Archived' : 'Restored'
          } quotation ${quotationNumber}`,
        });

      if (logError) {
        console.error('Archive activity log failed:', logError);
      }

      await fetchQuotations();
    } catch (error) {
      console.error('Quotation archive operation failed:', error);

      alert(
        error instanceof Error
          ? error.message
          : `Failed to ${actionLabel} quotation.`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const filteredQuotations = quotations.filter((quotation) => {
    const quotationNumber = quotation.quotation_number.toLowerCase();
    const customerName = quotation.customer_name.toLowerCase();
    const customerPhone = quotation.customer_phone ?? '';
    const vehicleName = quotation.vehicle_snapshot?.name ?? '';

    const matchesNumber = quotationNumber.includes(
      searchNumber.toLowerCase()
    );

    const matchesCustomer = customerName.includes(
      searchCustomer.toLowerCase()
    );

    const matchesPhone = customerPhone.includes(searchPhone);

    const matchesStatus =
      filterStatus === 'all' ||
      quotation.status === filterStatus;

    const matchesVehicle =
      filterVehicle === 'all' || vehicleName === filterVehicle;

    let matchesDate = true;

    if (startDate) {
      const quotationDate = new Date(quotation.quotation_date);
      const rangeStart = new Date(startDate);

      matchesDate = quotationDate >= rangeStart;
    }

    if (endDate && matchesDate) {
      const quotationDate = new Date(quotation.quotation_date);
      const rangeEnd = new Date(endDate);

      rangeEnd.setHours(23, 59, 59, 999);

      matchesDate = quotationDate <= rangeEnd;
    }

    return (
      matchesNumber &&
      matchesCustomer &&
      matchesPhone &&
      matchesStatus &&
      matchesVehicle &&
      matchesDate
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            Quotations
          </h2>

          <p className="text-xs text-zinc-400">
            View quotation history, generate professional PDFs,
            or duplicate records.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push('/dashboard/quotations/new')
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-yellow-500"
        >
          <Plus size={16} />
          New Quotation
        </button>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-[#151516] p-5 shadow-md">
        <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Search and Filters
        </span>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              Quotation Number
            </label>

            <input
              type="text"
              value={searchNumber}
              onChange={(event) =>
                setSearchNumber(event.target.value)
              }
              placeholder="e.g. QT-2026-0001"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              Customer Name
            </label>

            <input
              type="text"
              value={searchCustomer}
              onChange={(event) =>
                setSearchCustomer(event.target.value)
              }
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              Phone Number
            </label>

            <input
              type="text"
              value={searchPhone}
              onChange={(event) =>
                setSearchPhone(event.target.value)
              }
              placeholder="e.g. +94 77..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              Status
            </label>

            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value)
              }
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

        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              Vehicle
            </label>

            <select
              value={filterVehicle}
              onChange={(event) =>
                setFilterVehicle(event.target.value)
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="all">All Vehicles</option>

              {vehicles.map((vehicle) => (
                <option key={vehicle} value={vehicle}>
                  {vehicle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              From Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              To Date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#151516] shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No quotations found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-4">Quote #</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Period</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
                {filteredQuotations.map((quotation) => {
                  const isDraft =
                    quotation.status === 'Draft';

                  const canEdit =
                    isDraft || isOwnerOrAdmin;

                  const isProcessing =
                    processingId === quotation.id;

                  return (
                    <tr
                      key={quotation.id}
                      className="hover:bg-zinc-900/30"
                    >
                      <td className="px-5 py-4 font-bold text-white">
                        {quotation.quotation_number}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {quotation.customer_name}
                        </div>

                        {quotation.customer_phone && (
                          <div className="text-[10px] text-zinc-500">
                            {quotation.customer_phone}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-zinc-400">
                        {quotation.vehicle_snapshot?.name ||
                          'N/A'}
                      </td>

                      <td className="px-5 py-4 text-zinc-500">
                        {new Date(
                          quotation.quotation_date
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-zinc-500">
                        {quotation.rental_start_date &&
                        quotation.rental_end_date ? (
                          <span>
                            {new Date(
                              quotation.rental_start_date
                            ).toLocaleDateString(undefined, {
                              month: '2-digit',
                              day: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(
                              quotation.rental_end_date
                            ).toLocaleDateString(undefined, {
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold text-primary">
                        LKR{' '}
                        {Number(
                          quotation.grand_total
                        ).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            quotation.status === 'Accepted'
                              ? 'bg-green-500/10 text-green-400'
                              : quotation.status ===
                                    'Rejected' ||
                                  quotation.status ===
                                    'Cancelled'
                                ? 'bg-red-500/10 text-red-400'
                                : quotation.status ===
                                    'Generated'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {quotation.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              void handlePreviewPdf(
                                quotation
                              )
                            }
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            title="Preview PDF"
                          >
                            {isProcessing ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <Eye size={13} />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              void handleDownloadPdf(
                                quotation
                              )
                            }
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            title="Download PDF"
                          >
                            <FileDown size={13} />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                router.push(
                                  `/dashboard/quotations/edit/${quotation.id}`
                                )
                              }
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              void handleDuplicate(
                                quotation.id
                              )
                            }
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            title="Duplicate"
                          >
                            <Copy size={13} />
                          </button>

                          {isOwnerOrAdmin && (
                            <>
                              <select
                                disabled={isProcessing}
                                value={quotation.status}
                                onChange={(event) =>
                                  void handleStatusChange(
                                    quotation.id,
                                    quotation.quotation_number,
                                    event.target
                                      .value as QuotationStatus
                                  )
                                }
                                className="rounded border border-zinc-800 bg-zinc-900 px-1 py-1 text-[10px] text-zinc-400 focus:outline-none disabled:opacity-40"
                              >
                                <option value="Draft">
                                  Draft
                                </option>
                                <option value="Generated">
                                  Generated
                                </option>
                                <option value="Sent">
                                  Sent
                                </option>
                                <option value="Accepted">
                                  Accepted
                                </option>
                                <option value="Rejected">
                                  Rejected
                                </option>
                                <option value="Expired">
                                  Expired
                                </option>
                                <option value="Cancelled">
                                  Cancelled
                                </option>
                              </select>

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  void handleArchive(
                                    quotation.id,
                                    quotation.quotation_number,
                                    quotation.archived_at
                                  )
                                }
                                className={`rounded-lg p-1.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 ${
                                  quotation.archived_at
                                    ? 'text-green-400 hover:text-green-300'
                                    : 'text-zinc-500 hover:text-red-400'
                                }`}
                                title={
                                  quotation.archived_at
                                    ? 'Restore'
                                    : 'Archive'
                                }
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
