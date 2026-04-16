import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export interface CaseFormPacketAnswerLine {
  sectionTitle: string;
  questionLabel: string;
  value: string;
}

export interface CaseFormPacketInput {
  assignmentTitle: string;
  assignmentDescription?: string | null;
  caseNumber?: string | null;
  caseTitle?: string | null;
  contactName?: string | null;
  submissionNumber: number;
  submittedAt: string | Date;
  actorLabel: string;
  answers: CaseFormPacketAnswerLine[];
}

const PAGE = {
  width: 612,
  height: 792,
  margin: 48,
  lineHeight: 16,
};

const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'case-form-response';

const formatTimestamp = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown submission time';
  }

  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
};

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }

      let chunk = '';
      for (const char of word) {
        const next = chunk + char;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          chunk = next;
          continue;
        }
        if (chunk) {
          lines.push(chunk);
        }
        chunk = char;
      }
      current = chunk;
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : [''];
};

const drawWrappedBlock = (
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    font: PDFFont;
    size: number;
    lineHeight?: number;
    color?: ReturnType<typeof rgb>;
  }
): number => {
  const lines = wrapText(text, options.font, options.size, options.width);
  let y = options.y;
  const lineHeight = options.lineHeight ?? PAGE.lineHeight;

  for (const line of lines) {
    page.drawText(line, {
      x: options.x,
      y,
      size: options.size,
      font: options.font,
      color: options.color ?? rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  }

  return y;
};

export const generateCaseFormResponsePacket = async (
  input: CaseFormPacketInput
): Promise<{ buffer: Buffer; fileName: string }> => {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const ensureSpace = (requiredHeight: number): void => {
    if (y - requiredHeight >= PAGE.margin) {
      return;
    }
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  };

  page.drawText('Case Form Response Packet', {
    x: PAGE.margin,
    y,
    size: 20,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 28;

  const summaryLines = [
    `Form: ${input.assignmentTitle}`,
    input.assignmentDescription ? `Description: ${input.assignmentDescription}` : null,
    input.caseNumber ? `Case: ${input.caseNumber}${input.caseTitle ? ` — ${input.caseTitle}` : ''}` : null,
    input.contactName ? `Client: ${input.contactName}` : null,
    `Submission #: ${input.submissionNumber}`,
    `Submitted at: ${formatTimestamp(input.submittedAt)}`,
    `Submitted by: ${input.actorLabel}`,
  ].filter(Boolean) as string[];

  for (const line of summaryLines) {
    ensureSpace(24);
    y = drawWrappedBlock(page, line, {
      x: PAGE.margin,
      y,
      width: PAGE.width - PAGE.margin * 2,
      font: regular,
      size: 11,
      lineHeight: 15,
    });
    y -= 4;
  }

  y -= 8;

  let currentSection = '';
  for (const answer of input.answers) {
    if (answer.sectionTitle !== currentSection) {
      currentSection = answer.sectionTitle;
      ensureSpace(32);
      page.drawText(currentSection, {
        x: PAGE.margin,
        y,
        size: 14,
        font: bold,
        color: rgb(0, 0, 0),
      });
      y -= 22;
    }

    const questionText = `${answer.questionLabel}:`;
    const answerText = answer.value || '—';
    const questionLines = wrapText(questionText, bold, 11, PAGE.width - PAGE.margin * 2);
    const answerLines = wrapText(answerText, regular, 11, PAGE.width - PAGE.margin * 2);
    const requiredHeight =
      (questionLines.length + answerLines.length) * PAGE.lineHeight + 16;

    ensureSpace(requiredHeight);
    y = drawWrappedBlock(page, questionText, {
      x: PAGE.margin,
      y,
      width: PAGE.width - PAGE.margin * 2,
      font: bold,
      size: 11,
    });
    y = drawWrappedBlock(page, answerText, {
      x: PAGE.margin,
      y,
      width: PAGE.width - PAGE.margin * 2,
      font: regular,
      size: 11,
    });
    y -= 10;
  }

  const bytes = await pdf.save();
  const submittedDate = new Date(input.submittedAt);
  const datePart = Number.isNaN(submittedDate.getTime())
    ? 'undated'
    : submittedDate.toISOString().slice(0, 10);

  return {
    buffer: Buffer.from(bytes),
    fileName: `${sanitizeFileName(input.assignmentTitle)}-${datePart}-submission-${input.submissionNumber}.pdf`,
  };
};

