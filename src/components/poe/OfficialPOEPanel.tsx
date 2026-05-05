import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Download,
  FileText,
  PenLine,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export type OfficialSubmissionStatus = 'missing' | 'submitted' | 'verified';

export interface OfficialPoeRequirementRow {
  id: string;
  title: string;
  category: 'admin' | 'workbook' | 'summative';
  submission: OfficialSubmissionStatus;
  facilitatorMarkedSigned?: boolean;
  assessorMarkedSigned?: boolean;
  moderatorMarkedSigned?: boolean | 'na';
}

interface OfficialPOEPanelProps {
  rows: OfficialPoeRequirementRow[];
  canCompile: boolean;
  blockingReasons: string[];
  onCompileDownload: () => void;
}

export function OfficialPOEPanel({
  rows,
  canCompile,
  blockingReasons,
  onCompileDownload,
}: OfficialPOEPanelProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Official POE package (SETA / certification)
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Download bundles a cover sheet plus triplicate marking pages for the
            learner workbook and summative (facilitator / assessor / moderator) in
            blue, red, and green “ink” with remarks. Attach the SDP’s instrument
            PDFs per programme from the learning library. Administrative documents
            (CV, address, affidavit, Grade 12) are tracked in the LMS separately.
            Moderator sign-off is optional unless your programme assigns one.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 bg-brand-navy text-white disabled:opacity-50"
          disabled={!canCompile}
          leftIcon={<Download className="h-4 w-4" />}
          onClick={onCompileDownload}>
          Compile &amp; download
        </Button>
      </div>

      {!canCompile && blockingReasons.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 text-sm text-amber-900 flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Not ready to compile</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-900/90">
              {blockingReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li
            key={row.id}
            className="px-4 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex gap-3 min-w-0">
              <FileText className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900">{row.title}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  {row.category === 'admin' && (
                    <span>
                      Submission:{' '}
                      <Badge
                        variant={
                          row.submission === 'verified'
                            ? 'success'
                            : row.submission === 'submitted'
                              ? 'info'
                              : 'danger'
                        }
                        className="text-[10px]">
                        {row.submission}
                      </Badge>
                    </span>
                  )}
                  {row.category === 'workbook' && (
                    <>
                      <span>
                        Submitted:{' '}
                        <Badge
                          variant={
                            row.submission === 'verified' ? 'success' : 'warning'
                          }
                          className="text-[10px]">
                          {row.submission}
                        </Badge>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <PenLine className="h-3.5 w-3.5" />
                        Facilitator marked &amp; signed:{' '}
                        {row.facilitatorMarkedSigned ? (
                          <CheckCircle className="h-4 w-4 text-green-600 inline" />
                        ) : (
                          <span className="text-amber-700">Required</span>
                        )}
                      </span>
                    </>
                  )}
                  {row.category === 'summative' && (
                    <>
                      <span>
                        Submitted:{' '}
                        <Badge
                          variant={
                            row.submission === 'verified' ? 'success' : 'warning'
                          }
                          className="text-[10px]">
                          {row.submission}
                        </Badge>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        Assessor marked &amp; signed:{' '}
                        {row.assessorMarkedSigned ? (
                          <CheckCircle className="h-4 w-4 text-green-600 inline" />
                        ) : (
                          <span className="text-amber-700">Required</span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        Moderator (optional):{' '}
                        {row.moderatorMarkedSigned === 'na' ? (
                          <span className="text-slate-500">Not assigned</span>
                        ) : row.moderatorMarkedSigned ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 inline" />
                        ) : (
                          <span className="text-slate-600">Pending</span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
