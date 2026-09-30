import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export interface InvoiceData {
  invoiceId: string;
  date: Date;
  dueDate?: Date;
  user: {
    name: string;
    email: string;
    address?: string;
    phone?: string;
  };
  items: {
    description: string;
    amount: number;
    quantity?: number;
    price?: number;
  }[];
  subTotal: number;
  discount?: number;
  discountLabel?: string;
  tax?: number;
  total: number;
  amountDue?: number;
  currency: string;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  // Load font from filesystem to avoid internal pdfkit resolution issues in Next.js
  const fontPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'noto-sans-v27-latin-regular.ttf');
  const fontBuffer = await fs.promises.readFile(fontPath);

  return new Promise((resolve, reject) => {
    // Use the loaded font buffer as default
    const doc = new PDFDocument({ margin: 40, size: 'A4', font: fontBuffer }); 
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    // --- Configuration from Env ---
    const companyName = process.env.COMPANY_NAME || 'dailychatai';
    const companyAddress1 = process.env.COMPANY_ADDRESS_LINE1 || '';
    const companyAddress2 = process.env.COMPANY_ADDRESS_LINE2 || '';
    const companyTaxId = process.env.COMPANY_TAX_ID || '';
    const companyBusinessNum = process.env.COMPANY_BUSINESS_NUM || '';
    const companyPhone = process.env.COMPANY_PHONE || '';
    const companyCountry = process.env.COMPANY_COUNTRY || '';
    const logoPathRel = process.env.COMPANY_LOGO_PATH || 'public/logo.png';
    const logoPath = path.join(process.cwd(), logoPathRel);

    // --- Header ---
    let y = 40;

    // Logo (Top Left)
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, y, { width: 150 });
    } else {
        doc.fontSize(20).text(companyName, 40, y);
    }

    // Company Details (Top Right)
    doc.fontSize(10);
    const rightX = 350;
    const rightWidth = 200;
    
    doc.text(companyName, rightX, y, { align: 'right', width: rightWidth });
    y += 15;
    if (companyBusinessNum) {
        doc.text(`Business Number: ${companyBusinessNum}`, rightX, y, { align: 'right', width: rightWidth });
        y += 15;
    }
    if (companyTaxId) {
        doc.text(`Tax/Vat Number: ${companyTaxId}`, rightX, y, { align: 'right', width: rightWidth });
        y += 15;
    }
    if (companyAddress1) {
        doc.text(companyAddress1, rightX, y, { align: 'right', width: rightWidth });
        y += 15;
    }
    if (companyAddress2) {
        doc.text(companyAddress2, rightX, y, { align: 'right', width: rightWidth });
        y += 15;
    }
    if (companyPhone) {
        doc.text(companyPhone, rightX, y, { align: 'right', width: rightWidth });
        y += 15;
    }
    if (companyCountry) {
        doc.text(companyCountry, rightX, y, { align: 'right', width: rightWidth });
        y += 15;
    }

    // Divider Line
    y = Math.max(y, 120) + 20;
    doc.moveTo(40, y).lineTo(550, y).strokeColor('#eeeeee').stroke();
    y += 20;

    // --- Bill To & Invoice Details ---
    const leftColX = 40;
    
    // START OF SECTION - Ensure y is set correctly
    // We can use y as the top for both columns
    const sectionTopY = y;

    // Left Col (Bill To)
    doc.fontSize(10).fillColor('#666666').text('Bill to', leftColX, sectionTopY);
    let billY = sectionTopY + 20;
    doc.fontSize(12).fillColor('#000000').text(data.user.name || 'Valued Customer', leftColX, billY);
    billY += 18;
    doc.fontSize(10);
    if (data.user.address) {
        doc.text(data.user.address, leftColX, billY, { width: 250 });
        billY += doc.heightOfString(data.user.address, { width: 250 }) + 5;
    }
    doc.text(data.user.email, leftColX, billY);
    billY += 15;
    if (data.user.phone) {
        doc.text(data.user.phone, leftColX, billY);
        billY += 15;
    }

    // Right Col (Invoice Stats)
    let invY = sectionTopY;
    const labelWidth = 100;
    const valWidth = 140; // Increased width for values (e.g. UUID)
    const invRightAlign = 550; // Right edge

    function drawInvoiceRow(label: string, value: string) {
        // Calculate height required for value
        const valHeight = doc.heightOfString(value, { width: valWidth, align: 'right' });
        const rowHeight = Math.max(valHeight, 15);
        
        doc.text(label, invRightAlign - valWidth - labelWidth, invY, { width: labelWidth, align: 'right' });
        doc.text(value, invRightAlign - valWidth, invY, { width: valWidth, align: 'right' });
        invY += rowHeight + 5; // Add spacing
    }

    // Shorten Invoice ID for display if it's a long UUID (36 chars)
    const displayInvoiceId = data.invoiceId.length > 20 ? data.invoiceId.substring(0, 18) + '...' : data.invoiceId;

    drawInvoiceRow('Invoice number:', displayInvoiceId);
    drawInvoiceRow('Invoice date:', data.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    if (data.dueDate) {
        drawInvoiceRow('Due date:', data.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    }
    // Status - manual position or add to row
    doc.text('On Receipt', invRightAlign - valWidth, invY, { width: valWidth, align: 'right' });
    invY += 20;

    // Move Y to below the lowest of the two columns
    y = Math.max(billY, invY) + 30;

    // --- Items Table ---
    const tableTop = y;
    
    // Headers
    doc.fontSize(10).fillColor('#000000');
    doc.text('Items', 40, tableTop);
    doc.text('Price', 300, tableTop, { align: 'right', width: 60 });
    doc.text('Quantity', 380, tableTop, { align: 'right', width: 60 });
    doc.text('Amount', 460, tableTop, { align: 'right', width: 90 });

    y += 20;
    doc.moveTo(40, y).lineTo(550, y).strokeColor('#eeeeee').stroke();
    y += 15;

    // Rows
    data.items.forEach(item => {
        const descY = y;
        doc.text(item.description, 40, y, { width: 240 });
        
        // Calculate height of description to know where to place next row
        const descHeight = doc.heightOfString(item.description, { width: 240 });
        
        const price = item.price || item.amount; // fallback if price not set
        const qty = item.quantity || 1;
        
        doc.text(`${data.currency.toUpperCase()} ${price.toFixed(2)}`, 300, y, { align: 'right', width: 60 });
        doc.text(String(qty), 380, y, { align: 'right', width: 60 });
        doc.text(`${data.currency.toUpperCase()} ${item.amount.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
        
        y += Math.max(descHeight, 20) + 10;
    });

    y += 10;
    doc.moveTo(40, y).lineTo(550, y).strokeColor('#eeeeee').stroke();
    y += 20;

    // --- Totals ---
    const totalLabelX = 350;
    const totalValX = 460;
    const totalValWidth = 90;

    function drawTotalRow(label: string, value: number, isBold = false) {
        // Note: Bold font not available, using regular
        
        doc.text(label, totalLabelX, y, { align: 'right', width: 100 });
        doc.text(`${data.currency.toUpperCase()} ${(value || 0).toFixed(2)}`, totalValX, y, { align: 'right', width: totalValWidth });
        
        y += 20;
    }

    drawTotalRow('Sub Total', data.subTotal || data.total);
    if (data.discount) {
        drawTotalRow(data.discountLabel || 'Discount', data.discount);
    }
    if (data.tax) {
        drawTotalRow('Tax', data.tax);
    }
    
    y += 5;
    doc.moveTo(totalLabelX, y).lineTo(550, y).strokeColor('#eeeeee').stroke();
    y += 10;

    drawTotalRow('Grand Total', data.total, true);
    drawTotalRow('Amount Due', data.amountDue || data.total, true);

    doc.end();
  });
}
