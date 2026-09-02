import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileCheck, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { assessmentService } from '../services/api';
import type { Assessment, AssessmentInstance } from '../types';

type ResultRow = {
  id: string;
  assessment: string;
  module: string;
  date: string;
  score: string;
  status: string;
  assessmentId: string;
};

export function LearnerAssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [instances, setInstances] = useState<AssessmentInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assessRes, instRes] = await Promise.all([
          assessmentService.getAll(),
          assessmentService.listInstances(),
        ]);
        if (cancelled) return;
        setAssessments(assessRes.data ?? []);
        setInstances(instRes.data ?? []);
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

  const completed = instances.filter(
    (i) =>
      i.status === 'completed' ||
      i.status === 'moderation' ||
      i.status === 'submitted',
  );
  const pending = assessments.filter(
    (a) => !instances.some((i) => i.assessmentId === a.id && i.status !== 'not_started'),
  );
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, i) => sum + (i.percentage ?? i.score ?? 0), 0) /
            completed.length,
        )
      : 0;

  const stats = [
    {
      label: 'Total Assessments',
      value: String(assessments.length),
      icon: <FileCheck className="h-5 w-5 text-gray-500" />,
    },
    {
      label: 'Completed',
      value: String(completed.length),
      icon: <CheckCircle className="h-5 w-5 text-gray-500" />,
    },
    {
      label: 'Pending',
      value: String(pending.length),
      icon: <Clock className="h-5 w-5 text-gray-500" />,
    },
    {
      label: 'Average Score',
      value: completed.length ? `${avgScore}%` : '—',
      icon: <BarChart3 className="h-5 w-5 text-gray-500" />,
    },
  ];

  const recentResults: ResultRow[] = useMemo(
    () =>
      instances
        .filter((i) => i.submittedAt || i.gradedAt)
        .sort(
          (a, b) =>
            new Date(b.gradedAt ?? b.submittedAt ?? 0).getTime() -
            new Date(a.gradedAt ?? a.submittedAt ?? 0).getTime(),
        )
        .slice(0, 20)
        .map((i) => ({
          id: i.id,
          assessmentId: i.assessmentId,
          assessment: i.assessmentTitle ?? 'Assessment',
          module: assessments.find((a) => a.id === i.assessmentId)?.moduleName ?? '—',
          date: i.gradedAt
            ? new Date(i.gradedAt).toLocaleDateString()
            : i.submittedAt
              ? new Date(i.submittedAt).toLocaleDateString()
              : '—',
          score:
            i.percentage != null
              ? `${Math.round(i.percentage)}%`
              : i.score != null
                ? String(i.score)
                : '—',
          status:
            i.isPassed === true
              ? 'Passed'
              : i.isPassed === false
                ? 'Needs Retake'
                : i.status === 'submitted'
                  ? 'Submitted'
                  : 'In progress',
        })),
    [instances, assessments],
  );

  const columns = [
    {
      header: 'Assessment',
      accessorKey: 'assessment' as const,
      cell: (row: ResultRow) => (
        <div className="flex items-center">
          <FileCheck className="h-4 w-4 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900">{row.assessment}</span>
        </div>
      ),
    },
    { header: 'Module', accessorKey: 'module' as const },
    { header: 'Date', accessorKey: 'date' as const },
    {
      header: 'Score',
      accessorKey: 'score' as const,
      cell: (row: ResultRow) => <span className="font-bold">{row.score}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: ResultRow) => (
        <Badge variant={row.status === 'Passed' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id' as const,
      cell: (row: ResultRow) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/assessment/${row.assessmentId}/take`)}>
          {row.status === 'Submitted' || row.status === 'In progress' ? 'Continue' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My assessments</h1>
        <p className="text-sm text-gray-500">Track progress and start new attempts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-full">{stat.icon}</div>
          </Card>
        ))}
      </div>

      <Card title="Available assessments">
        {loading ? (
          <p className="p-4 text-gray-500">Loading…</p>
        ) : assessments.length === 0 ? (
          <p className="p-4 text-gray-500">No assessments assigned yet.</p>
        ) : (
          <div className="divide-y">
            {assessments.map((a) => {
              const inst = instances.find((i) => i.assessmentId === a.id);
              return (
                <div
                  key={a.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{a.title}</h3>
                    <p className="text-sm text-gray-500">{a.moduleName ?? a.programmeName}</p>
                  </div>
                  <Button onClick={() => navigate(`/assessment/${a.id}/take`)}>
                    {inst?.status === 'submitted' ? 'View submission' : 'Start assessment'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Recent results" noPadding>
        {loading ? (
          <p className="p-4 text-gray-500">Loading…</p>
        ) : recentResults.length === 0 ? (
          <p className="p-4 text-gray-500">No submitted assessments yet.</p>
        ) : (
          <DataTable data={recentResults} columns={columns} keyField="id" />
        )}
      </Card>
    </div>
  );
}
