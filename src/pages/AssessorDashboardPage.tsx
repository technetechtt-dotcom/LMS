import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Clock,
  CheckCircle,
  Timer,
  BookOpen,
  Users,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { StatCard } from '../components/dashboard/StatCard';
import {
  countPendingAssessments,
  pendingAssessmentsForAssessor,
} from '../data/assessmentQueues';
import { useAuth } from '../contexts/AuthContext';
import { assessmentService, poeArtifactService, programmeService } from '../services/api';
import type { Assessment, AssessmentInstance } from '../types';
import type { Programme } from '../types';
import { poeKindLabel } from '../utils/poeWorkflow';

export function AssessorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(
    null,
  );
  const [assignedProgrammes, setAssignedProgrammes] = useState<Programme[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [instances, setInstances] = useState<AssessmentInstance[]>([]);
  const [poeQueue, setPoeQueue] = useState<
    Array<{ id: string; title: string; kind: string; learnerName: string }>
  >([]);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    (async () => {
      try {
        const [progRes, assessRes, instRes, poeRes] = await Promise.all([
          programmeService.getAll(),
          assessmentService.getAll(),
          assessmentService.listInstances(),
          poeArtifactService.listQueue('assessor'),
        ]);
        if (cancelled) return;
        setAssignedProgrammes(progRes.data ?? []);
        setAssessments(assessRes.data ?? []);
        setInstances(instRes.data ?? []);
        setPoeQueue(poeRes.data ?? []);
      } catch {
        if (!cancelled) toast.error('Could not load dashboard data');
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPending = useMemo(
    () => assessments.filter((a) => a.needsAssessorReview === true && a.assessorId === user?.id).length,
    [assessments, user?.id],
  );

  const completedCount = useMemo(
    () =>
      instances.filter(
        (i) =>
          i.status === 'completed' ||
          i.status === 'assessor_verified' ||
          i.status === 'rejected',
      ).length,
    [instances],
  );

  const stats = useMemo(
    () => [
      {
        title: 'Assigned Programmes',
        value: String(assignedProgrammes.length),
        icon: <BookOpen className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'programmes active',
          direction: 'neutral' as const,
        },
      },
      {
        title: 'Pending Assessments',
        value: String(totalPending),
        icon: <Clock className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'awaiting your review',
          direction: 'neutral' as const,
        },
      },
      {
        title: 'Completed',
        value: String(completedCount),
        icon: <CheckCircle className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'graded instances',
          direction: 'neutral' as const,
        },
      },
      {
        title: 'In moderation',
        value: String(
          instances.filter((i) => i.status === 'assessor_verified').length,
        ),
        icon: <Timer className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'awaiting sign-off',
          direction: 'neutral' as const,
        },
      },
    ],
    [assignedProgrammes.length, totalPending, completedCount, instances],
  );

  const filteredQueue = useMemo(() => {
    if (!selectedProgrammeId) return [];
    return pendingAssessmentsForAssessor(
      selectedProgrammeId,
      assessments,
      user?.id,
    );
  }, [selectedProgrammeId, assessments, user?.id]);

  const columns = useMemo(
    () => [
      {
        header: 'Learner',
        accessorKey: 'learnerName' as const,
        cell: (row: Assessment) => (
          <div className="flex items-center">
            <Avatar
              name={row.learnerName ?? 'Learner'}
              className="mr-3"
              size="sm"
            />
            <span className="font-medium text-gray-900">
              {row.learnerName ?? '—'}
            </span>
          </div>
        ),
      },
      {
        header: 'Assessment',
        accessorKey: 'title' as const,
      },
      {
        header: 'Type',
        accessorKey: 'format' as const,
        cell: (row: Assessment) => (
          <Badge variant="neutral" className="font-normal">
            {row.format}
          </Badge>
        ),
      },
      {
        header: 'Programme',
        accessorKey: 'programmeName' as const,
        cell: (row: Assessment) => (
          <span className="text-sm text-gray-600">{row.programmeName}</span>
        ),
      },
      {
        header: 'Submitted',
        accessorKey: 'assessedAt' as const,
        cell: (row: Assessment) => (
          <span className="text-sm text-gray-700">
            {row.assessedAt
              ? new Date(row.assessedAt).toLocaleDateString()
              : '—'}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessorKey: 'id' as const,
        cell: (row: Assessment) => (
          <Button
            size="sm"
            onClick={() => navigate(`/assessment/${row.id}/submissions`)}>
            Review
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const selectedTitle =
    assignedProgrammes.find((p) => p.id === selectedProgrammeId)?.title ??
    null;

  if (dashLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessor Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.name ?? 'Assessor'} ·{' '}
          <span className="text-red-600 font-medium">Assessor</span>
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
        <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
        <p className="text-sm text-red-800">
          Learner submissions are marked first by facilitators (blue), then reviewed by assessors for marking quality and competency (red). Your queue shows items ready for assessor review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} delay={i * 0.1} />
        ))}
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Assigned Programmes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assignedProgrammes.map((p) => {
            const pending = countPendingAssessments(
              p.id,
              assessments,
              user?.id,
            );
            const active = selectedProgrammeId === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white p-5 rounded-lg border shadow-sm ${
                  active ? 'border-brand-navy ring-1 ring-brand-navy/20' : 'border-gray-200'
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{p.title}</h4>
                    <p className="text-xs text-gray-500">
                      {p.seta} · NQF Level {p.nqfLevel}
                    </p>
                  </div>
                  <Badge variant={pending > 0 ? 'warning' : 'success'}>
                    {pending} pending
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-gray-500 mb-4">
                  <Users className="h-3 w-3 mr-1" /> {p.learnerCount} learners
                  enrolled
                </div>
                <Button
                  size="sm"
                  variant={active ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => {
                    setSelectedProgrammeId(p.id);
                    toast.info(`Showing assessments still to be assessed — ${p.title}`);
                  }}>
                  View Assessments{' '}
                  <ArrowRight className="h-3 w-3 ml-1 inline" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <Card
        title={
          selectedProgrammeId
            ? `Assessments to complete — ${selectedTitle}`
            : 'Assessments awaiting assessment'
        }
        noPadding>
        {!selectedProgrammeId ? (
          <p className="p-6 text-sm text-gray-600">
            Select <strong>View Assessments</strong> on a programme above to list
            submissions that still need assessment for{' '}
            <strong>that programme only</strong>.
          </p>
        ) : filteredQueue.length === 0 ? (
          <p className="p-6 text-sm text-gray-600">
            No assessments pending for this programme — all caught up.
          </p>
        ) : (
          <DataTable data={filteredQueue} columns={columns} keyField="id" />
        )}
      </Card>

      {poeQueue.length > 0 && (
        <Card title="Workbook & summative — awaiting assessor review" noPadding>
          <ul className="divide-y">
            {poeQueue.map((item) => (
              <li
                key={item.id}
                className="px-6 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.learnerName} — {item.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {poeKindLabel(item.kind)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/poe-artifacts/${item.id}/review`)}>
                  Review
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
