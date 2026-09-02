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
import { learnerService, poeService } from '../services/api';
import type { Learner, POEDocument } from '../types';

type LogbookRow = {
  id: string;
  learner: string;
  learnerId: string;
  task: string;
  submitted: string;
  status: string;
};

export function WorkplaceMentorDashboardPage() {
  const navigate = useNavigate();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [logbooks, setLogbooks] = useState<LogbookRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await learnerService.getAll();
        const list = res.data ?? [];
        if (cancelled) return;
        setLearners(list);
        const rows: LogbookRow[] = [];
        for (const l of list.slice(0, 12)) {
          try {
            const poe = await poeService.getByLearner(l.id);
            for (const doc of (poe.data ?? []).slice(0, 2)) {
              rows.push(mapPoeToLogbook(l, doc));
            }
          } catch {
            /* skip learner */
          }
        }
        if (!cancelled) setLogbooks(rows);
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

  const pending = logbooks.filter((r) => r.status === 'Pending Review').length;
  const verified = logbooks.filter((r) => r.status === 'Verified').length;

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
        title: 'Verified documents',
        value: String(verified),
        icon: <CheckCircle className="h-6 w-6" />,
        trend: { value: 0, label: 'PoE items', direction: 'neutral' as const },
      },
      {
        title: 'At-risk learners',
        value: String(learners.filter((l) => l.status === 'at_risk').length),
        icon: <Briefcase className="h-6 w-6" />,
        trend: { value: 0, label: 'need support', direction: 'neutral' as const },
      },
    ],
    [learners.length, pending, verified],
  );

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
    { header: 'Document', accessorKey: 'task' as const },
    { header: 'Submitted', accessorKey: 'submitted' as const },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: LogbookRow) => (
        <Badge variant={row.status === 'Verified' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'learnerId' as const,
      cell: (row: LogbookRow) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/learner/${row.learnerId}`)}>
          Review
        </Button>
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
          Review learner logbooks and workplace evidence
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} delay={i * 0.1} />
        ))}
      </div>

      <Card
        title="Logbook & PoE queue"
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
          <p className="p-6 text-sm text-gray-500">No PoE documents submitted yet.</p>
        ) : (
          <DataTable data={logbooks} columns={columns} keyField="id" />
        )}
      </Card>
    </div>
  );
}

function mapPoeToLogbook(learner: Learner, doc: POEDocument): LogbookRow {
  return {
    id: doc.id,
    learner: learner.name,
    learnerId: learner.id,
    task: doc.fileName || doc.type || 'PoE document',
    submitted: doc.createdAt
      ? new Date(doc.createdAt).toLocaleDateString()
      : '—',
    status:
      doc.status === 'verified' || doc.verifiedAt ? 'Verified' : 'Pending Review',
  };
}
