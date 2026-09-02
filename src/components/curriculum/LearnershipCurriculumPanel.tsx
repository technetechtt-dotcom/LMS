import React from 'react';
import { BookOpen, Wrench, Building2 } from 'lucide-react';
import {
  KM_ARTIFACTS,
  MODULE_FAMILIES,
  PM_ARTIFACTS,
  WM_ARTIFACTS,
  type ModuleFamily,
} from '../../utils/learnershipCurriculum';

function ModuleFamilyBlock({
  family,
  artifacts,
  icon,
}: {
  family: ModuleFamily;
  artifacts: typeof KM_ARTIFACTS;
  icon: React.ReactNode;
}) {
  const meta = MODULE_FAMILIES[family];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="text-brand-navy mt-0.5">{icon}</div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">{meta.label}</h4>
          <p className="text-xs text-slate-600 mt-0.5">{meta.description}</p>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Module code prefix: {meta.prefix}XX
          </p>
          <ul className="mt-3 space-y-1">
            {artifacts.map((a) => (
              <li
                key={a.slug}
                className="text-xs text-slate-700 flex items-center justify-between gap-2">
                <span>{a.label}</span>
                <span className="text-slate-400 shrink-0">
                  {a.poeComponent}
                  {a.learnerWorkflow ? ' · learner workflow' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function LearnershipCurriculumPanel() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Every learnership is organised into module families. Knowledge modules (KM)
        carry five standard documents; practical (PM) and workplace (WM) modules
        carry their own instrument sets where the qualification requires them.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ModuleFamilyBlock
          family="KM"
          artifacts={KM_ARTIFACTS}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <ModuleFamilyBlock
          family="PM"
          artifacts={PM_ARTIFACTS}
          icon={<Wrench className="h-5 w-5" />}
        />
        <ModuleFamilyBlock
          family="WM"
          artifacts={WM_ARTIFACTS}
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
