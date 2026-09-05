import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  CheckCircle,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { StatCard } from '../components/dashboard/StatCard';
import { learnerService, workplaceLogService } from '../services/api';
import type { WorkplaceLogRow } from '../services/api';
import type { Learner } from '../types';

type LogbookRow = {
  id: string;
  learner: string;
  learnerId: string;
  task: string;
  submitted: string;
  status: string;
  rawStatus: string;
};

export function WorkplaceMentorDashboardPage() {
  const navigate = useNavigate();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [logbooks, setLogbooks] = useState<LogbookRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [learnerRes, logRes] = await Promise.all([
      learnerService.getAll(),
      workplaceLogService.list(),
    ]);
    setLearners(learnerRes.data ?? []);
    setLogbooks((logRes.data ?? []).map(mapLog));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) toast.error('Could not load mentor dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = logbooks.filter((r) => r.rawStatus === 'PENDING').length;
  const verified = logbooks.filter((r) => r.rawStatus === 'VERIFIED').length;

  const stats = useMemo(
    () => [
      {
        title: 'My learners',
        value: String(learners.length),
        icon: <Users className="h-6 w-6" />,
        trend: { value: 0, label: 'enrolments', direction: 'neutral' as const },
      },
      {
        title: 'Pending logbooks',
        value: String(pending),
        icon: <Clock className="h-6 w-6" />,
        trend: { value: 0, label: 'awaiting sign-off', direction: 'neutral' as const },
      },
      {
        title: 'Verified logs',
        value: String(verified),
        icon: <CheckCircle className="h-6 w-6" />,
        trend: { value: 0, label: 'mentor signed', direction: 'neutral' as const },
      },
      {
        title: 'At-risk learners',
        value: String(learners.filter((l) => l.status === 'at_risk').length),
        icon: <Briefcase className="h-6 w-6" />,
        trend: { value: 0, label: 'need support', direction: 'neutral' as const },
      },
    ],
    [learners, pending, verified],
  );

  const verify = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await workplaceLogService.mentorVerify(id, decision);
      toast.success(decision === 'approve' ? 'Log verified' : 'Log returned');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update log');
    }
  };

  const columns = [
    {
      header: 'Learner',
      accessorKey: 'learner' as const,
      cell: (row: LogbookRow) => (
        <div className="flex items-center">
          <Avatar name={row.learner} className="mr-3" size="sm" />
          <span className="font-medium text-gray-900">{row.learner}</span>
        </div>
      ),
    },
    { header: 'Activity', accessorKey: 'task' as const },
    { header: 'Submitted', accessorKey: 'submitted' as const },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: LogbookRow) => (
        <Badge variant={row.rawStatus === 'VERIFIED' ? 'success' : row.rawStatus === 'REJECTED' ? 'danger' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id' as const,
      cell: (row: LogbookRow) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/learner/${row.learnerId}`)}>
            Profile
          </Button>
          {row.rawStatus === 'PENDING' && (
            <>
              <Button size="sm" onClick={() => void verify(row.id, 'approve')}>
                Verify
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void verify(row.id, 'reject')}>
                Return
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workplace Mentor Dashboard</h1>
        <p className="text-sm text-gray-500">
          Verify workplace logbook hours for learners allocated to you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} delay={i * 0.1} />
        ))}
      </div>

      <Card
        title="Workplace logbook queue"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/facilitator-learners')}>
            All learners <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        }
        noPadding>
        {logbooks.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No workplace logs submitted yet.
          </p>
        ) : (
          <DataTable data={logbooks} columns={columns} keyField="id" />
        )}
      </Card>
    </div>
  );
}

function mapLog(row: WorkplaceLogRow): LogbookRow {
  const learner = row.enrollment?.learner;
  const name = learner
    ? `${learner.firstName} ${learner.lastName}`.trim()
    : 'Learner';
  return {
    id: row.id,
    learner: name,
    learnerId: row.enrollmentId,
    task: row.activity,
    submitted: row.logDate ? new Date(row.logDate).toLocaleDateString() : '—',
    status:
      row.mentorStatus === 'VERIFIED'
        ? 'Verified'
        : row.mentorStatus === 'REJECTED'
          ? 'Returned'
          : 'Pending Review',
    rawStatus: row.mentorStatus,
  };
}
