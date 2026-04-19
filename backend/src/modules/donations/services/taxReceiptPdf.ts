import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatAddressLines, type ReceiptSnapshot } from './taxReceiptModels';

const drawWrappedText = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0)
): number => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const nextWidth = font.widthOfTextAtSize(next, size);
    if (nextWidth > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  let currentY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= size + 4;
  }

  return currentY;
};

export const renderReceiptPdf = async (snapshot: ReceiptSnapshot): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]);
  let y = 748;

  const ensureSpace = (required = 48) => {
    if (y > required) {
      return;
    }
    page = pdfDoc.addPage([612, 792]);
    y = 748;
  };

  const addLine = (
    text: string,
    options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
  ) => {
    ensureSpace();
    const font = options?.bold ? bold : regular;
    const size = options?.size ?? 11;
    y = drawWrappedText(page, text, 48, y, 516, font, size, options?.color ?? rgb(0, 0, 0));
  };

  // Preserve the pre-extraction receipt wording/layout to avoid donor-facing PDF drift.
  addLine(snapshot.title, { bold: true, size: 18 });
  y -= 6;
  addLine(`Receipt Number: ${snapshot.receiptNumber}`, { bold: true });
  addLine(`Issue Date: ${snapshot.issueDate}`);
  if (snapshot.periodStart && snapshot.periodEnd) {
    addLine(`Receipt Period: ${snapshot.periodStart} to ${snapshot.periodEnd}`);
  }
  y -= 8;

  addLine('Organization', { bold: true, size: 13 });
  addLine(snapshot.organization.legalName);
  for (const line of formatAddressLines(snapshot.organization.receiptingAddress)) {
    addLine(line);
  }
  addLine(`Charitable Registration Number: ${snapshot.organization.charitableRegistrationNumber}`);
  addLine(`Issue Location: ${snapshot.organization.receiptIssueLocation}`);
  addLine(
    `Authorized Signer: ${snapshot.organization.authorizedSignerName} (${snapshot.organization.authorizedSignerTitle})`
  );
  addLine(
    `Receipt Contact: ${snapshot.organization.contactEmail} | ${snapshot.organization.contactPhone}`
  );
  y -= 8;

  addLine('Donor', { bold: true, size: 13 });
  addLine(snapshot.payee.name);
  for (const line of formatAddressLines(snapshot.payee.address)) {
    addLine(line);
  }
  if (snapshot.payee.email) {
    addLine(snapshot.payee.email);
  }
  y -= 8;

  addLine('Covered Donations', { bold: true, size: 13 });
  for (const item of snapshot.items) {
    ensureSpace(120);
    addLine(`${item.donationDate}  ${item.donationNumber}  ${item.currency} ${item.amount}`, {
      bold: true,
    });
    if (item.campaignName) {
      addLine(`Campaign: ${item.campaignName}`);
    }
    if (item.designation) {
      addLine(`Designation: ${item.designation}`);
    }
    y -= 4;
  }

  y -= 4;
  addLine(`Eligible Amount: ${snapshot.currency} ${snapshot.totalAmount}`, {
    bold: true,
    size: 13,
  });
  y -= 8;

  addLine('Notes', { bold: true, size: 13 });
  for (const note of snapshot.notes) {
    addLine(note, { color: rgb(0.2, 0.2, 0.2) });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
