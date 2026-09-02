import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileCheck, Clock, CheckCircle, Plus, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { assessmentService, reportsService } from '../services/api';
import type { Assessment, AssessmentInstance } from '../types';
import { downloadJson } from '../utils/downloadJson';

type QueueRow = {
  id: string;
  learner: string;
  assessment: string;
  submittedDate: string;
  status: string;
  assessmentId: string;
};

export function AssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [instances, setInstances] = useState<AssessmentInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [aRes, iRes] = await Promise.all([
          assessmentService.getAll(),
          assessmentService.listInstances(),
        ]);
        if (!cancelled) {
          setAssessments(aRes.data ?? []);
          setInstances(iRes.data ?? []);
        }
      } catch {
        if (!cancelled) toast.error('Could not load assessments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = useMemo(
    () =>
      instances.filter((i) =>
        [
          'submitted',
          'grading',
          'facilitator_grading',
          'facilitator_graded',
          'assessor_review',
          'assessor_verified',
        ].includes(i.status),
      ),
    [instances],
  );

  const stats = useMemo(
    () => [
      {
        label: 'Assessment records',
        value: String(assessments.length),
        icon: <FileCheck className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'Pending review',
        value: String(pending.length),
        icon: <Clock className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'Completed',
        value: String(
          instances.filter((i) => i.status === 'completed').length,
        ),
        icon: <CheckCircle className="h-5 w-5 text-gray-500" />,
      },
    ],
    [assessments.length, pending.length, instances],
  );

  const queueRows: QueueRow[] = useMemo(
    () =>
      pending.map((i) => ({
        id: i.id,
        assessmentId: i.assessmentId,
        learner: i.learnerName ?? 'Learner',
        assessment: i.assessmentTitle ?? 'Assessment',
        submittedDate: i.submittedAt
          ? new Date(i.submittedAt).toLocaleDateString()
          : '—',
        status: ['grading', 'facilitator_grading', 'assessor_review'].includes(
          i.status,
        )
          ? 'In review'
          : 'Pending',
      })),
    [pending],
  );

  const columns = [
    {
      header: 'Learner',
      accessorKey: 'learner' as const,
      cell: (row: QueueRow) => (
        <div className="flex items-center">
          <Avatar name={row.learner} className="mr-3" size="sm" />
          <span className="font-medium">{row.learner}</span>
        </div>
      ),
    },
    { header: 'Assessment', accessorKey: 'assessment' as const },
    { header: 'Submitted', accessorKey: 'submittedDate' as const },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: QueueRow) => (
        <Badge variant="warning">{row.status}</Badge>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'assessmentId' as const,
      cell: (row: QueueRow) => (
        <Button
          size="sm"
          onClick={() => navigate(`/assessment/${row.assessmentId}/submissions`)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-sm text-gray-500">
            Organisation-wide assessment records and submission queue
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={async () => {
              try {
                const snap = await reportsService.getSetaSnapshot();
                downloadJson('assessment-compliance.json', {
                  assessments,
                  instances,
                  setaSnapshot: snap.data,
                });
                toast.success('Report exported');
              } catch {
                toast.error('Export failed');
              }
            }}>
            Export report
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/facilitator-assessments')}>
            Manage instruments
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 uppercase">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
            {s.icon}
          </Card>
        ))}
      </div>

      <Card title="Submission queue" noPadding>
        {loading ? (
          <p className="p-6 text-gray-500">Loading…</p>
        ) : queueRows.length === 0 ? (
          <p className="p-6 text-gray-500">No submissions awaiting review.</p>
        ) : (
          <DataTable data={queueRows} columns={columns} keyField="id" />
        )}
      </Card>
    </div>
  );
}
