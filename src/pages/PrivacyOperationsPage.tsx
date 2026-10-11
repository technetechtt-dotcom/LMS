import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { privacyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type DsarRow = {
  id: string;
  type: string;
  status: string;
  notes?: string | null;
  createdAt?: string;
  dueAt?: string | null;
  completedAt?: string | null;
  assignedToId?: string | null;
  statusHistory?: Array<{ status: string; at: string; notes?: string | null }>;
  subject?: { id: string; email: string; firstName: string; lastName: string };
};

type IncidentRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignedToId?: string | null;
  resolutionNotes?: string | null;
  timeline?: Array<{ event: string; at: string; notes?: string | null }>;
  createdAt?: string;
  resolvedAt?: string | null;
};

export function PrivacyOperationsPage() {
  const { user } = useAuth();
  const canEditRetention = user?.role === 'Admin';
  const [dsars, setDsars] = useState<DsarRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [exports, setExports] = useState<Array<Record<string, unknown>>>([]);
  const [enforcement, setEnforcement] = useState<Record<string, unknown> | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    severity: 'MEDIUM',
    title: '',
    description: '',
  });
  const [retentionDays, setRetentionDays] = useState(2555);
  const [exportSubjectId, setExportSubjectId] = useState('');

  const load = async () => {
    const [d, i, p, e, r] = await Promise.all([
      privacyService.listDsar(),
      privacyService.listIncidents(),
      privacyService.listRetention(),
      privacyService.listExports(),
      privacyService.retentionEnforcement().catch(() => ({ data: null, success: false })),
    ]);
    setDsars(d.data as DsarRow[]);
    setIncidents(i.data as IncidentRow[]);
    setPolicies(p.data);
    setExports(e.data);
    setEnforcement((r.data as Record<string, unknown>) ?? null);
  };

  useEffect(() => {
    load().catch(() => toast.error('Could not load privacy operations'));
  }, []);

  const subjectLabel = (row: DsarRow) => {
    if (!row.subject) return row.id.slice(0, 8);
    return `${row.subject.firstName} ${row.subject.lastName} (${row.subject.email})`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy operations</h1>
        <p className="text-sm text-gray-500">
          Process DSARs with ownership and SLA tracking, incidents with assignees, retention
          enforcement and portability exports.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Data subject requests</h2>
        {dsars.length === 0 && <p className="text-sm text-gray-500">No DSARs.</p>}
        {dsars.map((row) => (
          <div key={row.id} className="border border-gray-100 rounded-md p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{String(row.type)}</p>
                <p className="text-xs text-gray-500">Subject: {subjectLabel(row)}</p>
                <p className="text-xs text-gray-500">
                  Received {row.createdAt ? String(row.createdAt).slice(0, 10) : 'n/a'}
                  {row.dueAt ? ` • Due ${String(row.dueAt).slice(0, 10)} (30-day SLA)` : ''}
                </p>
                <p className="text-xs text-gray-500">{String(row.notes ?? '')}</p>
              </div>
              <Badge variant="neutral">{String(row.status)}</Badge>
            </div>
            {Array.isArray(row.statusHistory) && row.statusHistory.length > 0 && (
              <ul className="text-xs text-gray-500 space-y-1">
                {row.statusHistory.slice(-4).map((h, idx) => (
                  <li key={`${row.id}-h-${idx}`}>
                    {h.at?.slice(0, 19)} — {h.status}
                    {h.notes ? `: ${h.notes}` : ''}
                  </li>
                ))}
              </ul>
            )}
            {row.status !== 'COMPLETED' && row.status !== 'REJECTED' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    privacyService
                      .progressDsar(row.id, { status: 'IN_PROGRESS' })
                      .then(load)
                      .catch(() => toast.error('Could not update DSAR'))
                  }>
                  Mark in progress
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    privacyService
                      .progressDsar(row.id, { status: 'COMPLETED', notes: 'Completed by privacy ops' })
                      .then(load)
                      .catch(() => toast.error('Could not update DSAR'))
                  }>
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    privacyService
                      .progressDsar(row.id, { status: 'REJECTED', notes: 'Rejected after review' })
                      .then(load)
                      .catch(() => toast.error('Could not update DSAR'))
                  }>
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Incidents</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            label="Title"
            value={incidentForm.title}
            onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
          />
          <Select
            label="Severity"
            value={incidentForm.severity}
            onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'CRITICAL', label: 'Critical' },
            ]}
          />
          <Input
            label="Description"
            value={incidentForm.description}
            onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
          />
        </div>
        <Button
          onClick={() =>
            privacyService
              .reportIncident(incidentForm)
              .then(() => {
                toast.success('Incident recorded');
                setIncidentForm({ severity: 'MEDIUM', title: '', description: '' });
                return load();
              })
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : 'Could not record incident'),
              )
          }>
          Record incident
        </Button>
        {incidents.map((row) => (
          <div key={row.id} className="border border-gray-100 rounded-md p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-gray-500">{row.description}</p>
                <p className="text-xs text-gray-500">
                  Severity {row.severity}
                  {row.assignedToId ? ` • Assignee ${row.assignedToId.slice(0, 8)}` : ' • Unassigned'}
                </p>
              </div>
              <Badge variant="neutral">{row.status}</Badge>
            </div>
            {Array.isArray(row.timeline) && row.timeline.length > 0 && (
              <ul className="text-xs text-gray-500 space-y-1">
                {row.timeline.slice(-4).map((event, idx) => (
                  <li key={`${row.id}-t-${idx}`}>
                    {event.at?.slice(0, 19)} — {event.event}
                    {event.notes ? `: ${event.notes}` : ''}
                  </li>
                ))}
              </ul>
            )}
            {row.status !== 'RESOLVED' && row.status !== 'CLOSED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  privacyService
                    .progressIncident(row.id, {
                      status: 'RESOLVED',
                      resolutionNotes: 'Resolved in privacy operations',
                    })
                    .then(load)
                }>
                Resolve
              </Button>
            )}
          </div>
        ))}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Retention and exports</h2>
        {canEditRetention ? (
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="Upload retention days"
              type="number"
              value={String(retentionDays)}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
            />
            <Button
              onClick={() =>
                privacyService
                  .upsertRetention({ entityType: 'UPLOAD', retainDays: retentionDays })
                  .then(() => {
                    toast.success('Retention policy saved');
                    return load();
                  })
              }>
              Save policy
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Retention policy is read-only for QA Officers. Ask an Admin to change it.
          </p>
        )}
        <p className="text-sm text-gray-500">
          {policies.length} retention {policies.length === 1 ? 'policy' : 'policies'} •{' '}
          {exports.length} export jobs
          {enforcement
            ? ` • ${String(enforcement.purgedUploads ?? 0)} purged • ${String(enforcement.pendingDisposal ?? 0)} pending disposal`
            : ''}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="Subject user id for portability export"
            value={exportSubjectId}
            onChange={(e) => setExportSubjectId(e.target.value)}
          />
          <Button
            onClick={() =>
              privacyService
                .requestAdminExport(exportSubjectId.trim())
                .then(() => {
                  toast.success('Export generated');
                  setExportSubjectId('');
                  return load();
                })
                .catch(() => toast.error('Could not generate export'))
            }>
            Generate export
          </Button>
        </div>
        {exports.map((job) => (
          <div key={String(job.id)} className="flex items-center justify-between gap-2 border-b border-gray-100 py-2">
            <div>
              <p className="text-sm font-medium">Export {String(job.id).slice(0, 8)}</p>
              <p className="text-xs text-gray-500">
                Subject {String(job.subjectUserId ?? '').slice(0, 8)} • {String(job.status)}
              </p>
            </div>
            {job.status === 'COMPLETED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  privacyService
                    .downloadExport(String(job.id))
                    .then((res) => {
                      if (res.data?.downloadUrl) {
                        window.open(res.data.downloadUrl, '_blank', 'noopener');
                      }
                    })
                    .catch(() => toast.error('Download unavailable'))
                }>
                Download
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
