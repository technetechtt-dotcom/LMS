import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Award,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatCard } from '../components/dashboard/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from '../components/ui/Avatar';
import {
  learnerService,
  programmeService,
  reportsService,
} from '../services/api';
import type { Programme } from '../types';
import type { Learner } from '../types';

type ProgramRow = {
  id: string;
  name: string;
  seta: string;
  count: number;
  active: number;
  completed: number;
  progress: number;
};

export function DashboardPage() {
  useAuth();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<
    {
      title: string;
      value: string;
      icon: React.ReactNode;
      trend: {
        value: number;
        label: string;
        direction: 'up' | 'down' | 'neutral';
      };
    }[]
  >([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [recentLearners, setRecentLearners] = useState<Learner[]>([]);
  const [atRiskHint, setAtRiskHint] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [learnerRes, progRes, progressRes, snapRes] = await Promise.all([
          learnerService.getAll(),
          programmeService.getAll(),
          reportsService.getProgress(),
          reportsService.getSetaSnapshot(),
        ]);
        if (cancelled) return;
        const learners = learnerRes.data ?? [];
        const progs = progRes.data ?? [];
        const progressRows = progressRes.data ?? [];
        const snap = snapRes.data;

        const totalEnrollments = learners.length;
        const completedEnroll = progressRows.find(
          (r) => r.status === 'COMPLETED',
        );
        const completedN = completedEnroll?._count?.status ?? 0;
        const completionPct =
          totalEnrollments > 0
            ? Math.round((completedN / totalEnrollments) * 100)
            : 0;

        const docRatio =
          snap && snap.enrollments > 0
            ? Math.min(100, Math.round((snap.docs / snap.enrollments) * 100))
            : 0;

        setStats([
          {
            title: 'Total learners (enrolments)',
            value: String(totalEnrollments),
            icon: <Users className="h-6 w-6" />,
            trend: {
              value: 0,
              label: 'live from API',
              direction: 'neutral' as const,
            },
          },
          {
            title: 'Programmes',
            value: String(progs.length),
            icon: <Award className="h-6 w-6" />,
            trend: {
              value: 0,
              label: 'active listings',
              direction: 'neutral' as const,
            },
          },
          {
            title: 'Completion rate',
            value: `${completionPct}%`,
            icon: <TrendingUp className="h-6 w-6" />,
            trend: {
              value: 0,
              label: 'by enrolment status',
              direction: 'neutral' as const,
            },
          },
          {
            title: 'Evidence coverage',
            value: `${docRatio}%`,
            icon: <CheckCircle className="h-6 w-6" />,
            trend: {
              value: snap?.docs ?? 0,
              label: 'documents on file',
              direction: 'neutral' as const,
            },
          },
        ]);

        const rows: ProgramRow[] = progs.map((p: Programme) => {
          const lc = p.learnerCount ?? 0;
          const cr = p.completionRate ?? 0;
          const completed = Math.round((lc * cr) / 100);
          const active = Math.max(0, lc - completed);
          return {
            id: p.id,
            name: p.title,
            seta: p.seta,
            count: lc,
            active,
            completed,
            progress: cr,
          };
        });
        setPrograms(rows);

        const recent = [...learners]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime(),
          )
          .slice(0, 4);
        setRecentLearners(recent);
        setAtRiskHint(learners.filter((l) => l.status === 'at_risk').length);
      } catch {
        if (!cancelled) {
          setStats([]);
          setPrograms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(programs.length / 5));
  const pageSlice = programs.slice((currentPage - 1) * 5, currentPage * 5);

  const columns = [
  {
    header: 'LEARNERSHIP',
    accessorKey: 'name' as const,
    cell: (row: ProgramRow) =>
    <div
      className="cursor-pointer hover:text-brand-blue"
      onClick={() => navigate('/programmes')}>
      
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">{row.seta}</div>
        </div>

  },
  {
    header: 'LEARNER COUNT',
    accessorKey: 'count' as const
  },
  {
    header: 'ACTIVE',
    accessorKey: 'active' as const
  },
  {
    header: 'COMPLETED',
    accessorKey: 'completed' as const
  },
  {
    header: 'PROGRESS AVG',
    accessorKey: 'progress' as const,
    cell: (row: ProgramRow) =>
    <div className="w-full max-w-xs flex items-center">
          <div className="flex-1 mr-3">
            <ProgressBar value={row.progress} size="sm" />
          </div>
          <span className="text-xs font-medium text-gray-700">
            {row.progress}%
          </span>
        </div>

  }];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">
          Overview of learnership programs and system performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) =>
        <StatCard key={i} {...stat} delay={i * 0.1} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card
            title="Learnership Programs"
            action={
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/programmes')}>
              
                Add Program
              </Button>
            }
            noPadding>
            
            <DataTable data={pageSlice} columns={columns} keyField="id" />
            <div className="p-4 border-t border-gray-100 flex justify-center">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  &lt;
                </Button>
                <span className="flex items-center text-sm text-gray-600 px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }>
                  
                  &gt;
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card title="AI Insights">
            <div className="absolute top-4 right-4">
              <Badge variant="info" className="bg-brand-navy text-white">
                AI
              </Badge>
            </div>
            <div className="space-y-4 mt-2">
              <div
                className="bg-gray-50 p-3 rounded-md border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => navigate('/learners')}>
                
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      Dropout Risk Alert
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {atRiskHint} enrolment{atRiskHint === 1 ? '' : 's'} marked
                      at risk across programmes (see learner directory).
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="bg-gray-50 p-3 rounded-md border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => navigate('/reports')}>
                
                <div className="flex items-start">
                  <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      Performance Trend
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Manufacturing program showing 15% improvement in
                      completion rates
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Recent Activity">
            <div className="space-y-4">
              {recentLearners.length === 0 ? (
                <p className="text-sm text-gray-500">No enrolments yet.</p>
              ) : (
                recentLearners.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2 transition-colors"
                    onClick={() => navigate(`/learner/${l.id}`)}>
                    <Avatar name={l.name} className="h-8 w-8 mr-3" />
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{l.name}</span> —{' '}
                        {l.programmeName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {l.lastActivity} ·{' '}
                        {l.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div
                className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2 transition-colors"
                onClick={() => navigate('/seta-exports')}>
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Exports</span> — SETA / NLRD
                    workflows
                  </p>
                  <p className="text-xs text-gray-500">Open export centre</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>);

}