import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { privacyService } from '../services/api';

export function PrivacyOperationsPage() {
  const [dsars, setDsars] = useState<Array<Record<string, unknown>>>([]);
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([]);
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [exports, setExports] = useState<Array<Record<string, unknown>>>([]);
  const [incidentForm, setIncidentForm] = useState({
    severity: 'MEDIUM',
    title: '',
    description: '',
  });
  const [retentionDays, setRetentionDays] = useState(2555);

  const load = async () => {
    const [d, i, p, e] = await Promise.all([
      privacyService.listDsar(),
      privacyService.listIncidents(),
      privacyService.listRetention(),
      privacyService.listExports(),
    ]);
    setDsars(d.data);
    setIncidents(i.data);
    setPolicies(p.data);
    setExports(e.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('Could not load privacy operations'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy operations</h1>
        <p className="text-sm text-gray-500">
          Process DSARs, incidents, retention policy and portability exports.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Data subject requests</h2>
        {dsars.length === 0 && <p className="text-sm text-gray-500">No DSARs.</p>}
        {dsars.map((row) => (
          <div key={String(row.id)} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-2">
            <div>
              <p className="font-medium">{String(row.type)}</p>
              <p className="text-xs text-gray-500">{String(row.notes ?? '')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{String(row.status)}</Badge>
              {row.status !== 'COMPLETED' && (
                <Button
                  size="sm"
                  onClick={() =>
                    privacyService
                      .progressDsar(String(row.id), { status: 'COMPLETED' })
                      .then(load)
                      .catch(() => toast.error('Could not update DSAR'))
                  }>
                  Complete
                </Button>
              )}
            </div>
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
          <Input
            label="Severity"
            value={incidentForm.severity}
            onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
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
              .catch(() => toast.error('Could not record incident'))
          }>
          Record incident
        </Button>
        {incidents.map((row) => (
          <div key={String(row.id)} className="flex justify-between gap-2 border-b border-gray-100 py-2">
            <div>
              <p className="font-medium">{String(row.title)}</p>
              <p className="text-xs text-gray-500">{String(row.description)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{String(row.status)}</Badge>
              {row.status !== 'RESOLVED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    privacyService
                      .progressIncident(String(row.id), { status: 'RESOLVED' })
                      .then(load)
                  }>
                  Resolve
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Retention and exports</h2>
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
        <p className="text-sm text-gray-500">
          {policies.length} retention {policies.length === 1 ? 'policy' : 'policies'} • {exports.length} export jobs
        </p>
      </Card>
    </div>
  );
}
