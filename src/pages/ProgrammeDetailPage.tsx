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
} from 'lucide-react';
import type { Programme } from '../types';
import type { Learner } from '../types';
import {
  programmeService,
  learnerService,
  enrollmentService,
} from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';
import {
  PROGRAMME_KIND_LABELS,
  PROGRAMME_POE_ARTIFACTS_NOTE,
} from '../utils/programmeKind';

export function ProgrammeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(true);
  const [directoryLearners, setDirectoryLearners] = useState<Learner[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [listVersion, setListVersion] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [learnerToAdd, setLearnerToAdd] = useState('');

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await programmeService.getById(id);
        if (!cancelled && res.success) setProgramme(res.data);
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
  }, [id, navigate]);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDirectoryLoading(true);
    learnerService
      .getAll()
      .then((res) => {
        if (!cancelled) setDirectoryLearners(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load learner directory');
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

  const handleRemove = useCallback(async (enrollmentId: string, name: string) => {
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
  }, [programme?.id]);

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

  if (!programme) {
    return null;
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/programmes"
            className="inline-flex items-center text-sm text-brand-blue hover:underline mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            All programmes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{programme.title}</h1>
          <p className="text-sm text-gray-500">
            {programme.code} · NQF Level {programme.nqfLevel} · {programme.credits}{' '}
            credits
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="info" className="text-xs font-normal">
              {PROGRAMME_KIND_LABELS[programme.programmeKind]}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mt-2 max-w-2xl">
            {PROGRAMME_POE_ARTIFACTS_NOTE}
          </p>
        </div>
        <Badge variant={statusVariant} className="w-fit uppercase text-xs">
          {programme.status}
        </Badge>
      </div>

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
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Enrolled learners
            </p>
            <p className="font-medium text-gray-900">{enrolledLearners.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-start gap-3">
          <BookOpen className="h-8 w-8 text-brand-navy shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Completion rate
            </p>
            <p className="font-medium text-gray-900">
              {programme.completionRate}%
            </p>
          </div>
        </Card>
      </div>

      <Card
        title="Enrolled learners"
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

      <Card title="Overview">
        <p className="text-sm text-gray-700 leading-relaxed">
          {programme.description}
        </p>
      </Card>

      <Card title="Quality & compliance">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <Shield className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
          <p>
            Programme-level assessor and moderator assignment is available from
            the programme <strong>Manage</strong> workflow on the main list.
            Official POE compilation for each learner requires completed documents
            and facilitator / assessor sign-off (moderator when assigned).
          </p>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/programmes')}>
            Back to programmes list
          </Button>
        </div>
      </Card>

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
    </div>
  );
}
