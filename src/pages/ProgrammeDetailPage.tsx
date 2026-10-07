import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Shield,
  Users,
  UserPlus,
  Trash2,
  ExternalLink,
  Edit,
  Plus,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  UserCheck,
  FolderPlus,
  Calendar,
  Settings,
  Archive,
} from 'lucide-react';
import type { Programme, Learner } from '../types';
import {
  programmeService,
  learnerService,
  enrollmentService,
  directoryService,
} from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import {
  PROGRAMME_KIND_LABELS,
  PROGRAMME_POE_ARTIFACTS_NOTE,
} from '../utils/programmeKind';

export interface ProgrammeModuleDetail {
  id: string;
  code: string;
  title: string;
  moduleType?: 'KNOWLEDGE' | 'PRACTICAL' | 'WORKPLACE';
  credits: number;
  order?: number;
  description?: string | null;
  unitStandardId?: string | null;
  programmeId?: string;
  assessmentIds?: string[];
  materialIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FacilitatorAssignmentDetail {
  id: string;
  facilitatorId: string;
  facilitator?: { firstName: string; lastName: string; email: string };
  moduleId?: string | null;
  module?: { code: string; title: string } | null;
  cohortId?: string | null;
  cohort?: { name: string } | null;
  learnerId?: string | null;
  learner?: { firstName: string; lastName: string } | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export type ProgrammeDetailData = Omit<Programme, 'modules'> & {
  modules: ProgrammeModuleDetail[];
  facilitatorAssignments?: FacilitatorAssignmentDetail[];
};

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function ProgrammeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const canEditRequirements =
    user?.role === 'Admin' ||
    user?.role === 'QA Officer' ||
    (user?.role as string) === 'QA_OFFICER';

  const [programme, setProgramme] = useState<ProgrammeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [directoryLearners, setDirectoryLearners] = useState<Learner[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [facilitatorStaff, setFacilitatorStaff] = useState<StaffMember[]>([]);
  const [listVersion, setListVersion] = useState(0);

  // Cohorts state
  const [cohorts, setCohorts] = useState<
    Array<{
      id: string;
      programmeId: string;
      name: string;
      startDate?: string | null;
      endDate?: string | null;
      archivedAt?: string | null;
      learnerCount?: number;
      facilitatorCount?: number;
    }>
  >([]);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null);
  const [cohortForm, setCohortForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  // Completion Requirements state
  const [completionRules, setCompletionRules] = useState<{
    requireAllAssessmentsC: boolean;
    requireWorkbook: boolean;
    requireSummative: boolean;
    minVerifiedWorkplaceHours: number;
    minAttendanceRatePercent: number;
  } | null>(null);
  const [showCompletionRulesModal, setShowCompletionRulesModal] = useState(false);
  const [completionRulesForm, setCompletionRulesForm] = useState({
    requireAllAssessmentsC: true,
    requireWorkbook: true,
    requireSummative: true,
    minVerifiedWorkplaceHours: 0,
    minAttendanceRatePercent: 80,
  });

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [learnerToAdd, setLearnerToAdd] = useState('');

  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [editDetailsForm, setEditDetailsForm] = useState({
    title: '',
    code: '',
    description: '',
  });

  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    code: '',
    moduleType: 'KNOWLEDGE' as 'KNOWLEDGE' | 'PRACTICAL' | 'WORKPLACE',
    credits: '10',
    description: '',
  });

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const [showAssignFacilitatorModal, setShowAssignFacilitatorModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    facilitatorId: '',
    scopeType: 'programme' as 'programme' | 'module' | 'cohort' | 'learner',
    moduleId: '',
    cohortId: '',
    learnerId: '',
    startDate: '',
    endDate: '',
  });

  const loadCohorts = useCallback(async () => {
    if (!id) return;
    try {
      const res = await programmeService.getCohorts(id);
      if (res.success && res.data) {
        setCohorts(res.data);
      }
    } catch {
      // ignore
    }
  }, [id]);

  const loadCompletionRules = useCallback(async () => {
    if (!id) return;
    try {
      const res = await programmeService.getCompletionRequirements(id);
      if (res.success && res.data) {
        setCompletionRules(res.data);
        setCompletionRulesForm({
          requireAllAssessmentsC: Boolean(res.data.requireAllAssessmentsC),
          requireWorkbook: Boolean(res.data.requireWorkbook),
          requireSummative: Boolean(res.data.requireSummative),
          minVerifiedWorkplaceHours: Number(res.data.minVerifiedWorkplaceHours || 0),
          minAttendanceRatePercent: Number(res.data.minAttendanceRatePercent || 0),
        });
      }
    } catch {
      // ignore
    }
  }, [id]);

  const reloadProgramme = useCallback(async () => {
    if (!id) return;
    try {
      const [res] = await Promise.all([
        programmeService.getById(id),
        loadCohorts(),
        loadCompletionRules(),
      ]);
      if (res.success && res.data) {
        setProgramme(res.data as unknown as ProgrammeDetailData);
        setEditDetailsForm({
          title: res.data.title || '',
          code: res.data.code || '',
          description: res.data.description || '',
        });
      }
    } catch {
      toast.error('Could not refresh programme');
    }
  }, [id, loadCohorts, loadCompletionRules]);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [res] = await Promise.all([
          programmeService.getById(id),
          loadCohorts(),
          loadCompletionRules(),
        ]);
        if (!cancelled && res.success && res.data) {
          setProgramme(res.data as unknown as ProgrammeDetailData);
          setEditDetailsForm({
            title: res.data.title || '',
            code: res.data.code || '',
            description: res.data.description || '',
          });
        }
      } catch {
        if (!cancelled) {
          toast.error('Programme not found');
          navigate('/programmes', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, loadCohorts, loadCompletionRules]);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDirectoryLoading(true);
    Promise.all([
      learnerService.getAll(),
      directoryService.staff({ roles: ['FACILITATOR'] }).catch(() => ({ data: { items: [] } })),
    ])
      .then(([learnerRes, staffRes]) => {
        if (!cancelled) {
          setDirectoryLearners(learnerRes.data);
          const data = staffRes?.data;
          const items =
            data && typeof data === 'object' && 'items' in data
              ? (data as { items: StaffMember[] }).items
              : data || [];
          setFacilitatorStaff(Array.isArray(items) ? (items as StaffMember[]) : []);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load learner or staff directory');
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, listVersion]);

  const enrolledLearners = useMemo(() => {
    if (!programme?.id) return [];
    return directoryLearners.filter((l) => l.programmeId === programme.id);
  }, [programme?.id, directoryLearners]);

  const availableToEnrol = useMemo(() => {
    if (!id) return [];
    const enrolledUserIds = new Set(
      directoryLearners
        .filter((l) => l.programmeId === id)
        .map((l) => l.userId),
    );
    const out: Learner[] = [];
    const seen = new Set<string>();
    for (const l of directoryLearners) {
      if (enrolledUserIds.has(l.userId)) continue;
      if (seen.has(l.userId)) continue;
      seen.add(l.userId);
      out.push(l);
    }
    return out;
  }, [id, directoryLearners]);

  // Curriculum completeness check
  const completeness = useMemo(() => {
    const modules: ProgrammeModuleDetail[] = programme?.modules || [];
    const hasKM = modules.some(
      (m) => m.moduleType === 'KNOWLEDGE' || m.code.startsWith('KM'),
    );
    const hasPM = modules.some(
      (m) => m.moduleType === 'PRACTICAL' || m.code.startsWith('PM'),
    );
    const hasWM = modules.some(
      (m) => m.moduleType === 'WORKPLACE' || m.code.startsWith('WM'),
    );
    return {
      hasKM,
      hasPM,
      hasWM,
      isComplete: hasKM && hasPM && hasWM,
    };
  }, [programme?.modules]);

  const handleRemove = useCallback(
    async (enrollmentId: string, name: string) => {
      if (!programme?.id) return;
      if (
        !window.confirm(
          `Remove ${name} from this programme? Their learner record remains in the directory — only this enrolment is removed.`,
        )
      ) {
        return;
      }
      try {
        await enrollmentService.remove(enrollmentId);
        toast.success('Learner removed from programme');
        setListVersion((v) => v + 1);
      } catch {
        toast.error('Could not remove enrolment');
      }
    },
    [programme?.id],
  );

  const handleAdd = async () => {
    if (!programme?.id || !learnerToAdd) return;
    try {
      await enrollmentService.create({
        learnerId: learnerToAdd,
        programmeId: programme.id,
      });
      const name = availableToEnrol.find((l) => l.userId === learnerToAdd)?.name;
      toast.success(name ? `${name} added to programme` : 'Learner added');
      setLearnerToAdd('');
      setShowAddModal(false);
      setListVersion((v) => v + 1);
    } catch {
      toast.error('Could not create enrolment');
    }
  };

  const handleSaveDetails = async () => {
    if (!programme?.id) return;
    try {
      await programmeService.updateDetails(programme.id, {
        title: editDetailsForm.title.trim(),
        code: editDetailsForm.code.trim(),
        description: editDetailsForm.description.trim(),
      });
      toast.success('Programme details updated');
      setShowEditDetailsModal(false);
      await reloadProgramme();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not update programme details');
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'archived') => {
    if (!programme?.id) return;
    if (newStatus === 'active' && !completeness.isComplete) {
      toast.error(
        'Cannot activate programme: Must include at least one Knowledge (KM), Practical (PM), and Workplace (WM) module.',
      );
      return;
    }
    try {
      await programmeService.updateStatus(programme.id, newStatus);
      toast.success(`Programme status updated to ${newStatus}`);
      await reloadProgramme();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not update programme status');
    }
  };

  const handleSaveModule = async () => {
    if (!programme?.id) return;
    if (!moduleForm.title.trim() || !moduleForm.code.trim()) {
      toast.error('Title and code are required');
      return;
    }
    const credits = parseInt(moduleForm.credits, 10) || 10;
    try {
      if (editingModuleId) {
        await programmeService.updateModule(programme.id, editingModuleId, {
          title: moduleForm.title.trim(),
          code: moduleForm.code.trim(),
          moduleType: moduleForm.moduleType,
          credits,
          description: moduleForm.description.trim() || undefined,
        });
        toast.success('Module updated');
      } else {
        await programmeService.addModule(programme.id, {
          title: moduleForm.title.trim(),
          code: moduleForm.code.trim(),
          moduleType: moduleForm.moduleType,
          credits,
          description: moduleForm.description.trim() || undefined,
        });
        toast.success('Module added');
      }
      setShowAddModuleModal(false);
      setEditingModuleId(null);
      setModuleForm({
        title: '',
        code: '',
        moduleType: 'KNOWLEDGE',
        credits: '10',
        description: '',
      });
      await reloadProgramme();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not save module');
    }
  };

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!programme?.id) return;
    if (!window.confirm(`Delete module "${title}"? This cannot be undone.`)) return;
    try {
      await programmeService.deleteModule(programme.id, moduleId);
      toast.success('Module deleted');
      await reloadProgramme();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not delete module');
    }
  };

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if (!programme?.id || !programme.modules) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= programme.modules.length) return;

    const list = [...programme.modules];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const moduleIds = list.map((m) => m.id);
    try {
      await programmeService.reorderModules(programme.id, moduleIds);
      toast.success('Module order updated atomically');
      await reloadProgramme();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not reorder modules');
    }
  };

  const handleAssignFacilitator = async () => {
    if (!programme?.id || !assignForm.facilitatorId) {
      toast.error('Please select a facilitator');
      return;
    }
    try {
      await programmeService.assignFacilitator(programme.id, {
        facilitatorId: assignForm.facilitatorId,
        moduleId: assignForm.scopeType === 'module' ? assignForm.moduleId || undefined : undefined,
        cohortId: assignForm.scopeType === 'cohort' ? assignForm.cohortId || undefined : undefined,
        learnerId: assignForm.scopeType === 'learner' ? assignForm.learnerId || undefined : undefined,
        startDate: assignForm.startDate || undefined,
        endDate: assignForm.endDate || undefined,
      });
      toast.success('Facilitator assigned successfully');
      setShowAssignFacilitatorModal(false);
      setAssignForm({
        facilitatorId: '',
        scopeType: 'programme',
        moduleId: '',
        cohortId: '',
        learnerId: '',
        startDate: '',
        endDate: '',
      });
      await reloadProgramme();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not assign facilitator');
    }
  };

  const handleSaveCohort = async () => {
    if (!programme?.id || !cohortForm.name.trim()) {
      toast.error('Cohort name is required');
      return;
    }
    try {
      if (editingCohortId) {
        await programmeService.updateCohort(editingCohortId, {
          name: cohortForm.name.trim(),
          startDate: cohortForm.startDate || null,
          endDate: cohortForm.endDate || null,
        });
        toast.success('Cohort updated successfully');
      } else {
        await programmeService.createCohort(programme.id, {
          name: cohortForm.name.trim(),
          startDate: cohortForm.startDate || undefined,
          endDate: cohortForm.endDate || undefined,
        });
        toast.success('Cohort created successfully');
      }
      setShowCohortModal(false);
      setEditingCohortId(null);
      setCohortForm({ name: '', startDate: '', endDate: '' });
      await loadCohorts();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not save cohort');
    }
  };

  const handleToggleArchiveCohort = async (cohort: { id: string; archivedAt?: string | null }) => {
    try {
      const isArchived = Boolean(cohort.archivedAt);
      await programmeService.updateCohort(cohort.id, {
        archived: !isArchived,
      });
      toast.success(isArchived ? 'Cohort unarchived' : 'Cohort archived');
      await loadCohorts();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not update cohort');
    }
  };

  const handleDeleteCohort = async (cohortId: string) => {
    if (!window.confirm('Are you sure you want to delete this cohort?')) return;
    try {
      await programmeService.deleteCohort(cohortId);
      toast.success('Cohort deleted');
      await loadCohorts();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not delete cohort');
    }
  };

  const handleSaveCompletionRules = async () => {
    if (!programme?.id) return;
    try {
      await programmeService.updateCompletionRequirements(programme.id, {
        requireAllAssessmentsC: completionRulesForm.requireAllAssessmentsC,
        requireWorkbook: completionRulesForm.requireWorkbook,
        requireSummative: completionRulesForm.requireSummative,
        minVerifiedWorkplaceHours: Number(completionRulesForm.minVerifiedWorkplaceHours),
        minAttendanceRatePercent: Number(completionRulesForm.minAttendanceRatePercent),
      });
      toast.success('Completion requirements updated successfully');
      setShowCompletionRulesModal(false);
      await loadCompletionRules();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not update completion requirements');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!programme?.id) return;
    if (!window.confirm('Revoke this facilitator allocation?')) return;
    try {
      await programmeService.removeFacilitatorAssignment(programme.id, assignmentId);
      toast.success('Allocation revoked');
      await reloadProgramme();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Could not revoke allocation');
    }
  };

  const enrolColumns = useMemo(
    () => [
      {
        header: 'Learner',
        accessorKey: 'name' as const,
        cell: (row: Learner) => (
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        ),
      },
      {
        header: 'ID number',
        accessorKey: 'idNumber' as const,
      },
      {
        header: 'Progress',
        accessorKey: 'progress' as const,
        cell: (row: Learner) => `${row.progress}%`,
      },
      {
        header: 'Status',
        accessorKey: 'status' as const,
        cell: (row: Learner) => {
          const v =
            row.status === 'active'
              ? 'success'
              : row.status === 'completed'
              ? 'info'
              : row.status === 'at_risk'
              ? 'warning'
              : 'neutral';
          return (
            <Badge variant={v} className="capitalize">
              {row.status.replace('_', ' ')}
            </Badge>
          );
        },
      },
      {
        header: 'Actions',
        accessorKey: 'id' as const,
        cell: (row: Learner) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/learner/${row.id}`)}>
              Profile
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-700 hover:text-red-800"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => handleRemove(row.id, row.name)}>
                Remove
              </Button>
            )}
          </div>
        ),
      },
    ],
    [isAdmin, navigate, handleRemove],
  );

  if (loading || directoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (!programme) return null;

  const statusVariant =
    programme.status === 'active'
      ? 'success'
      : programme.status === 'draft'
      ? 'neutral'
      : 'warning';

  const addOptions = [
    { value: '', label: 'Choose a learner…' },
    ...availableToEnrol.map((l) => ({
      value: l.userId,
      label: `${l.name} · ${l.email}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header and Lifecycle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/programmes"
            className="inline-flex items-center text-sm text-brand-blue hover:underline mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            All programmes
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{programme.title}</h1>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Edit className="h-3.5 w-3.5" />}
                onClick={() => setShowEditDetailsModal(true)}>
                Edit Details
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {programme.code} · NQF Level {programme.nqfLevel} · {programme.credits} credits
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="info" className="text-xs font-normal">
              {PROGRAMME_KIND_LABELS[programme.programmeKind as keyof typeof PROGRAMME_KIND_LABELS] || programme.programmeKind}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mt-2 max-w-2xl">
            {PROGRAMME_POE_ARTIFACTS_NOTE}
          </p>
        </div>

        {/* Programme Lifecycle State Management */}
        <div className="flex flex-col sm:items-end gap-2">
          <Badge variant={statusVariant} className="w-fit uppercase text-xs">
            {programme.status}
          </Badge>
          {isAdmin && (
            <div className="flex items-center gap-2 pt-1">
              {programme.status !== 'active' && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                  onClick={() => handleStatusChange('active')}>
                  Activate
                </Button>
              )}
              {programme.status !== 'draft' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('draft')}>
                  Set Draft
                </Button>
              )}
              {programme.status !== 'archived' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusChange('archived')}>
                  Archive
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Curriculum Readiness Validation Banner */}
      {isAdmin && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            completeness.isComplete
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
          <div className="flex items-center gap-2">
            {completeness.isComplete ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span>
              <strong>Curriculum Activation Readiness:</strong>{' '}
              {completeness.isComplete
                ? 'All required Knowledge (KM), Practical (PM), and Workplace (WM) components are registered.'
                : 'Incomplete curriculum. Activation requires at least one KM, PM, and WM module.'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className={completeness.hasKM ? 'text-emerald-700' : 'text-amber-700'}>
              KM: {completeness.hasKM ? '✓' : '✗'}
            </span>
            <span>·</span>
            <span className={completeness.hasPM ? 'text-emerald-700' : 'text-amber-700'}>
              PM: {completeness.hasPM ? '✓' : '✗'}
            </span>
            <span>·</span>
            <span className={completeness.hasWM ? 'text-emerald-700' : 'text-amber-700'}>
              WM: {completeness.hasWM ? '✓' : '✗'}
            </span>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-start gap-3">
          <GraduationCap className="h-8 w-8 text-brand-navy shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">SETA</p>
            <p className="font-medium text-gray-900">{programme.seta}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-start gap-3">
          <Users className="h-8 w-8 text-brand-navy shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Enrolled learners</p>
            <p className="font-medium text-gray-900">{enrolledLearners.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-start gap-3">
          <BookOpen className="h-8 w-8 text-brand-navy shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Completion rate</p>
            <p className="font-medium text-gray-900">{programme.completionRate}%</p>
          </div>
        </Card>
      </div>

      {/* Overview & Description */}
      <Card title="Overview">
        <p className="text-sm text-gray-700 leading-relaxed">
          {programme.description || 'No description provided for this programme.'}
        </p>
      </Card>

      {/* Modules & Curriculum Management with Reordering */}
      <Card
        title="Curriculum & Programme Modules"
        action={
          isAdmin ? (
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingModuleId(null);
                setModuleForm({
                  title: '',
                  code: `KM-0${(programme.modules?.length || 0) + 1}`,
                  moduleType: 'KNOWLEDGE',
                  credits: '10',
                  description: '',
                });
                setShowAddModuleModal(true);
              }}>
              Add Module
            </Button>
          ) : undefined
        }>
        <p className="text-sm text-gray-600 mb-4">
          Structured into Knowledge (KM), Practical (PM), and Workplace (WM) modules. Admins can add, edit, remove, and reorder modules atomically.
        </p>
        {!programme.modules || programme.modules.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border border-dashed rounded-lg">
            No modules registered yet for this programme. Use "Add Module" to start building curriculum.
          </p>
        ) : (
          <div className="space-y-3">
            {programme.modules.map((m: ProgrammeModuleDetail, idx: number) => (
              <div
                key={m.id || idx}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  {isAdmin && (
                    <div className="flex flex-col gap-1 mt-0.5">
                      <button
                        title="Move Up"
                        disabled={idx === 0}
                        onClick={() => handleMoveModule(idx, 'up')}
                        className={`p-1 rounded hover:bg-gray-200 ${
                          idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
                        }`}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Move Down"
                        disabled={idx === programme.modules.length - 1}
                        onClick={() => handleMoveModule(idx, 'down')}
                        className={`p-1 rounded hover:bg-gray-200 ${
                          idx === programme.modules.length - 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600'
                        }`}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {idx + 1}. {m.code}: {m.title}
                      </span>
                      <Badge
                        variant={
                          m.moduleType === 'KNOWLEDGE'
                            ? 'info'
                            : m.moduleType === 'PRACTICAL'
                            ? 'warning'
                            : 'success'
                        }>
                        {m.moduleType ||
                          (m.code.startsWith('KM')
                            ? 'KNOWLEDGE'
                            : m.code.startsWith('PM')
                            ? 'PRACTICAL'
                            : 'WORKPLACE')}
                      </Badge>
                    </div>
                    {m.description && (
                      <p className="text-xs text-gray-600 mt-1">{m.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Credits</span>
                    <p className="text-sm font-bold text-gray-900">{m.credits}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingModuleId(m.id);
                          setModuleForm({
                            title: m.title,
                            code: m.code,
                            moduleType: m.moduleType || 'KNOWLEDGE',
                            credits: String(m.credits),
                            description: m.description || '',
                          });
                          setShowAddModuleModal(true);
                        }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteModule(m.id, m.title)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Programme Cohorts */}
      <Card
        title="Programme Cohorts"
        action={
          isAdmin ? (
            <Button
              size="sm"
              leftIcon={<FolderPlus className="h-4 w-4" />}
              onClick={() => {
                setEditingCohortId(null);
                setCohortForm({ name: '', startDate: '', endDate: '' });
                setShowCohortModal(true);
              }}>
              Create Cohort
            </Button>
          ) : undefined
        }>
        <p className="text-sm text-gray-600 mb-4">
          Group enrolled learners into cohort intakes for structured delivery schedules and targeted facilitator allocations.
        </p>
        {cohorts.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border border-dashed rounded-lg">
            No cohorts created yet. Use Create Cohort to start a new intake.
          </p>
        ) : (
          <div className="divide-y border rounded-lg overflow-hidden">
            {cohorts.map((c) => (
              <div key={c.id} className="p-3 bg-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                    <Badge variant={c.archivedAt ? 'neutral' : 'success'} className="text-[10px]">
                      {c.archivedAt ? 'Archived' : 'Active'}
                    </Badge>
                    {c.learnerCount !== undefined && (
                      <Badge variant="info" className="text-[10px]">
                        {c.learnerCount} {c.learnerCount === 1 ? 'Learner' : 'Learners'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.startDate
                      ? `Dates: ${new Date(c.startDate).toLocaleDateString()} - ${
                          c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Ongoing'
                        }`
                      : 'Ongoing schedule (no strict date boundary)'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCohortId(c.id);
                        setCohortForm({
                          name: c.name,
                          startDate: c.startDate ? c.startDate.slice(0, 10) : '',
                          endDate: c.endDate ? c.endDate.slice(0, 10) : '',
                        });
                        setShowCohortModal(true);
                      }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={c.archivedAt ? 'Unarchive' : 'Archive'}
                      onClick={() => handleToggleArchiveCohort(c)}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteCohort(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Facilitator Allocation Management */}
      <Card
        title="Facilitator Assignments & Allocation Scope"
        action={
          isAdmin ? (
            <Button
              size="sm"
              leftIcon={<UserCheck className="h-4 w-4" />}
              onClick={() => setShowAssignFacilitatorModal(true)}>
              Assign Facilitator
            </Button>
          ) : undefined
        }>
        <p className="text-sm text-gray-600 mb-4">
          Facilitators can be allocated at full-programme scope, or restricted to specific modules, cohorts, or learners.
        </p>
        {!programme.facilitatorAssignments || programme.facilitatorAssignments.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border border-dashed rounded-lg">
            No facilitators currently assigned to this programme.
          </p>
        ) : (
          <div className="divide-y border rounded-lg overflow-hidden">
            {programme.facilitatorAssignments.map((fa: FacilitatorAssignmentDetail) => {
              const scopeLabel = fa.moduleId
                ? `Module: ${fa.module?.code || fa.moduleId}`
                : fa.learnerId
                ? `Learner: ${fa.learner?.firstName || fa.learnerId}`
                : fa.cohortId
                ? `Cohort: ${fa.cohort?.name || fa.cohortId}`
                : 'Full Programme Scope';

              return (
                <div key={fa.id} className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">
                        {fa.facilitator
                          ? `${fa.facilitator.firstName} ${fa.facilitator.lastName}`
                          : `Facilitator ID: ${fa.facilitatorId}`}
                      </p>
                      <Badge variant={fa.isActive ? 'success' : 'neutral'} className="text-[10px]">
                        {fa.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="info" className="text-[10px]">
                        {scopeLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fa.startDate
                        ? `Valid: ${new Date(fa.startDate).toLocaleDateString()} - ${
                            fa.endDate ? new Date(fa.endDate).toLocaleDateString() : 'Indefinite'
                          }`
                        : 'Active with indefinite allocation'}
                    </p>
                  </div>
                  {isAdmin && fa.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 text-xs"
                      onClick={() => handleRemoveAssignment(fa.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Enrolled Learners */}
      <Card
        title="Enrolled Learners"
        action={
          isAdmin ? (
            <Button
              size="sm"
              leftIcon={<UserPlus className="h-4 w-4" />}
              disabled={availableToEnrol.length === 0}
              onClick={() => {
                setLearnerToAdd('');
                setShowAddModal(true);
              }}>
              Add learner
            </Button>
          ) : undefined
        }>
        <p className="text-sm text-gray-600 mb-4">
          {isAdmin
            ? 'Review learner records for this programme, open full profiles, and manage enrolment (add or remove).'
            : 'Learners currently enrolled on this programme. Open a profile for full POE and assessment history.'}
        </p>
        {enrolledLearners.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border border-dashed rounded-lg">
            No learners enrolled yet.
            {isAdmin && ' Use Add learner to enrol someone from the directory.'}
          </p>
        ) : (
          <DataTable
            data={enrolledLearners}
            columns={enrolColumns}
            keyField="id"
            pagination={false}
          />
        )}
      </Card>

      {/* Programme Completion Rules */}
      <Card
        title="Programme Completion Rules & Quality Gate"
        action={
          canEditRequirements ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Settings className="h-4 w-4" />}
              onClick={() => setShowCompletionRulesModal(true)}>
              Edit Requirements
            </Button>
          ) : undefined
        }>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Enrolment transition to <strong>COMPLETED</strong> requires all completion gate requirements configured below to be verified:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">Assessment Competency Standard</span>
              <span className="font-semibold text-gray-900">
                {completionRules?.requireAllAssessmentsC !== false
                  ? 'Mandatory (All Assessments must be Competent "C")'
                  : 'Flexible / Partial Assessments Allowed'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">Summative Assessment Requirement</span>
              <span className="font-semibold text-gray-900">
                {completionRules?.requireSummative !== false ? 'Required' : 'Not Required'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">Workplace Logbook Requirement</span>
              <span className="font-semibold text-gray-900">
                {completionRules?.requireWorkbook !== false ? 'Required & Signed Off' : 'Optional / Not Required'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">Minimum Attendance Rate</span>
              <span className="font-semibold text-gray-900">
                {completionRules?.minAttendanceRatePercent ?? 80}% Attendance Rate Required
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200 md:col-span-2">
              <span className="text-xs text-gray-500 block">Minimum Verified Workplace Hours</span>
              <span className="font-semibold text-gray-900">
                {completionRules?.minVerifiedWorkplaceHours ?? 0} Hours logged and verified
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quality & compliance Note (Fixed text) */}
      <Card title="Quality & compliance">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <Shield className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
          <p>
            Official POE compilation for each learner requires completed and verified documents,
            facilitator tracking, and assessor sign-off (with sample moderation verification where assigned).
          </p>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/programmes')}>
            Back to programmes list
          </Button>
        </div>
      </Card>

      {/* Modal: Enrol Learner */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add learner to programme"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!learnerToAdd}>
              Enrol
            </Button>
          </div>
        }>
        <p className="text-sm text-gray-600 mb-4">
          Select a learner from the directory who is not already on this programme.
        </p>
        <Select
          label="Learner"
          options={addOptions}
          value={learnerToAdd}
          onChange={(e) => setLearnerToAdd(e.target.value)}
        />
      </Modal>

      {/* Modal: Edit Programme Details */}
      <Modal
        isOpen={showEditDetailsModal}
        onClose={() => setShowEditDetailsModal(false)}
        title="Edit Programme Details"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDetailsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDetails}>Save Changes</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input
            label="Programme Title *"
            value={editDetailsForm.title}
            onChange={(e) => setEditDetailsForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            label="Programme Code *"
            value={editDetailsForm.code}
            onChange={(e) => setEditDetailsForm((f) => ({ ...f, code: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-brand-navy focus:outline-none"
              rows={3}
              value={editDetailsForm.description}
              onChange={(e) =>
                setEditDetailsForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Add/Edit Module */}
      <Modal
        isOpen={showAddModuleModal}
        onClose={() => {
          setShowAddModuleModal(false);
          setEditingModuleId(null);
        }}
        title={editingModuleId ? 'Edit Programme Module' : 'Add Programme Module'}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModuleModal(false);
                setEditingModuleId(null);
              }}>
              Cancel
            </Button>
            <Button onClick={handleSaveModule}>Save Module</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input
            label="Module Title *"
            placeholder="e.g. Health and Safety Practices"
            value={moduleForm.title}
            onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Module Code *"
              placeholder="e.g. KM-01"
              value={moduleForm.code}
              onChange={(e) => setModuleForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Input
              label="Credits *"
              type="number"
              min={1}
              value={moduleForm.credits}
              onChange={(e) => setModuleForm((f) => ({ ...f, credits: e.target.value }))}
            />
          </div>
          <Select
            label="Module Classification *"
            value={moduleForm.moduleType}
            onChange={(e) =>
              setModuleForm((f) => ({
                ...f,
                moduleType: e.target.value as 'KNOWLEDGE' | 'PRACTICAL' | 'WORKPLACE',
              }))
            }
            options={[
              { value: 'KNOWLEDGE', label: 'Knowledge (KM)' },
              { value: 'PRACTICAL', label: 'Practical (PM)' },
              { value: 'WORKPLACE', label: 'Workplace (WM)' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-brand-navy focus:outline-none"
              rows={2}
              placeholder="Module overview and learning outcomes..."
              value={moduleForm.description}
              onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Assign Facilitator */}
      <Modal
        isOpen={showAssignFacilitatorModal}
        onClose={() => setShowAssignFacilitatorModal(false)}
        title="Assign Facilitator & Scope"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignFacilitatorModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignFacilitator} disabled={!assignForm.facilitatorId}>
              Confirm Allocation
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <Select
            label="Select Facilitator *"
            value={assignForm.facilitatorId}
            onChange={(e) => setAssignForm((f) => ({ ...f, facilitatorId: e.target.value }))}
            options={[
              { value: '', label: 'Select a facilitator...' },
              ...facilitatorStaff.map((fac) => ({
                value: fac.id,
                label: `${fac.firstName} ${fac.lastName} (${fac.email})`,
              })),
            ]}
          />

          <Select
            label="Allocation Scope *"
            value={assignForm.scopeType}
            onChange={(e) =>
              setAssignForm((f) => ({
                ...f,
                scopeType: e.target.value as 'programme' | 'module' | 'cohort' | 'learner',
              }))
            }
            options={[
              { value: 'programme', label: 'Full Programme Scope' },
              { value: 'module', label: 'Module-Specific Scope' },
              { value: 'cohort', label: 'Cohort-Specific Scope' },
              { value: 'learner', label: 'Individual Learner Scope' },
            ]}
          />

          {assignForm.scopeType === 'module' && (
            <Select
              label="Select Module *"
              value={assignForm.moduleId}
              onChange={(e) => setAssignForm((f) => ({ ...f, moduleId: e.target.value }))}
              options={[
                { value: '', label: 'Select module...' },
                ...(programme.modules || []).map((m: ProgrammeModuleDetail) => ({
                  value: m.id,
                  label: `${m.code}: ${m.title}`,
                })),
              ]}
            />
          )}

          {assignForm.scopeType === 'cohort' && (
            <Select
              label="Select Cohort *"
              value={assignForm.cohortId}
              onChange={(e) => setAssignForm((f) => ({ ...f, cohortId: e.target.value }))}
              options={[
                { value: '', label: 'Select cohort...' },
                ...cohorts.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.archivedAt ? ' (Archived)' : ''}`,
                })),
              ]}
            />
          )}

          {assignForm.scopeType === 'learner' && (
            <Select
              label="Select Enrolled Learner *"
              value={assignForm.learnerId}
              onChange={(e) => setAssignForm((f) => ({ ...f, learnerId: e.target.value }))}
              options={[
                { value: '', label: 'Select learner...' },
                ...enrolledLearners.map((l) => ({
                  value: l.userId,
                  label: `${l.name} (${l.email})`,
                })),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date (Optional)"
              type="date"
              value={assignForm.startDate}
              onChange={(e) => setAssignForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={assignForm.endDate}
              onChange={(e) => setAssignForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Create / Edit Cohort */}
      <Modal
        isOpen={showCohortModal}
        onClose={() => setShowCohortModal(false)}
        title={editingCohortId ? 'Edit Cohort' : 'Create New Intake Cohort'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCohortModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCohort} disabled={!cohortForm.name.trim()}>
              {editingCohortId ? 'Save Changes' : 'Create Cohort'}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <Input
            label="Cohort Name *"
            placeholder="e.g. 2026 Intake A, Gauteng Batch 1"
            value={cohortForm.name}
            onChange={(e) => setCohortForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date (Optional)"
              type="date"
              value={cohortForm.startDate}
              onChange={(e) => setCohortForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={cohortForm.endDate}
              onChange={(e) => setCohortForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Completion Requirements */}
      <Modal
        isOpen={showCompletionRulesModal}
        onClose={() => setShowCompletionRulesModal(false)}
        title="Configure Programme Completion Rules & Quality Gate"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCompletionRulesModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompletionRules}>
              Save Completion Rules
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Define the strict gating conditions required before a learner's enrolment can transition to COMPLETED.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                checked={completionRulesForm.requireAllAssessmentsC}
                onChange={(e) =>
                  setCompletionRulesForm((f) => ({ ...f, requireAllAssessmentsC: e.target.checked }))
                }
              />
              <div>
                <span className="text-sm font-medium text-gray-900 block">Require All Assessments Competent (C)</span>
                <span className="text-xs text-gray-500">
                  Learners cannot graduate until all unit standard assessments are marked competent.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                checked={completionRulesForm.requireSummative}
                onChange={(e) =>
                  setCompletionRulesForm((f) => ({ ...f, requireSummative: e.target.checked }))
                }
              />
              <div>
                <span className="text-sm font-medium text-gray-900 block">Require Summative Assessment</span>
                <span className="text-xs text-gray-500">
                  Final summative integration assessment must be passed before sign-off.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                checked={completionRulesForm.requireWorkbook}
                onChange={(e) =>
                  setCompletionRulesForm((f) => ({ ...f, requireWorkbook: e.target.checked }))
                }
              />
              <div>
                <span className="text-sm font-medium text-gray-900 block">Require Workplace Logbook Sign-off</span>
                <span className="text-xs text-gray-500">
                  Workplace mentor and supervisor logbook reviews must be signed and verified.
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Input
              label="Minimum Attendance Rate (%)"
              type="number"
              min={0}
              max={100}
              value={completionRulesForm.minAttendanceRatePercent}
              onChange={(e) =>
                setCompletionRulesForm((f) => ({
                  ...f,
                  minAttendanceRatePercent: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                }))
              }
            />
            <Input
              label="Minimum Workplace Hours"
              type="number"
              min={0}
              value={completionRulesForm.minVerifiedWorkplaceHours}
              onChange={(e) =>
                setCompletionRulesForm((f) => ({
                  ...f,
                  minVerifiedWorkplaceHours: Math.max(0, parseInt(e.target.value, 10) || 0),
                }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
