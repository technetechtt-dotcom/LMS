import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { materialService } from '../../services/api';
import type { Programme } from '../../types';
import { ARTIFACT_LABELS, MODULE_FAMILIES } from '../../utils/learnershipCurriculum';

export type ModuleCompletenessRow = {
  moduleCode: string;
  family: 'KM' | 'PM' | 'WM';
  programmeId: string;
  programmeName: string;
  requiredCount: number;
  presentCount: number;
  complete: boolean;
  missing: Array<{ slug: string; label: string }>;
  present: Array<{
    slug: string;
    label: string;
    materialId: string;
    title: string;
  }>;
};

export type ProgrammeCompletenessReport = {
  programmeId: string;
  programmeName: string;
  modules: ModuleCompletenessRow[];
  summary: {
    totalModules: number;
    completeModules: number;
    incompleteModules: number;
    overallPercent: number;
  };
};

interface ModuleCompletenessPanelProps {
  programmes: Programme[];
  programmeFilter: string;
  onProgrammeFilterChange?: (id: string) => void;
}

export function ModuleCompletenessPanel({
  programmes,
  programmeFilter,
  onProgrammeFilterChange,
}: ModuleCompletenessPanelProps) {
  const [reports, setReports] = useState<ProgrammeCompletenessReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void materialService
      .getCompleteness(
        programmeFilter !== 'all' ? programmeFilter : undefined,
      )
      .then((res) => {
        if (!cancelled) setReports(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [programmeFilter]);

  const displayReports = useMemo(() => {
    if (programmeFilter === 'all') return reports;
    const one = reports.find((r) => r.programmeId === programmeFilter);
    return one ? [one] : [];
  }, [reports, programmeFilter]);

  const incompleteCount = useMemo(
    () =>
      displayReports.reduce(
        (n, r) => n + r.modules.filter((m) => !m.complete).length,
        0,
      ),
    [displayReports],
  );

  if (loading) {
    return <p className="text-sm text-gray-500">Checking module completeness…</p>;
  }

  if (displayReports.length === 0 || displayReports.every((r) => !r.modules.length)) {
    return (
      <p className="text-sm text-gray-500">
        No KM / PM / WM module codes found in the library yet. Upload materials
        with codes like <span className="font-mono">KM-01</span>,{' '}
        <span className="font-mono">PM-01</span>, or{' '}
        <span className="font-mono">WM-01</span>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {onProgrammeFilterChange && programmes.length > 0 && (
        <div className="w-full max-w-xs">
          <Select
            aria-label="Programme for completeness"
            value={programmeFilter}
            onChange={(e) => onProgrammeFilterChange(e.target.value)}
            options={[
              { value: 'all', label: 'All programmes' },
              ...programmes.map((p) => ({ value: p.id, label: p.title })),
            ]}
          />
        </div>
      )}

      {displayReports.map((activeReport) => {
        const incompleteModules = activeReport.modules.filter((m) => !m.complete);
        return (
          <div key={activeReport.programmeId} className="space-y-3">
            {programmeFilter === 'all' && (
              <h4 className="text-sm font-semibold text-slate-900">
                {activeReport.programmeName}
              </h4>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-700">
                  <strong>{activeReport.summary.completeModules}</strong> of{' '}
                  <strong>{activeReport.summary.totalModules}</strong> modules
                  complete ({activeReport.summary.overallPercent}%)
                </p>
                {incompleteModules.length > 0 && (
                  <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {incompleteModules.length} module
                    {incompleteModules.length === 1 ? '' : 's'} missing required
                    documents
                  </p>
                )}
              </div>
            </div>

            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {activeReport.modules.map((mod) => {
                const open = expanded[`${activeReport.programmeId}:${mod.moduleCode}`] ?? !mod.complete;
                const familyLabel = MODULE_FAMILIES[mod.family].label;
                const rowKey = `${activeReport.programmeId}:${mod.moduleCode}`;
                return (
                  <li key={rowKey} className="bg-white">
                    <button
                      type="button"
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [rowKey]: !open,
                        }))
                      }>
                      <div className="flex items-center gap-3 min-w-0">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 font-mono">
                            {mod.moduleCode}
                          </p>
                          <p className="text-xs text-slate-500">{familyLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-500">
                          {mod.presentCount}/{mod.requiredCount}
                        </span>
                        {mod.complete ? (
                          <Badge variant="success" className="text-[10px]">
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">
                            {mod.missing.length} missing
                          </Badge>
                        )}
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-3 pl-11 space-y-2">
                        {mod.missing.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-amber-800 mb-1">
                              Missing
                            </p>
                            <ul className="text-xs text-amber-900 space-y-0.5">
                              {mod.missing.map((m) => (
                                <li key={m.slug}>• {m.label}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {mod.present.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              On file
                            </p>
                            <ul className="text-xs text-slate-600 space-y-0.5">
                              {mod.present.map((p) => (
                                <li key={p.slug}>
                                  {ARTIFACT_LABELS[p.slug] ?? p.label}: {p.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {programmeFilter === 'all' && incompleteCount > 0 && (
        <p className="text-xs text-slate-500">
          Tip: filter to one programme to upload missing documents faster.
        </p>
      )}
    </div>
  );
}
