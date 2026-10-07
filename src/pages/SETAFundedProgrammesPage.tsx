import React, { useEffect, useMemo, useState } from 'react';
import { Search, Building, Users, Download, BarChart3, FileText, Calendar, Database, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  learnerService,
  programmeService,
  reportsService,
  type SetaComplianceReport,
  type ProgrammeComplianceRow,
} from '../services/api';
import type { Learner, Programme } from '../types';

export function SETAFundedProgrammesPage() {
  const [report, setReport] = useState<SetaComplianceReport | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, pRes, lRes] = await Promise.all([
        reportsService.getSetaCompliance(),
        programmeService.getAll(),
        learnerService.getAll(),
      ]);
      if (compRes.success && compRes.data) {
        setReport(compRes.data);
      }
      setProgrammes(pRes.data ?? []);
      setLearners(lRes.data ?? []);
    } catch {
      toast.error('Could not load SETA programme & compliance oversight data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const complianceRows: ProgrammeComplianceRow[] = useMemo(() => {
    if (!report?.programmes) return [];
    return report.programmes;
  }, [report]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return complianceRows;
    return complianceRows.filter(
      (p) =>
        p.providerName.toLowerCase().includes(q) ||
        p.programmeTitle.toLowerCase().includes(q) ||
        p.programmeCode.toLowerCase().includes(q) ||
        p.seta.toLowerCase().includes(q),
    );
  }, [complianceRows, search]);

  const selected = complianceRows.find((p) => p.programmeId === selectedId) ?? null;
  const cohortLearners = selected
    ? learners.filter((l) => l.programmeId === selected.programmeId)
    : [];

  const columns = [
    {
      header: 'Training Provider',
      accessorKey: 'providerName' as const,
      cell: (row: ProgrammeComplianceRow) => (
        <div>
          <span className="font-medium text-gray-900">{row.providerName}</span>
          <p className="text-xs text-gray-500">{row.seta}</p>
        </div>
      ),
    },
    {
      header: 'Programme',
      accessorKey: 'programmeTitle' as const,
      cell: (row: ProgrammeComplianceRow) => (
        <div>
          <span className="font-medium text-gray-900">{row.programmeTitle}</span>
          <p className="text-xs text-gray-500">
            {row.programmeCode} • NQF {row.nqfLevel ?? 'Unknown'} ({row.credits ?? 'Unknown'} cr)
          </p>
        </div>
      ),
    },
    {
      header: 'Enrolments',
      accessorKey: 'totalEnrolments' as const,
      cell: (row: ProgrammeComplianceRow) => (
        <span className="text-sm">
          {row.totalEnrolments}{' '}
          <span className="text-xs text-gray-500">({row.activeEnrolments} active)</span>
        </span>
      ),
    },
    {
      header: 'Learner Progress',
      accessorKey: 'averageLearnerProgress' as const,
      cell: (row: ProgrammeComplianceRow) => (
        <div className="w-28 space-y-1">
          <ProgressBar value={row.averageLearnerProgress} size="sm" aria-label={`${row.programmeTitle} learner progress`} />
          <p className="text-[11px] text-gray-500 text-right">{row.averageLearnerProgress}% avg</p>
        </div>
      ),
    },
    {
      header: 'Completion Rate',
      accessorKey: 'programmeCompletionRate' as const,
      cell: (row: ProgrammeComplianceRow) => (
        <div className="w-28 space-y-1">
          <ProgressBar value={row.programmeCompletionRate} size="sm" variant="brand" aria-label={`${row.programmeTitle} completion rate`} />
          <p className="text-[11px] text-gray-500 text-right">{row.programmeCompletionRate}%</p>
        </div>
      ),
    },
    {
      header: 'Regulatory Compliance',
      accessorKey: 'regulatoryComplianceRate' as const,
      cell: (row: ProgrammeComplianceRow) => (
        <div className="w-32 space-y-1">
          <ProgressBar
            value={row.regulatoryComplianceRate}
            size="sm"
            aria-label={`${row.programmeTitle} regulatory compliance`}
            variant={
              row.status === 'Compliant'
                ? 'success'
                : row.status === 'Review Required'
                ? 'warning'
                : row.status === 'Not Measured'
                ? 'brand'
                : 'danger'
            }
          />
          <div className="flex justify-between items-center text-[11px]">
            <Badge
              variant={
                row.status === 'Compliant'
                  ? 'success'
                  : row.status === 'Review Required'
                  ? 'warning'
                  : row.status === 'Not Measured'
                  ? 'neutral'
                  : 'danger'
              }
              className="text-[10px] px-1 py-0">
              {row.status}
            </Badge>
            <span className="font-medium">{row.regulatoryComplianceRate}%</span>
          </div>
        </div>
      ),
    },
  ];

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const { blob, filename } = await reportsService.downloadSetaCompliance(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`SETA compliance report (${format.toUpperCase()}) downloaded`);
    } catch {
      toast.error(`Failed to download ${format.toUpperCase()} compliance report`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 p-6">Loading SETA compliance & oversight data…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SETA Oversight & Compliance</h1>
          <p className="text-sm text-gray-500">
            Authoritative regulatory oversight: genuine multi-factor compliance verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            disabled={exporting}
            onClick={() => void handleExport('csv')}>
            Export CSV
          </Button>
          <Button
            size="sm"
            leftIcon={<FileText className="h-4 w-4" />}
            disabled={exporting}
            onClick={() => void handleExport('pdf')}>
            Export Official PDF
          </Button>
        </div>
      </div>

      {/* Authoritative Audit & Calculation Metadata Banner */}
      {report && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-medium text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Calculation Date: {new Date(report.calculationDate).toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              Data Source: {report.dataSource}
            </span>
          </div>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Direct DB Verification Active
          </span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex gap-3 items-center">
          <Building className="h-8 w-8 text-brand-navy" />
          <div>
            <p className="text-xs text-gray-500">Funded Programmes</p>
            <p className="text-2xl font-bold">{report?.summary.totalProgrammes ?? programmes.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex gap-3 items-center">
          <Users className="h-8 w-8 text-brand-navy" />
          <div>
            <p className="text-xs text-gray-500">Total Enrolments</p>
            <p className="text-2xl font-bold">{report?.summary.totalEnrolments ?? learners.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex gap-3 items-center">
          <BarChart3 className="h-8 w-8 text-indigo-600" />
          <div>
            <p className="text-xs text-gray-500">Avg Learner Progress</p>
            <p className="text-2xl font-bold">{report?.summary.overallAverageProgress ?? 0}%</p>
          </div>
        </Card>
        <Card className="p-4 flex gap-3 items-center">
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
          <div>
            <p className="text-xs text-gray-500">Regulatory Compliance</p>
            <p className="text-2xl font-bold text-emerald-700">
              {report?.summary.overallRegulatoryCompliance ?? 0}%
            </p>
          </div>
        </Card>
      </div>

      <Input
        placeholder="Search training providers, programmes, codes, or SETAs…"
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Funded Programmes & Regulatory Compliance" noPadding>
          <DataTable
            data={filtered}
            columns={columns}
            keyField="programmeId"
            onRowClick={(row) => setSelectedId(row.programmeId)}
          />
        </Card>

        {/* Drill-down panel */}
        <Card title={selected ? `${selected.programmeTitle} - Drill-down` : 'Programme Detail'}>
          {!selected ? (
            <p className="text-sm text-gray-500">
              Select a programme row to inspect verified compliance metrics and learners.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Provider Organisation</p>
                <p className="text-base font-bold text-gray-900">{selected.providerName}</p>
                <p className="text-xs text-gray-500">{selected.seta}</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 uppercase">
                  Verified Compliance Factors
                </p>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between items-center">
                    <span>Verified Documents:</span>
                    <span className="font-semibold text-gray-900">
                      {selected.metrics.verifiedDocumentsRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Attendance Rate:</span>
                    <span className="font-semibold text-gray-900">
                      {selected.metrics.attendanceRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Assessment Competency:</span>
                    <span className="font-semibold text-gray-900">
                      {selected.metrics.assessmentRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Quality Moderation:</span>
                    <span className="font-semibold text-gray-900">
                      {selected.metrics.moderationRate}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Enrolled Learners ({cohortLearners.length})
                </p>
                <ul className="divide-y max-h-56 overflow-y-auto border rounded-md">
                  {cohortLearners.length === 0 ? (
                    <li className="p-3 text-xs text-gray-500 text-center">No learners enrolled</li>
                  ) : (
                    cohortLearners.map((l) => (
                      <li key={l.id} className="p-2 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{l.name}</p>
                          <p className="text-[10px] text-gray-500">{l.idNumber}</p>
                        </div>
                        <span className="font-medium text-gray-600">{l.progress}% progress</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
