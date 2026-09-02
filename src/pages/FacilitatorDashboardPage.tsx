import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  Plus,
  Upload,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { FACILITATOR_ROLE_LABELS } from '../utils/facilitatorRoles';
import {
  assessmentService,
  learnerService,
  poeArtifactService,
  reportsService,
} from '../services/api';
import type { AssessmentInstance, Learner } from '../types';
import { poeKindLabel } from '../utils/poeWorkflow';

export function FacilitatorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [instances, setInstances] = useState<AssessmentInstance[]>([]);
  const [poeQueue, setPoeQueue] = useState<
    Array<{ id: string; title: string; kind: string; learnerName: string }>
  >([]);
  const [compliancePct, setCompliancePct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [learnerRes, instRes, poeRes, snapRes] = await Promise.all([
          learnerService.getAll(),
          assessmentService.listInstances(),
          poeArtifactService.listQueue('facilitator'),
          reportsService.getSetaSnapshot(),
        ]);
        if (cancelled) return;
        setLearners(learnerRes.data ?? []);
        const facilitatorQueue = (instRes.data ?? []).filter((i) =>
          ['submitted', 'facilitator_grading', 'grading'].includes(i.status),
        );
        setInstances(facilitatorQueue);
        setPoeQueue(poeRes.data ?? []);
        const snap = snapRes.data;
        if (snap && snap.enrollments > 0) {
          setCompliancePct(
            Math.min(100, Math.round((snap.docs / snap.enrollments) * 100)),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const facilitatorRoleLabel =
    user?.role === 'Facilitator' && user.facilitatorRole
      ? FACILITATOR_ROLE_LABELS[user.facilitatorRole]
      : null;

  const stats = useMemo(
    () => [
      {
        label: 'Active learners',
        value: String(learners.filter((l) => l.status === 'active').length),
        icon: <Users className="h-5 w-5 text-gray-500" />,
        trend: `${learners.length} enrolments`,
        trendColor: 'text-gray-600',
      },
      {
        label: 'Pending submissions',
        value: String(
          instances.filter((i) =>
            ['submitted', 'facilitator_grading', 'grading'].includes(i.status),
          ).length,
        ),
        icon: <FileCheck className="h-5 w-5 text-gray-500" />,
        trend: 'Awaiting facilitator marking',
        trendColor: 'text-amber-600',
      },
      {
        label: 'Avg progress',
        value:
          learners.length > 0
            ? `${Math.round(
                learners.reduce((s, l) => s + l.progress, 0) / learners.length,
              )}%`
            : '—',
        icon: <TrendingUp className="h-5 w-5 text-gray-500" />,
        trend: 'Across cohort',
        trendColor: 'text-green-600',
      },
      {
        label: 'SETA compliance',
        value: compliancePct != null ? `${compliancePct}%` : '—',
        icon: <ShieldCheck className="h-5 w-5 text-gray-500" />,
        trend: 'Document coverage',
        trendColor: 'text-green-600',
      },
    ],
    [learners, instances, compliancePct],
  );

  const activities = useMemo(
    () =>
      instances.slice(0, 5).map((i) => ({
        name: i.learnerName ?? 'Learner',
        action: 'submitted assessment',
        detail: i.assessmentTitle ?? 'Assessment',
        time: i.submittedAt
          ? new Date(i.submittedAt).toLocaleDateString()
          : '—',
        status:
          i.status === 'facilitator_grading' || i.status === 'grading'
            ? 'Marking in progress'
            : 'Awaiting marking',
        statusVariant:
          i.status === 'facilitator_grading' || i.status === 'grading'
            ? ('info' as const)
            : ('warning' as const),
      })),
    [instances],
  );

  const quickActions = [
    {
      icon: <Plus className="h-5 w-5" />,
      label: 'Assessment instruments',
      desc: 'Build and publish assessments',
      action: () => navigate('/facilitator-assessments'),
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Upload materials',
      desc: 'Add training resources',
      action: () => navigate('/materials'),
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'SETA compliance',
      desc: 'Compliance workspace',
      action: () => navigate('/facilitator-seta-compliance'),
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Message learners',
      desc: 'Communication centre',
      action: () => navigate('/facilitator-communication'),
    },
  ];

  if (loading) {
    return <p className="text-gray-500 p-6">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facilitator Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.name ?? 'Facilitator'}
          {facilitatorRoleLabel ? ` · ${facilitatorRoleLabel}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-xs mt-1 ${stat.trendColor}`}>{stat.trend}</p>
              </div>
              {stat.icon}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Recent learner activity">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">No recent submissions.</p>
          ) : (
            <div className="divide-y">
              {activities.map((a, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={a.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {a.name} {a.action}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{a.detail}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={a.statusVariant}>{a.status}</Badge>
                    <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Quick actions">
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.action}
                className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-navy hover:bg-gray-50 text-left">
                <div className="text-brand-navy">{action.icon}</div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {poeQueue.length > 0 && (
        <Card title="Workbook & summative — awaiting facilitator marking">
          <ul className="divide-y">
            {poeQueue.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="py-3 flex items-center justify-between gap-4">
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
                  variant="outline"
                  onClick={() => navigate(`/poe-artifacts/${item.id}/review`)}>
                  Mark
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
