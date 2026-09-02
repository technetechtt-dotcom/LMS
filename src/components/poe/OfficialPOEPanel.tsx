import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  Download,
  FileText,
  PenLine,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { poeStageLabel } from '../../utils/poeWorkflow';

export type OfficialSubmissionStatus = 'missing' | 'submitted' | 'verified';

export interface OfficialPoeRequirementRow {
  id: string;
  title: string;
  category: 'admin' | 'workbook' | 'summative';
  submission: OfficialSubmissionStatus;
  artifactId?: string;
  workflowStatus?: string;
  facilitatorMarkedSigned?: boolean;
  assessorMarkedSigned?: boolean;
  moderatorMarkedSigned?: boolean | 'na';
}

interface OfficialPOEPanelProps {
  rows: OfficialPoeRequirementRow[];
  canCompile: boolean;
  blockingReasons: string[];
  onCompileDownload: () => void;
  /** Staff can open the workflow review page for workbook / summative rows. */
  allowReview?: boolean;
}

export function OfficialPOEPanel({
  rows,
  canCompile,
  blockingReasons,
  onCompileDownload,
  allowReview = false,
}: OfficialPOEPanelProps) {
  const navigate = useNavigate();

  const renderWorkflowSignoffs = (row: OfficialPoeRequirementRow) => (
    <>
      <span>
        Submitted:{' '}
        <Badge
          variant={row.submission === 'verified' ? 'success' : 'warning'}
          className="text-[10px]">
          {row.submission}
        </Badge>
      </span>
      {row.workflowStatus && (
        <span className="text-slate-500">
          Stage: {poeStageLabel(row.workflowStatus)}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <PenLine className="h-3.5 w-3.5 text-blue-700" />
        Facilitator:{' '}
        {row.facilitatorMarkedSigned ? (
          <CheckCircle className="h-4 w-4 text-green-600 inline" />
        ) : (
          <span className="text-amber-700">Required</span>
        )}
      </span>
      <span className="inline-flex items-center gap-1">
        <PenLine className="h-3.5 w-3.5 text-red-700" />
        Assessor:{' '}
        {row.assessorMarkedSigned ? (
          <CheckCircle className="h-4 w-4 text-green-600 inline" />
        ) : (
          <span className="text-amber-700">Required</span>
        )}
      </span>
      <span className="inline-flex items-center gap-1">
        <PenLine className="h-3.5 w-3.5 text-emerald-700" />
        Moderator:{' '}
        {row.moderatorMarkedSigned === 'na' ? (
          <span className="text-slate-500">Not assigned</span>
        ) : row.moderatorMarkedSigned ? (
          <CheckCircle className="h-4 w-4 text-emerald-600 inline" />
        ) : (
          <span className="text-slate-600">Pending</span>
        )}
      </span>
    </>
  );
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Official POE package (SETA / certification)
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Download bundles a cover sheet plus triplicate marking pages for the
            learner workbook and summative — each follows learner submit → facilitator
            marks → assessor reviews → moderator approves (blue, red, green ink).
            (CV, address, affidavit, Grade 12) are tracked in the LMS separately.
            Attach the SDP’s instrument PDFs per programme from the learning library.
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
                  {row.category === 'workbook' && renderWorkflowSignoffs(row)}
                  {row.category === 'summative' && renderWorkflowSignoffs(row)}
                </div>
              </div>
            </div>
            {allowReview && row.artifactId && row.category !== 'admin' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(`/poe-artifacts/${row.artifactId}/review`)
                }>
                {row.workflowStatus === 'ISSUED_TO_LEARNER'
                  ? 'Submit'
                  : 'Review workflow'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
