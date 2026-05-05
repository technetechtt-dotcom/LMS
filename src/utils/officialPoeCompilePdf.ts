import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';

/** Pen colours mimicking physical red / blue / green marking on originals */
export const POE_PEN = {
  facilitator: rgb(0.06, 0.28, 0.72),
  assessor: rgb(0.78, 0.1, 0.18),
  moderator: rgb(0.02, 0.48, 0.32),
  muted: rgb(0.42, 0.42, 0.42),
  black: rgb(0.12, 0.12, 0.12),
} as const;

const POE_MODULE_CONTEXT_LINE =
  'Per enrolled knowledge module — workbook & summative instruments follow SDP curriculum and naming.';

export interface PoeRoleMarking {
  name: string;
  date: string;
  /** Optional — omit or empty when there were no remarks */
  remark?: string;
}

/** Used on the appended “marking & sign-off” page for each digitised instrument */
export interface PoeDocumentMarking {
  facilitator: PoeRoleMarking;
  assessor: PoeRoleMarking;
  moderator: PoeRoleMarking;
}

export interface OfficialPoeCompileMeta {
  workbook: PoeDocumentMarking;
  summative: PoeDocumentMarking;
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (out.length >= maxLines) break;
    let piece = w;
    if (piece.length > maxChars) {
      if (cur) {
        out.push(cur);
        cur = '';
      }
      while (piece.length > maxChars && out.length < maxLines) {
        out.push(piece.slice(0, maxChars - 1) + '…');
        piece = piece.slice(maxChars - 1);
      }
      cur = piece;
      continue;
    }
    const trial = cur ? `${cur} ${piece}` : piece;
    if (trial.length <= maxChars) {
      cur = trial;
    } else {
      if (cur) out.push(cur);
      cur = piece;
    }
  }
  if (cur && out.length < maxLines) out.push(cur);
  while (out.length < maxLines) out.push('');
  return out.slice(0, maxLines);
}

function drawRoleBlock(
  page: ReturnType<PDFDocument['addPage']>,
  fonts: { regular: PDFFont; bold: PDFFont },
  label: string,
  ink: ReturnType<typeof rgb>,
  row: PoeRoleMarking,
  startY: number,
): number {
  let y = startY;
  const sizeTitle = 11;
  const sizeBody = 10;
  const sizeRemark = 9;

  page.drawText(label, {
    x: 44,
    y,
    size: sizeTitle,
    font: fonts.bold,
    color: ink,
  });
  y -= 18;

  page.drawText(`Name: ${row.name}`, {
    x: 52,
    y,
    size: sizeBody,
    font: fonts.regular,
    color: ink,
  });
  y -= 14;
  page.drawText(`Date: ${row.date}`, {
    x: 52,
    y,
    size: sizeBody,
    font: fonts.regular,
    color: ink,
  });
  y -= 14;
  page.drawText('Remark:', {
    x: 52,
    y,
    size: sizeBody,
    font: fonts.bold,
    color: ink,
  });
  y -= 13;

  const remark =
    row.remark?.trim() ||
    'No remarks recorded — treat blank fields as satisfactory unless QA indicates otherwise.';
  const remarkLines = wrapLines(remark, 82, 5);
  for (const line of remarkLines) {
    if (!line) continue;
    page.drawText(line, {
      x: 56,
      y,
      size: sizeRemark,
      font: fonts.regular,
      color: ink,
    });
    y -= 11;
  }
  y -= 8;
  page.drawText('Signature: _________________________________________________', {
    x: 52,
    y,
    size: sizeBody,
    font: fonts.regular,
    color: ink,
  });
  y -= 26;
  return y;
}

async function appendMarkingSheet(
  merged: PDFDocument,
  fonts: { regular: PDFFont; bold: PDFFont },
  docTitle: string,
  marking: PoeDocumentMarking,
): Promise<void> {
  const page = merged.addPage([595.28, 841.89]);
  const height = page.getHeight();
  let y = height - 44;

  page.drawText('OFFICIAL MARKING, REMARKS & SIGN-OFF', {
    x: 44,
    y,
    size: 13,
    font: fonts.bold,
    color: POE_PEN.black,
  });
  y -= 20;
  page.drawText(docTitle, {
    x: 44,
    y,
    size: 11,
    font: fonts.regular,
    color: POE_PEN.black,
  });
  y -= 14;
  page.drawText(POE_MODULE_CONTEXT_LINE, {
    x: 44,
    y,
    size: 8.5,
    font: fonts.regular,
    color: POE_PEN.muted,
  });
  y -= 12;
  page.drawText(
    'Simulated pen colours: facilitator (blue), assessor (red), moderator (green), matching triplicate marking practice.',
    {
      x: 44,
      y,
      size: 8,
      font: fonts.regular,
      color: POE_PEN.muted,
    },
  );
  y -= 28;

  y = drawRoleBlock(
    page,
    fonts,
    'Facilitator (blue ink)',
    POE_PEN.facilitator,
    marking.facilitator,
    y,
  );
  y = drawRoleBlock(
    page,
    fonts,
    'Assessor (red ink)',
    POE_PEN.assessor,
    marking.assessor,
    y,
  );
  drawRoleBlock(
    page,
    fonts,
    'Moderator (green ink)',
    POE_PEN.moderator,
    marking.moderator,
    y,
  );
}

async function addCoverPage(
  merged: PDFDocument,
  fonts: { regular: PDFFont; bold: PDFFont },
  opts: {
    learnerName: string;
    idNumber: string;
    programmeName: string;
  },
): Promise<void> {
  const page = merged.addPage([595.28, 841.89]);
  let y = page.getHeight() - 48;

  page.drawText('OFFICIAL PORTFOLIO OF EVIDENCE — COMPILED PACKAGE', {
    x: 44,
    y,
    size: 14,
    font: fonts.bold,
    color: rgb(0.07, 0.18, 0.38),
  });
  y -= 28;
  page.drawText(`Learner: ${opts.learnerName}`, {
    x: 44,
    y,
    size: 11,
    font: fonts.regular,
    color: POE_PEN.black,
  });
  y -= 16;
  page.drawText(`ID number: ${opts.idNumber}`, {
    x: 44,
    y,
    size: 11,
    font: fonts.regular,
    color: POE_PEN.black,
  });
  y -= 16;
  page.drawText(`Programme: ${opts.programmeName}`, {
    x: 44,
    y,
    size: 11,
    font: fonts.regular,
    color: POE_PEN.black,
  });
  y -= 28;
  page.drawText('Contents of this export', {
    x: 44,
    y,
    size: 12,
    font: fonts.bold,
    color: POE_PEN.black,
  });
  y -= 18;

  const lines = [
    '1. This cover sheet',
    '2. Learner workbook — marking & sign-off page (attach SDP instrument PDFs separately)',
    '3. Summative assessment — marking & sign-off page (attach SDP instrument PDFs separately)',
    '',
    'Administrative documents (CV, proof of address, affidavit, Grade 12) are tracked',
    'separately in the LMS and should be attached per SDP / SETA submission rules.',
  ];
  for (const line of lines) {
    page.drawText(line, {
      x: 44,
      y,
      size: 10,
      font: fonts.regular,
      color: POE_PEN.black,
    });
    y -= line === '' ? 10 : 14;
  }
}

/**
 * Builds a single PDF: cover + workbook marking sheet + summative marking sheet.
 * Physical workbook/summative instruments come from the SDP learning library per programme.
 */
export async function compileOfficialPoePackageBlob(opts: {
  learnerName: string;
  idNumber: string;
  programmeName: string;
  marking: OfficialPoeCompileMeta;
}): Promise<Blob> {
  const merged = await PDFDocument.create();
  const regular = await merged.embedFont(StandardFonts.Helvetica);
  const bold = await merged.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };

  await addCoverPage(merged, fonts, {
    learnerName: opts.learnerName,
    idNumber: opts.idNumber,
    programmeName: opts.programmeName,
  });

  await appendMarkingSheet(
    merged,
    fonts,
    'Learner workbook',
    opts.marking.workbook,
  );

  await appendMarkingSheet(
    merged,
    fonts,
    'Summative assessment',
    opts.marking.summative,
  );

  const bytes = await merged.save();
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}
