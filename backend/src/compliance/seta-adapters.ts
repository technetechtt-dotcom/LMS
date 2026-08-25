/**
 * SETA-specific regulatory adapters.
 * Current exports are internal schema v1 — not certified submission.
 * Plug SETA-specific XSD / acceptance reconciliation here.
 */
export type SetaAdapterId =
  | 'generic-internal'
  | 'merseta'
  | 'services-seta'
  | 'ceta'
  | 'agriseta';

export interface SetaExportResult {
  adapter: SetaAdapterId;
  schemaVersion: string;
  certification: 'internal-not-seta-certified';
  body: string;
  contentType: string;
}

export interface SetaSubmissionReceipt {
  batchId: string;
  status: 'generated' | 'submitted' | 'accepted' | 'rejected';
  externalReference?: string;
  rejectionReasons?: string[];
}

export abstract class SetaRegulatoryAdapter {
  abstract readonly id: SetaAdapterId;
  abstract validateXml(xml: string): { valid: boolean; errors: string[] };
  abstract buildExport(payload: unknown): SetaExportResult;
  abstract reconcile(
    batchId: string,
    externalStatus: string,
  ): SetaSubmissionReceipt;
}

/** Default adapter until a SETA-certified XSD is wired. */
export class GenericInternalSetaAdapter extends SetaRegulatoryAdapter {
  readonly id: SetaAdapterId = 'generic-internal';

  validateXml(xml: string) {
    const errors: string[] = [];
    if (!xml.includes('schemaVersion="1.0"')) {
      errors.push('Missing schemaVersion 1.0');
    }
    if (!xml.includes('internal-not-seta-certified')) {
      errors.push('Missing certification marker');
    }
    return { valid: errors.length === 0, errors };
  }

  buildExport(payload: unknown): SetaExportResult {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return {
      adapter: this.id,
      schemaVersion: '1.0',
      certification: 'internal-not-seta-certified',
      body,
      contentType: 'application/xml',
    };
  }

  reconcile(batchId: string, externalStatus: string): SetaSubmissionReceipt {
    const status: SetaSubmissionReceipt['status'] =
      externalStatus === 'accepted'
        ? 'accepted'
        : externalStatus === 'rejected'
          ? 'rejected'
          : externalStatus === 'generated'
            ? 'generated'
            : 'submitted';
    return { batchId, status };
  }
}

export function resolveSetaAdapter(id?: string): SetaRegulatoryAdapter {
  // Future: switch on merseta / services-seta / etc.
  void id;
  return new GenericInternalSetaAdapter();
}
