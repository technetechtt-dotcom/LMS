import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CheckCircle,
  ShieldCheck,
  BookOpen,
  Users,
  AlertCircle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { StatCard } from '../components/dashboard/StatCard';
import {
  countPendingModeration,
  pendingModerationForProgramme,
} from '../data/assessmentQueues';
import { useAuth } from '../contexts/AuthContext';
import { assessmentService, moderationService, poeArtifactService, programmeService } from '../services/api';
import type { Assessment } from '../types';
import type { Programme } from '../types';
import { poeKindLabel } from '../utils/poeWorkflow';

export function ModeratorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(
    null,
  );
  const [assignedProgrammes, setAssignedProgrammes] = useState<Programme[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [moderationCount, setModerationCount] = useState(0);
  const [poeQueue, setPoeQueue] = useState<
    Array<{ id: string; title: string; kind: string; learnerName: string }>
  >([]);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    (async () => {
      try {
        const [progRes, assessRes, modRes, poeRes] = await Promise.all([
          programmeService.getAll(),
          assessmentService.getAll(),
          moderationService.list(),
          poeArtifactService.listQueue('moderator'),
        ]);
        if (cancelled) return;
        setAssignedProgrammes(progRes.data ?? []);
        setAssessments(assessRes.data ?? []);
        setModerationCount((modRes.data ?? []).length);
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

  const totalPendingMod = useMemo(
    () => assessments.filter((a) => a.needsModeration === true).length,
    [assessments],
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
        title: 'Pending Moderation',
        value: String(totalPendingMod),
        icon: <Clock className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'awaiting sign-off',
          direction: 'neutral' as const,
        },
      },
      {
        title: 'Moderated This Month',
        value: String(moderationCount),
        icon: <CheckCircle className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'total records',
          direction: 'neutral' as const,
        },
      },
      {
        title: 'Compliance Rate',
        value:
          assessments.length > 0
            ? `${Math.round(((assessments.length - totalPendingMod) / assessments.length) * 100)}%`
            : '—',
        icon: <ShieldCheck className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'moderated',
          direction: 'neutral' as const,
        },
      },
    ],
    [assignedProgrammes.length, totalPendingMod, moderationCount, assessments.length],
  );

  const filteredQueue = useMemo(() => {
    if (!selectedProgrammeId) return [];
    return pendingModerationForProgramme(selectedProgrammeId, assessments);
  }, [selectedProgrammeId, assessments]);

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
        header: 'Assessor',
        accessorKey: 'createdBy' as const,
        cell: (row: Assessment) => (
          <span className="text-sm text-gray-600">
            {row.assessorId ? 'Assigned' : '—'}
          </span>
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
        header: 'Assessed',
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
            variant="primary"
            onClick={() => navigate(`/assessment/${row.id}/submissions`)}>
            Moderate
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const selectedTitle =
    assignedProgrammes.find((p) => p.id === selectedProgrammeId)?.title ?? null;

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
        <h1 className="text-2xl font-bold text-gray-900">
          Moderator Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.name ?? 'Moderator'} ·{' '}
          <span className="text-green-600 font-medium">Moderator</span>
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
        <AlertCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
        <p className="text-sm text-green-800">
          Use <strong>View Moderation Queue</strong> on a programme to see
          assessments that still need moderation for{' '}
          <strong>that programme only</strong>. Your sign-off appears in{' '}
          <span className="font-bold text-green-600">green</span>.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedProgrammes.map((p) => {
            const pending = countPendingModeration(p.id, assessments);
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
                </div>
                <Button
                  size="sm"
                  variant={active ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => setSelectedProgrammeId(p.id)}>
                  View Moderation Queue{' '}
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
            ? `Moderation queue — ${selectedTitle}`
            : 'Moderation queue'
        }
        noPadding>
        {!selectedProgrammeId ? (
          <p className="p-6 text-sm text-gray-600">
            Select <strong>View Moderation Queue</strong> on a programme to list
            assessments that still need moderation for{' '}
            <strong>that programme only</strong>.
          </p>
        ) : filteredQueue.length === 0 ? (
          <p className="p-6 text-sm text-gray-600">
            Nothing awaiting moderation for this programme.
          </p>
        ) : (
          <DataTable data={filteredQueue} columns={columns} keyField="id" />
        )}
      </Card>

      {poeQueue.length > 0 && (
        <Card title="Workbook & summative — awaiting moderation" noPadding>
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
                  variant="primary"
                  onClick={() => navigate(`/poe-artifacts/${item.id}/review`)}>
                  Moderate
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Moderation Checklist">
        <p className="text-sm text-gray-500 mb-4">
          Ensure all items are verified before finalising moderation.
        </p>
        <div className="space-y-3">
          {[
            {
              label: 'Assessment instruments aligned with unit standards',
              checked: true,
            },
            {
              label: 'Marking consistent with rubric criteria',
              checked: true,
            },
            {
              label: 'Constructive feedback provided to learner',
              checked: false,
            },
            {
              label: 'Evidence of competence verified against outcomes',
              checked: false,
            },
            {
              label: 'Assessment records complete and filed correctly',
              checked: true,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div
                className={`h-5 w-5 rounded flex items-center justify-center mr-3 flex-shrink-0 ${item.checked ? 'bg-green-500' : 'border-2 border-gray-300'}`}>
                {item.checked && (
                  <CheckCircle className="h-4 w-4 text-white" />
                )}
              </div>
              <span
                className={`text-sm ${item.checked ? 'text-gray-900' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
