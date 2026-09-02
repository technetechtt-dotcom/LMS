import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Download, Search, FileCheck, CheckCircle, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { assessmentService, instrumentService } from '../services/api';
import { downloadJson } from '../utils/downloadJson';
import type { Assessment } from '../types';

type InstrumentRow = {
  id: string;
  title: string;
  status: string;
  unitStandardId: string;
  questionCount: number;
};

export function FacilitatorAssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [unitStandards, setUnitStandards] = useState<
    Array<{ id: string; code: string; title: string }>
  >([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [aRes, unitsRes] = await Promise.all([
          assessmentService.getAll(),
          instrumentService.listUnitStandards(),
        ]);
        if (cancelled) return;
        const list = aRes.data ?? [];
        setAssessments(list);
        setUnitStandards(unitsRes.data ?? []);

        const unitIds = [
          ...new Set([
            ...(unitsRes.data ?? []).map((u) => u.id),
            ...list.map((a) => a.moduleId).filter(Boolean),
          ]),
        ];
        const allInstruments: InstrumentRow[] = [];
        for (const unitId of unitIds) {
          const inst = await instrumentService.listByUnit(unitId);
          for (const row of inst.data ?? []) {
            const r = row as {
              id: string;
              title?: string;
              status?: string;
              unitStandardId?: string;
              _count?: { questions?: number };
            };
            allInstruments.push({
              id: r.id,
              title: r.title ?? 'Untitled instrument',
              status: r.status ?? 'DRAFT',
              unitStandardId: r.unitStandardId ?? unitId,
              questionCount: r._count?.questions ?? 0,
            });
          }
        }
        if (!cancelled) setInstruments(allInstruments);
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

  const defaultUnitId =
    unitStandards[0]?.id ?? assessments[0]?.moduleId ?? '';
  const filtered = instruments.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { label: 'Competency records', value: String(assessments.length), icon: <FileCheck className="h-5 w-5 text-gray-500" /> },
    { label: 'Instruments', value: String(instruments.length), icon: <CheckCircle className="h-5 w-5 text-gray-500" /> },
    { label: 'Published', value: String(instruments.filter((i) => i.status === 'PUBLISHED').length), icon: <TrendingUp className="h-5 w-5 text-gray-500" /> },
    { label: 'Drafts', value: String(instruments.filter((i) => i.status === 'DRAFT').length), icon: <FileCheck className="h-5 w-5 text-gray-500" /> },
  ];

  const handleExport = () => {
    downloadJson('assessment-instruments.json', {
      exportedAt: new Date().toISOString(),
      instruments: filtered,
      unitStandards,
    });
    toast.success('Instruments exported');
  };

  const handleNewInstrument = () => {
    if (!defaultUnitId) {
      toast.error('No unit standards available — create a programme module first');
      return;
    }
    navigate(
      `/assessment-builder/new?unitStandardId=${encodeURIComponent(defaultUnitId)}`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment instruments</h1>
          <p className="text-gray-500 text-sm">Build and publish unit-standard assessments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={filtered.length === 0}>
            Export
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleNewInstrument}>
            New instrument
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Input
        placeholder="Search instruments…"
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No instruments yet.{' '}
          {defaultUnitId ? (
            <Button variant="ghost" className="p-0 h-auto" onClick={handleNewInstrument}>
              Create your first instrument
            </Button>
          ) : (
            'Add programme modules to enable instrument creation.'
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500">
                  {item.questionCount} questions · unit {item.unitStandardId.slice(0, 8)}…
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={item.status === 'PUBLISHED' ? 'success' : 'warning'}>
                  {item.status}
                </Badge>
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/assessment-builder/${item.id}?unitStandardId=${encodeURIComponent(item.unitStandardId)}`,
                    )
                  }>
                  {item.status === 'DRAFT' ? 'Edit' : 'View'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/assessments')}>
                  Submissions
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
