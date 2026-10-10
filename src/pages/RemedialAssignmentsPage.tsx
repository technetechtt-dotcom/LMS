import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { materialService, remedialService } from '../services/api';

type Assignment = {
  id: string;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  acknowledgedAt?: string | null;
  completedAt?: string | null;
  enrollmentId: string;
  material?: { id: string; title: string } | null;
};

export function RemedialAssignmentsPage() {
  const { user, linkedLearnerId } = useAuth();
  const [params] = useSearchParams();
  const enrollmentId = params.get('enrollmentId') || linkedLearnerId || undefined;
  const canAssign = ['Admin', 'Facilitator', 'QA Officer', 'Assessor'].includes(user?.role ?? '');
  const [rows, setRows] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; title: string }>>([]);
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    dueAt: '',
    materialId: '',
  });

  const load = async () => {
    const res = await remedialService.list(enrollmentId);
    setRows((res.data ?? []) as Assignment[]);
  };

  useEffect(() => {
    load().catch(() => toast.error('Could not load remedial assignments'));
    if (canAssign) {
      materialService
        .getAll()
        .then((res) => setMaterials((res.data ?? []).map((m) => ({ id: m.id, title: m.title }))))
        .catch(() => undefined);
    }
  }, [enrollmentId, canAssign]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Remedial assignments</h1>
        <p className="text-sm text-gray-500">
          Learner-specific remedial work with due dates, acknowledgement and completion.
        </p>
      </div>

      {canAssign && enrollmentId && (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Assign remedial work</h2>
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Instructions"
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            value={form.dueAt}
            onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
          />
          <label className="block text-sm font-medium text-gray-700">
            Material
            <select
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
              value={form.materialId}
              onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
              <option value="">No specific material</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() =>
              remedialService
                .create({
                  enrollmentId,
                  title: form.title,
                  instructions: form.instructions || undefined,
                  dueAt: form.dueAt || undefined,
                  materialId: form.materialId || undefined,
                })
                .then(() => {
                  toast.success('Remedial assignment created');
                  setForm({ title: '', instructions: '', dueAt: '', materialId: '' });
                  return load();
                })
                .catch(() => toast.error('Could not assign remedial work'))
            }>
            Assign
          </Button>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        {rows.length === 0 && <p className="text-gray-500">No remedial assignments.</p>}
        {rows.map((row) => (
          <div key={row.id} className="border border-gray-200 rounded-md p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-gray-500">{row.instructions}</p>
                {row.dueAt && (
                  <p className="text-xs text-gray-500">Due {String(row.dueAt).slice(0, 10)}</p>
                )}
              </div>
              <Badge variant="neutral">
                {row.completedAt ? 'Completed' : row.acknowledgedAt ? 'Acknowledged' : 'Assigned'}
              </Badge>
            </div>
            {!row.acknowledgedAt && (
              <Button size="sm" variant="outline" onClick={() => remedialService.acknowledge(row.id).then(load)}>
                Acknowledge
              </Button>
            )}
            {!row.completedAt && (
              <Button size="sm" onClick={() => remedialService.complete(row.id).then(load)}>
                Mark complete
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
