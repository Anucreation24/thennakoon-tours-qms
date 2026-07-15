'use client';

import React from 'react';
import QuotationForm from '@/components/QuotationForm';
import { useParams } from 'next/navigation';

export default function EditQuotationPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Edit Quotation</h2>
        <p className="text-xs text-zinc-400">Modify quotation details. Snapshots will be updated upon save.</p>
      </div>
      <QuotationForm quotationId={id} />
    </div>
  );
}
