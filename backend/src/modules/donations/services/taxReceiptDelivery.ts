import { sendMail } from '@services/emailService';
import type { TaxReceiptDeliverySummary } from '@app-types/taxReceipt';
import { escapeHtml } from '@services/site-generator/escapeHtml';
import {
  buildReceiptFilename,
  mapReceiptRow,
  type TaxReceiptRow,
} from './taxReceiptModels';

export const attemptTaxReceiptEmailDelivery = async (args: {
  receipt: TaxReceiptRow;
  pdfContent: Buffer;
  recipientEmail: string | null;
  payeeName: string;
  updateEmailDeliveryStatus(
    receiptId: string,
    status: 'sent' | 'failed',
    errorMessage?: string | null
  ): Promise<void>;
}): Promise<TaxReceiptDeliverySummary> => {
  if (!args.recipientEmail) {
    await args.updateEmailDeliveryStatus(args.receipt.id, 'failed', 'No recipient email available');
    return {
      requested: true,
      sent: false,
      status: 'failed',
      recipientEmail: args.recipientEmail,
      warning: 'No recipient email is available for this receipt.',
    };
  }

  const subject =
    args.receipt.kind === 'annual_summary_reprint'
      ? `Donation summary ${args.receipt.receipt_number}`
      : `Official donation receipt ${args.receipt.receipt_number}`;
  const escapedPayeeName = escapeHtml(args.payeeName);

  const sent = await sendMail({
    to: args.recipientEmail,
    subject,
    text: [
      `Hello ${args.payeeName},`,
      '',
      args.receipt.kind === 'annual_summary_reprint'
        ? 'Please find your donation summary attached.'
        : 'Please find your official donation receipt attached.',
      '',
      `Receipt number: ${args.receipt.receipt_number}`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p>Hello ${escapedPayeeName},</p>
        <p>${
          args.receipt.kind === 'annual_summary_reprint'
            ? 'Please find your donation summary attached.'
            : 'Please find your official donation receipt attached.'
        }</p>
        <p><strong>Receipt number:</strong> ${args.receipt.receipt_number}</p>
      </div>
    `,
    attachments: [
      {
        filename: buildReceiptFilename(mapReceiptRow(args.receipt)),
        content: args.pdfContent,
        contentType: 'application/pdf',
      },
    ],
  });

  if (sent) {
    await args.updateEmailDeliveryStatus(args.receipt.id, 'sent', null);
    return {
      requested: true,
      sent: true,
      status: 'sent',
      recipientEmail: args.recipientEmail,
    };
  }

  await args.updateEmailDeliveryStatus(
    args.receipt.id,
    'failed',
    'Unable to send receipt email with the current SMTP configuration'
  );
  return {
    requested: true,
    sent: false,
    status: 'failed',
    recipientEmail: args.recipientEmail,
    warning: 'The receipt was created, but the email could not be sent.',
  };
};
