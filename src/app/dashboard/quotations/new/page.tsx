'use client';

import React from 'react';
import QuotationForm from '@/components/QuotationForm';

export default function NewQuotationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Create Quotation</h2>
        <p className="text-xs text-zinc-400">Generate a new rental quotation with real-time pricing and snapshots.</p>
      </div>
      <QuotationForm />
    </div>
  );
}
