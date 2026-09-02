import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  FileCheck,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer } from
'recharts';
import {
  learnerService,
  programmeService,
  reportsService,
  type LearnershipProgressRow,
} from '../services/api';
import type { Learner } from '../types';
import { downloadJson } from '../utils/downloadJson';

function initialsFromName(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2)
    return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function progressBarColor(progress: number, status: Learner['status']) {
  if (status === 'at_risk' || progress < 50) return 'bg-red-500';
  if (progress < 80) return 'bg-amber-500';
  return 'bg-green-500';
}

function rowDisplayStatus(l: Learner): {
  label: string;
  variant: 'success' | 'danger' | 'warning';
} {
  if (l.status === 'at_risk' || l.progress < 50)
    return { label: 'At Risk', variant: 'danger' };
  if (l.progress < 80) return { label: 'Needs Support', variant: 'warning' };
  return { label: 'On Track', variant: 'success' };
}

function formatLifecycleStatus(status: string) {
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function FacilitatorProgressReportsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [learnersLoading, setLearnersLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [progressRows, setProgressRows] = useState<LearnershipProgressRow[]>(
    [],
  );
  const [setaSnapshot, setSetaSnapshot] = useState<{
    enrollments: number;
    docs: number;
    assessments: number;
    generatedAt: string;
  } | null>(null);

  const [programmeOptions, setProgrammeOptions] = useState<
    { value: string; label: string }[]
  >([{ value: 'all', label: 'All Programs' }]);

  const [appliedProgramme, setAppliedProgramme] = useState('all');
  const [appliedStatus, setAppliedStatus] = useState('all');
  const [appliedDateFrom, setAppliedDateFrom] = useState<string | undefined>(
    undefined,
  );
  const [appliedDateTo, setAppliedDateTo] = useState<string | undefined>(
    undefined,
  );

  const [draftProgramme, setDraftProgramme] = useState('all');
  const [draftStatus, setDraftStatus] = useState('all');
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(searchQuery.trim()),
      350,
    );
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    programmeService
      .getAll()
      .then((res) => {
        const opts = [{ value: 'all', label: 'All Programs' }];
        for (const p of res.data ?? []) {
          opts.push({ value: p.id, label: p.title });
        }
        setProgrammeOptions(opts);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      reportsService.getProgress(),
      reportsService.getSetaSnapshot(),
    ])
      .then(([pr, sr]) => {
        if (cancelled) return;
        setProgressRows(pr.data ?? []);
        setSetaSnapshot(sr.data ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setProgressLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLearnersLoading(true);
    learnerService
      .getAll({
        search: debouncedSearch || undefined,
        status: appliedStatus !== 'all' ? appliedStatus : undefined,
        programme: appliedProgramme !== 'all' ? appliedProgramme : undefined,
        dateFrom: appliedDateFrom,
        dateTo: appliedDateTo,
      })
      .then((res) => {
        if (!cancelled) setLearners(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load learners');
      })
      .finally(() => {
        if (!cancelled) setLearnersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    appliedProgramme,
    appliedStatus,
    appliedDateFrom,
    appliedDateTo,
  ]);

  useEffect(() => {
    if (!showFilters) return;
    setDraftProgramme(appliedProgramme);
    setDraftStatus(appliedStatus);
  }, [showFilters, appliedProgramme, appliedStatus]);

  useEffect(() => {
    if (!showDatePicker) return;
    setDraftDateFrom(appliedDateFrom ?? '');
    setDraftDateTo(appliedDateTo ?? '');
  }, [showDatePicker, appliedDateFrom, appliedDateTo]);

  const programmeTitle = useMemo(() => {
    if (!learners.length) return 'Programme progress';
    const names = new Set(learners.map((l) => l.programmeName));
    if (names.size === 1) return [...names][0];
    return 'All programmes';
  }, [learners]);

  const cohortSubtitle = useMemo(() => {
    if (!learners.length) return '';
    const dates = learners
      .map((l) => l.enrollmentDate)
      .filter(Boolean)
      .sort();
    if (!dates.length) return '';
    const start = dates[0];
    const end = dates[dates.length - 1];
    if (start === end) return `Enrolments from ${start}`;
    return `Enrolments: ${start} – ${end}`;
  }, [learners]);

  const statusChartData = useMemo(
    () =>
      progressRows.map((r) => ({
        name: formatLifecycleStatus(r.status),
        count: r._count.status,
      })),
    [progressRows],
  );

  const progressBandData = useMemo(() => {
    const band = (min: number, max: number, label: string) => ({
      band: label,
      learners: learners.filter(
        (l) => l.progress >= min && l.progress <= max,
      ).length,
    });
    return [
      band(0, 25, '0–25%'),
      band(26, 50, '26–50%'),
      band(51, 75, '51–75%'),
      band(76, 100, '76–100%'),
    ];
  }, [learners]);

  const stats = useMemo(() => {
    const total = learners.length;
    const completed = learners.filter((l) => l.status === 'completed').length;
    const active = total - completed;
    const avgProgress =
      total > 0
        ? Math.round(
            learners.reduce((s, l) => s + l.progress, 0) / total,
          )
        : 0;
    const atRisk = learners.filter(
      (l) => l.status === 'at_risk' || l.progress < 50,
    ).length;
    return [
      {
        label: 'Active / total enrolments',
        value: total ? `${active}/${total}` : '—',
        icon: <Users className="h-5 w-5 text-brand-blue" />,
        trend: completed ? `${completed} completed` : 'No completions yet',
        trendUp: true,
      },
      {
        label: 'Average progress',
        value: total ? `${avgProgress}%` : '—',
        icon: <FileCheck className="h-5 w-5 text-green-600" />,
        trend: 'Across visible cohort',
        trendUp: avgProgress >= 50,
      },
      {
        label: 'SETA-linked records',
        value: setaSnapshot ? String(setaSnapshot.docs) : '—',
        icon: <Clock className="h-5 w-5 text-amber-500" />,
        trend: setaSnapshot
          ? `${setaSnapshot.assessments} assessments in system`
          : 'Loading…',
        trendUp: true,
      },
      {
        label: 'At-risk learners',
        value: total ? String(atRisk) : '—',
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        trend: 'Below 50% or flagged at risk',
        trendUp: atRisk === 0,
      },
    ];
  }, [learners, setaSnapshot]);

  const setaCompliantCount = useMemo(
    () => learners.filter((l) => l.setaStatus === 'compliant').length,
    [learners],
  );
  const setaPct =
    learners.length > 0
      ? Math.round((setaCompliantCount / learners.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Progress Reports</h1>
      </div>

      {/* Report Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {programmeTitle}
          </h2>
          <p className="text-sm text-gray-500">
            {cohortSubtitle || 'Enrolment cohort from API'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:space-x-3">
          <Input
            label=""
            placeholder="Search learners…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-56"
          />
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}>
            
            Filter
          </Button>
          <Button
            variant="outline"
            leftIcon={<Calendar className="h-4 w-4" />}
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={showDatePicker ? 'bg-gray-100' : ''}>
            
            Date Range
          </Button>
          <Button
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => {
              downloadJson('facilitator-progress-report.json', {
                learners,
                progressRows,
                setaSnapshot,
                exportedAt: new Date().toISOString(),
              });
              toast.success('Report exported');
            }}>
            
            Export Report
          </Button>
        </div>
        </div>
      </div>

      {showFilters &&
      <Card className="bg-gray-50 border-dashed">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Filter Reports
            </h3>
            <button
            className="text-sm text-brand-blue hover:underline"
            onClick={() => {
              setDraftProgramme('all');
              setDraftStatus('all');
              setAppliedProgramme('all');
              setAppliedStatus('all');
              toast.success('Filters cleared');
              setShowFilters(false);
            }}>
            
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
            label="Programme"
            value={draftProgramme}
            onChange={(e) => setDraftProgramme(e.target.value)}
            options={programmeOptions} />
          
            <Select
            label="Progress status"
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value)}
            options={[
            {
              value: 'all',
              label: 'All statuses',
            },
            {
              value: 'on-track',
              label: 'On track',
            },
            {
              value: 'at-risk',
              label: 'At risk',
            },
            ]} />
          
            <Button
            className="w-full self-end"
            onClick={() => {
              setAppliedProgramme(draftProgramme);
              setAppliedStatus(draftStatus);
              toast.success('Filters applied');
              setShowFilters(false);
            }}>
            
              Apply filters
            </Button>
          </div>
        </Card>
      }

      {showDatePicker &&
      <Card className="bg-gray-50 border-dashed">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Select Date Range
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input
            label="Start date"
            type="date"
            value={draftDateFrom}
            onChange={(e) => setDraftDateFrom(e.target.value)} />
          
            <Input
            label="End date"
            type="date"
            value={draftDateTo}
            onChange={(e) => setDraftDateTo(e.target.value)} />
          
            <Button
            className="w-full"
            onClick={() => {
              if (
                draftDateFrom &&
                draftDateTo &&
                draftDateFrom > draftDateTo
              ) {
                toast.error('Start date must be before end date');
                return;
              }
              setAppliedDateFrom(draftDateFrom || undefined);
              setAppliedDateTo(draftDateTo || undefined);
              toast.success('Date range applied');
              setShowDatePicker(false);
            }}>
            
              Apply range
            </Button>
          </div>
        </Card>
      }

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) =>
        <div
          key={i}
          className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-gray-50 rounded-full">{stat.icon}</div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            <p
            className={`text-xs mt-1 flex items-center ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
            
              {stat.trendUp ?
            <TrendingUp className="h-3 w-3 mr-1" /> :

            <TrendingDown className="h-3 w-3 mr-1" />
            }
              {stat.trend}
            </p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Enrolment lifecycle (API)
            </h3>
            <span className="text-xs text-brand-blue">By status</span>
          </div>
          {statusChartData.length === 0 ?
          <p className="text-sm text-gray-500 py-12 text-center">
              {progressLoading ? 'Loading…' : 'No enrolment aggregate yet.'}
            </p> :

          <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                dataKey="name"
                tick={{
                  fontSize: 11
                }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60} />
              
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                dataKey="count"
                fill="#6366f1"
                name="Enrolments"
                radius={[2, 2, 0, 0]} />
              
              </BarChart>
            </ResponsiveContainer>
          }
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Progress distribution
            </h3>
            <span className="text-xs text-brand-blue">Filtered learners</span>
          </div>
          {learnersLoading && !learners.length ?
          <p className="text-sm text-gray-500 py-12 text-center">Loading…</p> :

          <ResponsiveContainer width="100%" height={250}>
              <BarChart data={progressBandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                dataKey="band"
                type="category"
                tick={{ fontSize: 12 }}
                width={72} />
              
                <Tooltip />
                <Bar
                dataKey="learners"
                fill="#6366f1"
                name="Learners"
                radius={[0, 4, 4, 0]} />
              
              </BarChart>
            </ResponsiveContainer>
          }
        </Card>
      </div>

      {/* SETA Compliance Status */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            SETA snapshot
          </h3>
          <Badge variant={setaPct >= 80 ? 'success' : 'warning'}>
            {learners.length ? `${setaPct}% learner records compliant` : '—'}
          </Badge>
        </div>
        <div className="space-y-4">
          {[
          {
            label: 'Documents on file',
            desc: setaSnapshot
              ? `${setaSnapshot.docs} document(s) · snapshot ${new Date(setaSnapshot.generatedAt).toLocaleString()}`
              : progressLoading
                ? 'Loading…'
                : 'No snapshot',
            ok: !!setaSnapshot?.docs,
          },
          {
            label: 'Enrolments tracked',
            desc: setaSnapshot
              ? `${setaSnapshot.enrollments} enrolment(s) in reporting scope`
              : '—',
            ok: (setaSnapshot?.enrollments ?? 0) > 0,
          },
          {
            label: 'Assessments',
            desc: setaSnapshot
              ? `${setaSnapshot.assessments} assessment record(s)`
              : '—',
            ok: (setaSnapshot?.assessments ?? 0) > 0,
          },
          {
            label: 'Learner SETA flags',
            desc:
              learners.length > 0
                ? `${setaCompliantCount} of ${learners.length} learners marked compliant in profile`
                : 'No learners loaded',
            ok: learners.length === 0 || setaCompliantCount === learners.length,
          }].
          map((item, i) =>
          <div key={i} className="flex items-start">
              {item.ok ?
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /> :

            <Clock className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
            }
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Learner Progress Details */}
      <Card noPadding>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            Learner Progress Details
          </h3>
          {learnersLoading &&
          <span className="text-xs text-gray-500">Loading…</span>
          }
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Learner</th>
                <th className="text-left px-6 py-3">Progress</th>
                <th className="text-left px-6 py-3">Assessments</th>
                <th className="text-left px-6 py-3">Last Activity</th>
                <th className="text-left px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {learnersLoading &&
              <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading learners…
                  </td>
                </tr>
              }
              {!learnersLoading && learners.length === 0 &&
              <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No learners for these filters.
                  </td>
                </tr>
              }
              {!learnersLoading &&
              learners.map((learner) => {
              const display = rowDisplayStatus(learner);
              const initials = initialsFromName(learner.name);
              const bar = progressBarColor(learner.progress, learner.status);
              return (
                <tr
                key={learner.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/learner/${learner.id}`)}>
                
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-sm font-bold text-gray-600">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {learner.name}
                        </p>
                        <p className="text-xs text-gray-500">{learner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                        className={`h-full rounded-full ${bar}`}
                        style={{
                          width: `${learner.progress}%`
                        }} />
                      
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {learner.progress}%
                      </span>
                    </div>
                  </td>
                  <td
                  className="px-6 py-4 text-sm text-gray-700"
                  title="Competent (C) / total competency assessment records for this enrolment">
                    {(learner.assessmentTotal ?? 0) === 0
                      ? '—'
                      : `${learner.assessmentCompetent ?? 0}/${learner.assessmentTotal ?? 0}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {learner.lastActivity}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={display.variant}>
                      {display.label === 'On Track' &&
                    <CheckCircle className="h-3 w-3 mr-1" />
                    }
                      {display.label === 'At Risk' &&
                    <AlertCircle className="h-3 w-3 mr-1" />
                    }
                      {display.label}
                    </Badge>
                  </td>
                </tr>
              );
              })
              }
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">
            {learnersLoading ?
            '…' :

            `${learners.length} learner(s)`
            }
          </span>
        </div>
      </Card>
    </div>);

}