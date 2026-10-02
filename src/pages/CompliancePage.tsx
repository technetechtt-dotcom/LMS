import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ComplianceGauge } from '../components/dashboard/ComplianceGauge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { complianceService, reportsService } from '../services/api';
import type { ComplianceDocument } from '../types';
import { downloadJson, triggerDownload } from '../utils/downloadJson';
import { openFileUrl } from '../utils/exportData';

type DecisionStatus = 'NOT_REVIEWED' | 'IN_REVIEW' | 'SATISFIED' | 'ACTION_REQUIRED';
type ChecklistItem = {
  id: string;
  label: string;
  status: DecisionStatus;
  notes: string;
  evidenceDocumentIds: string[];
};
type ComplianceAlert = Awaited<ReturnType<typeof complianceService.getAlerts>>['data'][number];

const initialChecklist: ChecklistItem[] = [
  { id: 'learner-registration', label: 'Learner Registration Data (NLRD Format)', status: 'NOT_REVIEWED', notes: '', evidenceDocumentIds: [] },
  { id: 'assessment-instruments', label: 'Assessment Guides & Instruments Approved', status: 'NOT_REVIEWED', notes: '', evidenceDocumentIds: [] },
  { id: 'moderation-reports', label: 'Moderation Reports Signed', status: 'NOT_REVIEWED', notes: '', evidenceDocumentIds: [] },
  { id: 'workplace-logbooks', label: 'Workplace Logbooks Up to Date', status: 'NOT_REVIEWED', notes: '', evidenceDocumentIds: [] },
  { id: 'health-safety', label: 'Health & Safety Compliance Certificate', status: 'NOT_REVIEWED', notes: '', evidenceDocumentIds: [] },
];

export function CompliancePage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [alertEvidence, setAlertEvidence] = useState<Record<string, string[]>>({});
  const [alertNotes, setAlertNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string>();
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    const [docs, decisions, alertResponse] = await Promise.all([
      complianceService.getDocuments(),
      complianceService.getDecisions(),
      complianceService.getAlerts(),
    ]);
    const decisionByControl = new Map((decisions.data ?? []).map((decision) => [decision.controlKey, decision]));
    setDocuments(docs.data ?? []);
    setChecklist(initialChecklist.map((item) => {
      const decision = decisionByControl.get(item.id);
      return decision ? {
        ...item,
        status: decision.status,
        notes: decision.notes ?? '',
        evidenceDocumentIds: decision.evidenceDocumentIds ?? [],
      } : item;
    }));
    setAlerts((alertResponse.data ?? []).filter((alert) => alert.status !== 'RESOLVED'));
  };

  useEffect(() => {
    void load().catch(() => toast.error('Could not load authoritative compliance records'));
  }, []);

  const verifiedDocuments = useMemo(
    () => documents.filter((document) => document.uploadStatus === 'VERIFIED'),
    [documents],
  );
  const satisfiedCount = checklist.filter((item) => item.status === 'SATISFIED').length;
  const allSatisfied = satisfiedCount === checklist.length;
  const complianceScore = Math.round((satisfiedCount / checklist.length) * 100);

  const updateChecklist = (id: string, patch: Partial<ChecklistItem>) => {
    setChecklist((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const saveDecision = async (item: ChecklistItem, status: DecisionStatus) => {
    if (status === 'SATISFIED' && item.evidenceDocumentIds.length === 0) {
      toast.error('Select at least one verified evidence document first');
      return;
    }
    setSaving(item.id);
    try {
      await complianceService.recordDecision(item.id, status, item.notes, item.evidenceDocumentIds);
      updateChecklist(item.id, { status });
      toast.success('Compliance decision persisted');
    } catch {
      toast.error('The compliance decision was not saved');
    } finally {
      setSaving(undefined);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    setSaving(id);
    try {
      await complianceService.acknowledgeAlert(id);
      setAlerts((rows) => rows.map((row) => row.id === id ? {
        ...row,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date().toISOString(),
      } : row));
      toast.success('Alert acknowledgement persisted');
    } catch {
      toast.error('Alert acknowledgement was not saved');
    } finally {
      setSaving(undefined);
    }
  };

  const resolveAlert = async (id: string) => {
    const evidenceDocumentIds = alertEvidence[id] ?? [];
    const notes = alertNotes[id]?.trim() ?? '';
    if (!notes || evidenceDocumentIds.length === 0) {
      toast.error('Resolution notes and verified evidence are required');
      return;
    }
    setSaving(id);
    try {
      await complianceService.resolveAlert(id, notes, evidenceDocumentIds);
      setAlerts((rows) => rows.filter((row) => row.id !== id));
      toast.success('Alert resolution persisted');
    } catch {
      toast.error('The alert was not resolved');
    } finally {
      setSaving(undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance & Quality Assurance</h1>
          <p className="text-sm text-gray-500">Decisions, evidence, scanner state, and alerts shown here are loaded from the backend.</p>
        </div>
        <Button
          leftIcon={<Download className="h-4 w-4" />}
          onClick={async () => {
            try {
              const [snap, file] = await Promise.all([reportsService.getSetaSnapshot(), reportsService.downloadSnapshot('pdf')]);
              triggerDownload(file.blob, file.filename || 'compliance-report.pdf');
              downloadJson('compliance-report.json', { checklist, documents, alerts, setaSnapshot: snap.data, exportedAt: new Date().toISOString() });
              toast.success('Internal compliance evidence exported');
            } catch {
              toast.error('Export failed');
            }
          }}
        >
          Export Internal Evidence
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-8 lg:col-span-1">
          <ComplianceGauge score={complianceScore} label="Controls with persisted satisfactory decisions" size="lg" />
          <span className={`mt-6 inline-flex rounded-full px-3 py-1 text-sm font-medium ${allSatisfied ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {allSatisfied ? 'All controls marked satisfactory' : 'Compliance review incomplete'}
          </span>
        </Card>
        <Card title="Evidence verification" className="lg:col-span-2">
          <ProgressBar value={complianceScore} label="Persisted checklist decisions" variant="success" />
          <div className="mt-5 space-y-2">
            {documents.length === 0 && <p className="text-sm text-gray-500">No compliance evidence has been uploaded.</p>}
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between rounded border border-gray-200 p-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{document.name}</p>
                  <p className="text-xs text-gray-500">{document.category}</p>
                </div>
                <div className="text-right text-xs">
                  <p className={document.uploadStatus === 'VERIFIED' ? 'font-medium text-green-700' : 'font-medium text-amber-700'}>{document.uploadStatus ?? 'UNKNOWN'}</p>
                  <p className="text-gray-500">Scanner: {document.scanResult ?? 'not recorded'}</p>
                  {document.verifiedAt && <p className="text-gray-500">Verified {new Date(document.verifiedAt).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Persisted Non-Compliance Alerts">
          <div className="space-y-4">
            {alerts.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No open compliance alerts.</p>}
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-md border-l-4 border-amber-500 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{alert.details || alert.controlKey}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">Status: {alert.status}</p>
                    <textarea className="mt-3 w-full rounded border-gray-300 text-sm" rows={2} value={alertNotes[alert.id] ?? ''} onChange={(event) => setAlertNotes((notes) => ({ ...notes, [alert.id]: event.target.value }))} placeholder="Resolution notes" />
                    <EvidenceSelector documents={verifiedDocuments} value={alertEvidence[alert.id] ?? []} onChange={(ids) => setAlertEvidence((value) => ({ ...value, [alert.id]: ids }))} />
                    <div className="mt-3 flex gap-2">
                      {alert.status === 'OPEN' && <Button size="sm" variant="outline" disabled={saving === alert.id} onClick={() => void acknowledgeAlert(alert.id)}>Acknowledge</Button>}
                      <Button size="sm" disabled={saving === alert.id} onClick={() => void resolveAlert(alert.id)}>Resolve with evidence</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Internal Submission Readiness Review">
          <div className="space-y-4">
            {checklist.map((item) => (
              <div key={item.id} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${item.status === 'SATISFIED' ? 'border-brand-navy bg-brand-navy' : 'border-gray-300'}`}>
                    {item.status === 'SATISFIED' && <CheckSquare className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">Persisted status: {item.status}</p>
                  </div>
                </div>
                <textarea className="mt-3 w-full rounded border-gray-300 text-sm" rows={2} value={item.notes} onChange={(event) => updateChecklist(item.id, { notes: event.target.value })} placeholder="Reviewer notes" />
                <EvidenceSelector documents={verifiedDocuments} value={item.evidenceDocumentIds} onChange={(ids) => updateChecklist(item.id, { evidenceDocumentIds: ids })} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={saving === item.id} onClick={() => void saveDecision(item, 'IN_REVIEW')}>Mark in review</Button>
                  <Button size="sm" disabled={saving === item.id} onClick={() => void saveDecision(item, 'SATISFIED')}>Mark satisfied</Button>
                  <Button size="sm" variant="outline" disabled={saving === item.id} onClick={() => void saveDecision(item, 'ACTION_REQUIRED')}>Action required</Button>
                </div>
              </div>
            ))}
            <Button
              className="w-full"
              disabled={!allSatisfied || exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const response = await complianceService.exportSETA('seta', 'pdf');
                  if (response.data?.url) openFileUrl(response.data.url, 'internal submission package');
                  toast.success('Internal package generated');
                } catch {
                  toast.error('Could not generate submission package');
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? 'Generating…' : 'Generate Internal Package'}
            </Button>
            <p className="text-center text-xs text-gray-500">Persisted reviewer decisions do not constitute SETA/QCTO approval.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EvidenceSelector({ documents, value, onChange }: {
  documents: ComplianceDocument[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <label className="mt-3 block text-xs font-medium text-gray-700">
      Verified evidence
      <select multiple className="mt-1 min-h-20 w-full rounded border-gray-300 text-sm" value={value} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>
        {documents.map((document) => <option key={document.id} value={document.id}>{document.name} — {document.scanResult ?? 'verified'}</option>)}
      </select>
      {documents.length === 0 && <span className="mt-1 block font-normal text-amber-700">No scanner-verified evidence is available.</span>}
    </label>
  );
}
