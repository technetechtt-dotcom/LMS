import React, { useEffect, useMemo, useState } from 'react';
import { Search, Building, Users, Download, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ProgressBar } from '../components/ui/ProgressBar';
import { learnerService, programmeService, reportsService } from '../services/api';
import type { Learner, Programme } from '../types';
import { downloadJson } from '../utils/downloadJson';

type ProviderRow = {
  id: string;
  name: string;
  programme: string;
  learners: number;
  activeLearners: number;
  compliance: number;
  status: string;
};

export function SETAFundedProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, lRes, snapRes] = await Promise.all([
          programmeService.getAll(),
          learnerService.getAll(),
          reportsService.getSetaSnapshot(),
        ]);
        if (cancelled) return;
        setProgrammes(pRes.data ?? []);
        setLearners(lRes.data ?? []);
        void snapRes;
      } catch {
        if (!cancelled) toast.error('Could not load SETA programme data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const providers: ProviderRow[] = useMemo(() => {
    return programmes.map((p) => {
      const cohort = learners.filter((l) => l.programmeId === p.id);
      const active = cohort.filter((l) => l.status === 'active').length;
      const avgProgress =
        cohort.length > 0
          ? Math.round(
              cohort.reduce((s, l) => s + l.progress, 0) / cohort.length,
            )
          : 0;
      return {
        id: p.id,
        name: p.seta ?? 'Training provider',
        programme: p.title,
        learners: cohort.length,
        activeLearners: active,
        compliance: avgProgress,
        status: avgProgress >= 75 ? 'On Track' : 'At Risk',
      };
    });
  }, [programmes, learners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.programme.toLowerCase().includes(q),
    );
  }, [providers, search]);

  const selected = providers.find((p) => p.id === selectedId) ?? null;
  const cohortLearners = selected
    ? learners.filter((l) => l.programmeId === selected.id)
    : [];

  const columns = [
    { header: 'Provider', accessorKey: 'name' as const },
    { header: 'Programme', accessorKey: 'programme' as const },
    { header: 'Learners', accessorKey: 'learners' as const },
    {
      header: 'Compliance',
      accessorKey: 'compliance' as const,
      cell: (row: ProviderRow) => (
        <div className="w-32">
          <ProgressBar value={row.compliance} size="sm" />
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: ProviderRow) => (
        <Badge variant={row.status === 'On Track' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  const exportData = async () => {
    try {
      const [snap, progress] = await Promise.all([
        reportsService.getSetaSnapshot(),
        reportsService.getProgress(),
      ]);
      downloadJson('seta-funded-export.json', {
        providers: filtered,
        learners: cohortLearners.length ? cohortLearners : learners,
        snapshot: snap.data,
        progress: progress.data,
      });
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return <p className="text-gray-500 p-6">Loading SETA programmes…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SETA-funded programmes</h1>
          <p className="text-sm text-gray-500">
            Provider oversight from live programme and enrolment data
          </p>
        </div>
        <Button leftIcon={<Download className="h-4 w-4" />} onClick={() => void exportData()}>
          Export oversight pack
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex gap-3 items-center">
          <Building className="h-8 w-8 text-brand-navy" />
          <div>
            <p className="text-xs text-gray-500">Programmes</p>
            <p className="text-2xl font-bold">{programmes.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex gap-3 items-center">
          <Users className="h-8 w-8 text-brand-navy" />
          <div>
            <p className="text-xs text-gray-500">Enrolments</p>
            <p className="text-2xl font-bold">{learners.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex gap-3 items-center">
          <BarChart3 className="h-8 w-8 text-brand-navy" />
          <div>
            <p className="text-xs text-gray-500">At risk cohorts</p>
            <p className="text-2xl font-bold">
              {providers.filter((p) => p.status === 'At Risk').length}
            </p>
          </div>
        </Card>
      </div>

      <Input
        placeholder="Search providers or programmes…"
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Funded programmes" noPadding>
          <DataTable
            data={filtered}
            columns={columns}
            keyField="id"
            onRowClick={(row) => setSelectedId(row.id)}
          />
        </Card>
        <Card title={selected ? selected.programme : 'Cohort detail'}>
          {!selected ? (
            <p className="text-sm text-gray-500">Select a programme to view learners.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {selected.activeLearners} active of {selected.learners} learners
              </p>
              <ul className="divide-y max-h-80 overflow-y-auto">
                {cohortLearners.map((l) => (
                  <li key={l.id} className="py-2 text-sm flex justify-between">
                    <span>{l.name}</span>
                    <span className="text-gray-500">{l.progress}%</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => void exportData()}>
                Download cohort export
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
