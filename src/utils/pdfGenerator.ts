import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to convert image URL to base64
async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);

  if (!res.ok) {
    throw new Error(
      `Failed to load image: ${imageUrl} (${res.status} ${res.statusText})`
    );
  }

  const contentType = res.headers.get('content-type') || '';

  if (!contentType.startsWith('image/')) {
    throw new Error(
      `Invalid image response from ${imageUrl}. Content-Type: ${contentType}`
    );
  }

  const blob = await res.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    });

    reader.onerror = () => {
      reject(new Error('Failed to convert image to base64'));
    };

    reader.readAsDataURL(blob);
  });
}

export async function generateQuotationPdf(quotation: any, download = false) {
  // 1. Initialize A4 PDF (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // 2. Render Letterhead Background
  const letterheadEnabled = quotation.company_snapshot?.letterhead_enabled !== false;

  if (letterheadEnabled) {
    try {
      let base64Letterhead = '';
      try {
        base64Letterhead = await getBase64ImageFromUrl('/images/letterhead.png');
      } catch (err) {
        const letterheadUrl = quotation.company_snapshot?.letterhead_image_url;
        if (letterheadUrl) {
          base64Letterhead = await getBase64ImageFromUrl(letterheadUrl);
        }
      }

      if (base64Letterhead) {
        doc.addImage(base64Letterhead, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }
    } catch (e) {
      console.error('Error loading letterhead background image:', e);
    }
  }

  // 3. Set Margins and Safe Area
  const marginX = 20;
  let currentY = 52; // Start just below header

  // 4. Heading: "Quotation"
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text('Quotation', marginX, currentY);
  currentY += 8;

  // 5. TO / Date Metadata block (using thin borders like the sample quotation)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  // Draw TO and Date boxes
  // Outer rectangle for metadata
  doc.rect(marginX, currentY, 170, 18);
  // Vertical line separating TO and Date
  doc.line(110, currentY, 110, currentY + 18);

  // Write TO details
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.text('TO :', marginX + 3, currentY + 5);
  doc.setFont('Helvetica', 'normal');
  doc.text(quotation.customer_name || 'Whom May Concern', marginX + 15, currentY + 5);
  
  // Rental period under TO
  const startDateStr = quotation.rental_start_date ? new Date(quotation.rental_start_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : '';
  const endDateStr = quotation.rental_end_date ? new Date(quotation.rental_end_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : '';
  const rentalPeriod = startDateStr && endDateStr ? `${startDateStr} - ${endDateStr}` : 'Rental Period';
  doc.setFont('Helvetica', 'bold');
  doc.text(rentalPeriod, marginX + 15, currentY + 12);

  // Write Date details
  doc.setFont('Helvetica', 'bold');
  doc.text('Date:', 113, currentY + 5);
  doc.setFont('Helvetica', 'normal');
  const qDate = new Date(quotation.quotation_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(qDate, 125, currentY + 5);

  currentY += 22; // spacing after metadata box

  // 6. Pricing & Description Table (Module 8)
  const vehicle = quotation.vehicle_snapshot || {};
  const vehicleDesc = `${(vehicle.brand || '').toUpperCase()} ${(vehicle.model || '').toUpperCase()} ${quotation.allowed_km ? `(${quotation.allowed_km}km allowed)` : ''}`;
  const extraKmText = quotation.extra_km_rate ? `(Rs.${quotation.extra_km_rate}/- per extra kilometer)` : '';

  const tableBody = [
    [
      { content: `${vehicleDesc}\n${extraKmText}`, styles: { fontStyle: 'bold' } },
      vehicle.year || '',
      `LKR ${Number(quotation.daily_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `LKR ${Number(quotation.rental_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ],
    [
      'Refundable Deposit',
      '',
      '',
      `LKR ${Number(quotation.refundable_deposit).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ]
  ];

  // Add additional charges if present
  if (Number(quotation.additional_charges) > 0) {
    tableBody.push([
      'Additional Charges',
      '',
      '',
      `LKR ${Number(quotation.additional_charges).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ]);
  }

  // Add tax amount if present
  if (Number(quotation.tax_amount) > 0) {
    tableBody.push([
      'Tax Charges',
      '',
      '',
      `LKR ${Number(quotation.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ]);
  }

  // Add discount if present
  if (Number(quotation.discount) > 0) {
    tableBody.push([
      'Discount',
      '',
      '',
      `- LKR ${Number(quotation.discount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ]);
  }

  // Add Grand Total row
  tableBody.push([
    { content: '', styles: { border: [false, false, false, false] } },
    { content: '', styles: { border: [false, false, false, false] } },
    { content: '', styles: { border: [false, false, false, false] } },
    { content: `LKR ${Number(quotation.grand_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right' } }
  ]);

  autoTable(doc, {
  startY: currentY,
  margin: { left: marginX, right: marginX },
  theme: 'plain',
  styles: {
    fontSize: 8.5,
    cellPadding: 3,
    textColor: [0, 0, 0],
    lineColor: [0, 0, 0],
    lineWidth: 0.2,
    font: 'Helvetica',
  },
  headStyles: {
    fillColor: [255, 255, 255],
    fontStyle: 'bold',
    halign: 'left',
    lineWidth: 0.2,
    lineColor: [0, 0, 0],
  },
  columnStyles: {
    0: { cellWidth: 80 },
    1: { cellWidth: 15, halign: 'center' },
    2: { cellWidth: 35, halign: 'right' },
    3: { cellWidth: 40, halign: 'right' },
  },
  head: [['DESCRIPTION', 'YEAR', 'PER DAY RATE', 'TOTAL']],
  body: tableBody,
  didDrawPage: (data) => {
    currentY = data.cursor?.y ? data.cursor.y + 8 : currentY;
  },
});

  // 7. Special Notes Section
  if (quotation.special_notes && quotation.special_notes.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(marginX, currentY, 170, 5, 'S');
    doc.text('SPECIAL NOTES', marginX + 3, currentY + 3.8);
    currentY += 7;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    quotation.special_notes.forEach((note: string) => {
      const splitNote = doc.splitTextToSize(`• ${note}`, 164);
      doc.text(splitNote, marginX + 3, currentY);
      currentY += (splitNote.length * 4);
    });
    currentY += 3;
  }

  // 8. Important Section
  if (quotation.important_notes) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(marginX, currentY, 170, 5, 'S');
    doc.text('IMPORTANT', marginX + 3, currentY + 3.8);
    currentY += 7;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitImportant = doc.splitTextToSize(quotation.important_notes, 164);
    doc.text(splitImportant, marginX + 3, currentY);
    currentY += (splitImportant.length * 4) + 4;
  }

  // 9. Bank Details & QR Code side-by-side
  const bank = quotation.bank_snapshot || {};
  if (bank.bank_name) {
    const bankBoxWidth = 75;
    const bankBoxHeight = 35;
    
    // Draw Bank Details Box
    doc.rect(marginX, currentY, bankBoxWidth, bankBoxHeight);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BANK DETAILS', marginX + 3, currentY + 5);
    
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.text(bank.bank_account_name || 'Thennakoon Tours (Pvt) Ltd', marginX + 3, currentY + 11);
    doc.text(`Account # ${bank.bank_account_number || ''}`, marginX + 3, currentY + 17);
    doc.text(`${bank.bank_name || ''} - ${bank.bank_branch || ''}`, marginX + 3, currentY + 23);
    doc.text(`Swift Code : ${bank.bank_swift_code || ''}`, marginX + 3, currentY + 29);

    // Draw QR Code next to bank box if QR code is enabled in snapshot
    const qr = quotation.qr_snapshot || {};
    if (qr.enabled && qr.qr_image_url) {
      try {
        const base64Qr = await getBase64ImageFromUrl(qr.qr_image_url);
        const qrX = marginX + bankBoxWidth + 15;
        // Draw QR
        doc.addImage(base64Qr, 'PNG', qrX, currentY, 32, 32);
        
        // QR Label
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(qr.label || 'WhatsApp Payment Slip', qrX, currentY + 34);
      } catch (err) {
        console.error('Error drawing QR code in PDF:', err);
      }
    }
    
    currentY += bankBoxHeight + 8;
  }

  // 10. Prepared By / Signature line
  if (currentY < 250) {
    const preparedByName = quotation.prepared_by_name || 'Staff Member';
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Prepared By: ${preparedByName}`, marginX, currentY);
  }

  // 11. Trigger Download or Open Preview in New Tab
  const sanitizedCustomerName = (quotation.customer_name || 'Customer')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  
  const filename = `TT-Quotation-${quotation.quotation_number}-${sanitizedCustomerName}.pdf`;

  if (download) {
    doc.save(filename);
  } else {
    // Open in a new tab for previewing
    const string = doc.output('bloburl');
    window.open(string, '_blank');
  }
}
