import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Converts a remote or local image URL into a Base64 data URL.
 */
async function getBase64ImageFromUrl(
  imageUrl: string
): Promise<string> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to load image: ${imageUrl} (${response.status} ${response.statusText})`
    );
  }

  const contentType =
    response.headers.get('content-type') || '';

  if (!contentType.startsWith('image/')) {
    throw new Error(
      `Invalid image response from ${imageUrl}. Content-Type: ${contentType}`
    );
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(
          new Error('Failed to convert image to Base64.')
        );
      }
    });

    reader.onerror = () => {
      reject(
        new Error('Failed to convert image to Base64.')
      );
    };

    reader.readAsDataURL(blob);
  });
}

/**
 * Detects whether the Base64 image is PNG or JPEG.
 */
function getImageFormat(
  dataUrl: string
): 'PNG' | 'JPEG' {
  if (
    dataUrl.startsWith('data:image/jpeg') ||
    dataUrl.startsWith('data:image/jpg')
  ) {
    return 'JPEG';
  }

  return 'PNG';
}

/**
 * Formats a number as LKR currency.
 */
function formatCurrency(value: unknown): string {
  const amount = Number(value) || 0;

  return `LKR ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a date for the quotation.
 */
function formatQuotationDate(value: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a rental date using short month names.
 */
function formatRentalDate(value: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Draws a justified paragraph.
 *
 * The final line is left aligned because stretching the final
 * line usually creates very large spaces between words.
 */
function drawJustifiedText(
  doc: jsPDF,
  text: string,
  startX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  const cleanText = text
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    return startY;
  }

  const lines = doc.splitTextToSize(
    cleanText,
    maxWidth
  ) as string[];

  let currentLineY = startY;

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    const isLastLine =
      lineIndex === lines.length - 1;

    const words = trimmedLine
      .split(/\s+/)
      .filter(Boolean);

    /*
     * Keep the final line left aligned.
     * Also avoid justification when a line contains
     * fewer than three words.
     */
    if (
      isLastLine ||
      words.length < 3
    ) {
      doc.text(
        trimmedLine,
        startX,
        currentLineY
      );

      currentLineY += lineHeight;
      return;
    }

    const wordsWidth = words.reduce(
      (total, word) =>
        total + doc.getTextWidth(word),
      0
    );

    const gaps = words.length - 1;
    const availableSpacing =
      maxWidth - wordsWidth;

    /*
     * If the calculated spacing is invalid or excessive,
     * render the line normally.
     */
    if (
      availableSpacing <= 0 ||
      gaps <= 0
    ) {
      doc.text(
        trimmedLine,
        startX,
        currentLineY
      );

      currentLineY += lineHeight;
      return;
    }

    const spaceBetweenWords =
      availableSpacing / gaps;

    let currentX = startX;

    words.forEach((word, wordIndex) => {
      doc.text(
        word,
        currentX,
        currentLineY
      );

      currentX +=
        doc.getTextWidth(word);

      if (wordIndex < words.length - 1) {
        currentX += spaceBetweenWords;
      }
    });

    currentLineY += lineHeight;
  });

  return currentLineY;
}

export async function generateQuotationPdf(
  quotation: any,
  download = false
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const contentWidth = 170;

  /*
   * Letterhead background
   */
  const letterheadEnabled =
    quotation.company_snapshot
      ?.letterhead_enabled !== false;

  if (letterheadEnabled) {
    try {
      let base64Letterhead = '';

      try {
        base64Letterhead =
          await getBase64ImageFromUrl(
            '/images/letterhead.png'
          );
      } catch (localImageError) {
        console.warn(
          'Local letterhead could not be loaded:',
          localImageError
        );

        const remoteLetterheadUrl =
          quotation.company_snapshot
            ?.letterhead_image_url;

        if (remoteLetterheadUrl) {
          base64Letterhead =
            await getBase64ImageFromUrl(
              remoteLetterheadUrl
            );
        }
      }

      if (base64Letterhead) {
        doc.addImage(
          base64Letterhead,
          getImageFormat(
            base64Letterhead
          ),
          0,
          0,
          pageWidth,
          pageHeight,
          undefined,
          'FAST'
        );
      }
    } catch (error) {
      console.error(
        'Error loading letterhead background image:',
        error
      );
    }
  }

  let currentY = 52;

  /*
   * Quotation heading
   */
  doc.setTextColor(0, 0, 0);
  doc.setFont(
    'Helvetica',
    'bold'
  );
  doc.setFontSize(22);

  doc.text(
    'Quotation',
    marginX,
    currentY
  );

  currentY += 8;

  /*
   * Customer and quotation-date metadata box
   */
  const metadataBoxHeight = 13;
  const metadataDividerX = 110;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  doc.rect(
    marginX,
    currentY,
    contentWidth,
    metadataBoxHeight
  );

  doc.line(
    metadataDividerX,
    currentY,
    metadataDividerX,
    currentY + metadataBoxHeight
  );

  doc.setFontSize(9);

  doc.setFont(
    'Helvetica',
    'bold'
  );

  doc.text(
    'TO :',
    marginX + 3,
    currentY + 4
  );

  doc.setFont(
    'Helvetica',
    'normal'
  );

  doc.text(
    quotation.customer_name ||
      'Whom May Concern',
    marginX + 15,
    currentY + 4
  );

  const startDate =
    formatRentalDate(
      quotation.rental_start_date
    );

  const endDate =
    formatRentalDate(
      quotation.rental_end_date
    );

  const rentalPeriod =
    startDate && endDate
      ? `${startDate} - ${endDate}`
      : 'Rental Period';

  doc.setFont(
    'Helvetica',
    'bold'
  );

  doc.text(
    rentalPeriod,
    marginX + 15,
    currentY + 9
  );

  doc.setFont(
    'Helvetica',
    'bold'
  );

  doc.text(
    'Date:',
    metadataDividerX + 3,
    currentY + 4
  );

  doc.setFont(
    'Helvetica',
    'normal'
  );

  const quotationDate =
    formatQuotationDate(
      quotation.quotation_date
    );

  doc.text(
    quotationDate,
    metadataDividerX + 15,
    currentY + 4
  );

  currentY += 16;

  /*
   * Vehicle and pricing table
   */
  const vehicle =
    quotation.vehicle_snapshot || {};

  const vehicleName =
    vehicle.name ||
    `${vehicle.brand || ''} ${
      vehicle.model || ''
    }`.trim() ||
    'Vehicle';

  const vehicleDescription =
    vehicleName.toUpperCase();

  const extraKmText =
    Number(
      quotation.extra_km_rate
    ) > 0
      ? `(Rs.${Number(
          quotation.extra_km_rate
        ).toLocaleString(
          'en-US'
        )}/- per extra kilometer)`
      : '';

  const tableBody: any[] = [
    [
      {
        content: `${vehicleDescription}${
          extraKmText
            ? `\n${extraKmText}`
            : ''
        }`,
        styles: {
          fontStyle: 'bold',
          halign: 'left',
        },
      },
      vehicle.year || '',
      formatCurrency(
        quotation.daily_rate
      ),
      formatCurrency(
        quotation.rental_total
      ),
    ],
    [
      'Refundable Deposit',
      '',
      '',
      formatCurrency(
        quotation.refundable_deposit
      ),
    ],
  ];

  if (
    Number(
      quotation.additional_charges
    ) > 0
  ) {
    tableBody.push([
      'Additional Charges',
      '',
      '',
      formatCurrency(
        quotation.additional_charges
      ),
    ]);
  }

  if (
    Number(
      quotation.tax_amount
    ) > 0
  ) {
    tableBody.push([
      'Tax Charges',
      '',
      '',
      formatCurrency(
        quotation.tax_amount
      ),
    ]);
  }

  if (
    Number(
      quotation.discount
    ) > 0
  ) {
    tableBody.push([
      'Discount',
      '',
      '',
      `- ${formatCurrency(
        quotation.discount
      )}`,
    ]);
  }

  tableBody.push([
    {
      content: '',
      styles: {
        lineWidth: 0,
      },
    },
    {
      content: '',
      styles: {
        lineWidth: 0,
      },
    },
    {
      content: '',
      styles: {
        lineWidth: 0,
      },
    },
    {
      content: formatCurrency(
        quotation.grand_total
      ),
      styles: {
        fontStyle: 'bold',
        halign: 'center',
      },
    },
  ]);

  autoTable(doc, {
    startY: currentY,

    margin: {
      left: marginX,
      right: marginX,
    },

    theme: 'plain',

    head: [
      [
        'DESCRIPTION',
        'YEAR',
        'PER DAY RATE',
        'TOTAL',
      ],
    ],

    body: tableBody,

    styles: {
      font: 'Helvetica',
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: 'middle',
    },

    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
    },

    columnStyles: {
      0: {
        cellWidth: 80,
        halign: 'left',
        valign: 'middle',
      },
      1: {
        cellWidth: 15,
        halign: 'center',
        valign: 'middle',
      },
      2: {
        cellWidth: 35,
        halign: 'center',
        valign: 'middle',
      },
      3: {
        cellWidth: 40,
        halign: 'center',
        valign: 'middle',
      },
    },

    didDrawPage: (data) => {
      if (data.cursor?.y) {
        currentY =
          data.cursor.y + 8;
      }
    },
  });

  /*
   * Special notes
   */
  const specialNotes =
    Array.isArray(
      quotation.special_notes
    )
      ? quotation.special_notes
      : [];

  if (specialNotes.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFont(
      'Helvetica',
      'bold'
    );
    doc.setFontSize(9);

    doc.rect(
      marginX,
      currentY,
      contentWidth,
      5
    );

    doc.text(
      'SPECIAL NOTES',
      marginX + 3,
      currentY + 3.6
    );

    currentY += 10;

    doc.setFont(
      'Helvetica',
      'normal'
    );
    doc.setFontSize(8.5);

    specialNotes.forEach(
      (note: string) => {
        const text =
          typeof note === 'string'
            ? note.trim()
            : '';

        if (!text) {
          return;
        }

        const splitNote =
          doc.splitTextToSize(
            `• ${text}`,
            162
          );

        doc.text(
          splitNote,
          marginX + 4,
          currentY
        );

        currentY +=
          splitNote.length * 4.5;
      }
    );

    currentY += 4;
  }

  /*
   * Important note — justified text only
   */
  if (quotation.important_notes) {
    doc.setTextColor(0, 0, 0);

    doc.setFont(
      'Helvetica',
      'bold'
    );

    doc.setFontSize(9);

    doc.rect(
      marginX,
      currentY,
      contentWidth,
      5
    );

    doc.text(
      'IMPORTANT',
      marginX + 3,
      currentY + 3.6
    );

    currentY += 10;

    doc.setFont(
      'Helvetica',
      'normal'
    );

    doc.setFontSize(8.5);

    const importantText =
      String(
        quotation.important_notes
      );

    currentY =
      drawJustifiedText(
        doc,
        importantText,
        marginX + 4,
        currentY,
        162,
        4.5
      );

    currentY += 5;
  }

  /*
   * Bank details and QR code
   */
  const bank =
    quotation.bank_snapshot || {};

  if (
    bank.bank_name ||
    bank.bank_account_number
  ) {
    const bankBoxWidth = 75;
    const bankBoxHeight = 35;

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    doc.rect(
      marginX,
      currentY,
      bankBoxWidth,
      bankBoxHeight
    );

    doc.setFont(
      'Helvetica',
      'bold'
    );

    doc.setFontSize(9);

    doc.text(
      'BANK DETAILS',
      marginX + 3,
      currentY + 5
    );

    doc.setFont(
      'Helvetica',
      'normal'
    );

    doc.setFontSize(8.5);

    doc.text(
      bank.bank_account_name ||
        'Thennakoon Tours (Pvt) Ltd',
      marginX + 3,
      currentY + 11
    );

    doc.text(
      `Account # ${
        bank.bank_account_number ||
        ''
      }`,
      marginX + 3,
      currentY + 17
    );

    doc.text(
      `${bank.bank_name || ''}${
        bank.bank_branch
          ? ` - ${bank.bank_branch}`
          : ''
      }`,
      marginX + 3,
      currentY + 23
    );

    doc.text(
      `Swift Code : ${
        bank.bank_swift_code || ''
      }`,
      marginX + 3,
      currentY + 29
    );

    const qr =
      quotation.qr_snapshot || {};

    if (
      qr.enabled &&
      qr.qr_image_url
    ) {
      try {
        const base64Qr =
          await getBase64ImageFromUrl(
            qr.qr_image_url
          );

        const qrX =
          marginX +
          bankBoxWidth +
          15;

        doc.addImage(
          base64Qr,
          getImageFormat(
            base64Qr
          ),
          qrX,
          currentY,
          32,
          32
        );

        doc.setTextColor(0, 0, 0);

        doc.setFont(
          'Helvetica',
          'bold'
        );

        doc.setFontSize(8);

        doc.text(
          qr.label ||
            'WhatsApp Payment Slip',
          qrX,
          currentY + 34
        );
      } catch (error) {
        console.error(
          'Error drawing QR code in PDF:',
          error
        );
      }
    }

    currentY +=
      bankBoxHeight + 8;
  }

  /*
   * Prepared-by signature block
   */
  if (currentY < 250) {
    const preparedByName =
      quotation.prepared_by_name ||
      'Staff Member';

    const preparedByRole =
      quotation.prepared_by_role ||
      '';

    doc.setTextColor(0, 0, 0);

    doc.setFont(
      'Helvetica',
      'bold'
    );

    doc.setFontSize(9);

    doc.text(
      'Prepared By:',
      marginX,
      currentY
    );

    currentY += 5;

    doc.setFont(
      'Helvetica',
      'bold'
    );

    doc.setFontSize(10);

    doc.text(
      preparedByName,
      marginX,
      currentY
    );

    if (preparedByRole) {
      currentY += 4.5;

      doc.setFont(
        'Helvetica',
        'normal'
      );

      doc.setFontSize(8.5);

      doc.setTextColor(
        80,
        80,
        80
      );

      doc.text(
        preparedByRole,
        marginX,
        currentY
      );
    }

    currentY += 4.5;

    doc.setFont(
      'Helvetica',
      'normal'
    );

    doc.setFontSize(8);

    doc.setTextColor(
      100,
      100,
      100
    );

    doc.text(
      'Thennakoon Tours (Pvt) Ltd',
      marginX,
      currentY
    );

    doc.setTextColor(0, 0, 0);
  }

  /*
   * Download or preview
   */
  const sanitizedCustomerName =
    (
      quotation.customer_name ||
      'Customer'
    )
      .replace(
        /[^a-z0-9]/gi,
        '_'
      )
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();

  const quotationNumber =
    quotation.quotation_number ||
    'QT';

  const filename =
    `TT-Quotation-${quotationNumber}-${sanitizedCustomerName}.pdf`;

  if (download) {
    doc.save(filename);
    return;
  }

  const pdfBlob =
    doc.output('blob');

  const pdfUrl =
    URL.createObjectURL(pdfBlob);

  const previewWindow =
    window.open(
      pdfUrl,
      '_blank',
      'noopener,noreferrer'
    );

  if (!previewWindow) {
    URL.revokeObjectURL(pdfUrl);

    throw new Error(
      'PDF preview was blocked by the browser. Please allow pop-ups for this website.'
    );
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 60_000);
}
