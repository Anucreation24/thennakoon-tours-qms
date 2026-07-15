'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, CheckCircle2, AlertTriangle, Play } from 'lucide-react';

export default function ConvertPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'converting' | 'uploading' | 'success' | 'error'>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [letterheadUrl, setLetterheadUrl] = useState<string | null>(null);

  const supabase = createClient();
  const COMPANY_ID = 'd3b07384-d113-4c91-9c6a-681b83d8e5df';

  const runConversion = async () => {
    setStatus('loading');
    setProgressMsg('Loading PDF.js from CDN...');
    setErrorMsg(null);

    try {
      // 1. Load pdfjs-dist from CDN dynamically
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF.js script.'));
          document.head.appendChild(script);
        });
      }

      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

      setStatus('converting');
      setProgressMsg('Fetching letterhead PDF from public assets...');

      // 2. Load the PDF file
      const pdfUrl = '/letterhead.pdf';
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      setProgressMsg('Rendering first page at 300 DPI (high-resolution)...');
      
      // 3. Render page 1
      const page = await pdf.getPage(1);
      const scale = 3.0; // 3.0 scale provides around 2480x3508px (excellent print quality)
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Failed to create canvas context.');

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      setStatus('uploading');
      setProgressMsg('Converting canvas to PNG image...');

      // 4. Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) throw new Error('Failed to create image blob.');

      setProgressMsg('Uploading PNG letterhead background to Supabase Storage...');

      // 5. Upload to Supabase Storage
      const fileName = `letterhead_bg_${Date.now()}.png`;
      const filePath = `letterhead/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      setProgressMsg('Updating company settings with the new background image...');

      const { error: dbError } = await supabase
        .from('company_settings')
        .update({
          letterhead_image_url: publicUrl,
          letterhead_enabled: true
        })
        .eq('id', COMPANY_ID);

      if (dbError) throw dbError;

      // Trigger automatic browser download
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = 'letterhead.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setLetterheadUrl(publicUrl);
      setStatus('success');
      setProgressMsg('Conversion completed. A high-quality letterhead.png has been downloaded to your browser.');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during extraction.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] p-4 text-white">
      <div className="w-full max-w-md bg-[#151516] border border-zinc-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold">Letterhead Extractor</h2>
          <p className="text-xs text-zinc-400 mt-1">Extracts page 1 of letterhead.pdf and configures the system background.</p>
        </div>

        {status === 'idle' && (
          <div className="text-center space-y-4">
            <p className="text-xs text-zinc-500">
              Ensure you have placed the PDF at <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-primary">/public/letterhead.pdf</code>.
            </p>
            <button
              onClick={runConversion}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-black hover:bg-yellow-500 transition-colors"
            >
              <Play size={16} />
              Start Extraction
            </button>
          </div>
        )}

        {(status === 'loading' || status === 'converting' || status === 'uploading') && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold capitalize text-zinc-200">{status}...</p>
              <p className="text-xs text-zinc-400">{progressMsg}</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold">Success!</h3>
              <p className="text-xs text-zinc-400">{progressMsg}</p>
            </div>
            {letterheadUrl && (
              <div className="border border-zinc-850 rounded-xl p-3 bg-zinc-900 text-left">
                <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Configured URL</span>
                <a href={letterheadUrl} target="_blank" rel="noreferrer" className="text-xs text-primary truncate hover:underline block mt-0.5">
                  {letterheadUrl}
                </a>
              </div>
            )}
            <div className="pt-2">
              <Link href="/dashboard/settings" className="text-xs font-semibold text-primary hover:underline">
                Go to Settings Page
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4 py-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-red-400">Extraction Failed</h3>
              <p className="text-xs text-zinc-400">{errorMsg}</p>
            </div>
            <button
              onClick={runConversion}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 py-2.5 text-sm font-semibold text-white hover:bg-zinc-750"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick link helper to render Link
import Link from 'next/link';
