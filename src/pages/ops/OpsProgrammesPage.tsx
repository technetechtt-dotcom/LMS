import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { programmeService } from '../../services/api';
import type { Programme } from '../../types';
import { useOpsOrganisation } from '../../hooks/useOpsOrganisation';
import { SETA_SELECT_OPTIONS, NQF_LEVEL_OPTIONS } from '../../constants/saqa-reference';

interface QualificationRow {
  id: string;
  saqaId: string;
  title: string;
  nqfLevel: number;
  totalCredits: number;
  seta: string | null;
}

export function OpsProgrammesPage() {
  const { selectedOrgId } = useOpsOrganisation();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [qualifications, setQualifications] = useState<QualificationRow[]>([]);
  const [selectedQualificationId, setSelectedQualificationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [res, qRes] = await Promise.all([
        programmeService.getAll(),
        programmeService.getQualifications(),
      ]);
      setProgrammes(res.data ?? []);
      setQualifications(qRes.data ?? []);
      if (qRes.data?.length && !selectedQualificationId) {
        setSelectedQualificationId(qRes.data[0].id);
      }
    } catch {
      toast.error('Could not load programmes or qualifications');
    } finally {
      setLoading(false);
    }
  }, [selectedQualificationId]);

  useEffect(() => {
    load();
  }, [load, selectedOrgId]);

  const selectedQual = qualifications.find((q) => q.id === selectedQualificationId);

  const columns = [
    { header: 'Title', accessorKey: 'title' as const },
    { header: 'Code', accessorKey: 'code' as const },
    {
      header: 'NQF',
      accessorKey: 'nqfLevel' as const,
      cell: (row: Programme) => `Level ${row.nqfLevel}`,
    },
    {
      header: 'Kind',
      accessorKey: 'programmeKind' as const,
      cell: (row: Programme) => (
        <Badge variant="neutral">
          {row.programmeKind === 'SKILLS_PROGRAMME'
            ? 'Skills'
            : 'Occupational'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: Programme) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Learners',
      accessorKey: 'learnerCount' as const,
      className: 'hidden sm:table-cell',
    },
  ];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qId = String(fd.get('qualificationId') || selectedQualificationId);
    if (!qId) {
      toast.error('SAQA Qualification is required.');
      return;
    }
    const currentQual = qualifications.find((q) => q.id === qId);

    try {
      await programmeService.create({
        qualificationId: qId,
        title: String(fd.get('title') ?? ''),
        code: String(fd.get('code') ?? ''),
        programmeKind: String(
          fd.get('programmeKind') ?? 'OCCUPATIONAL_PROGRAMME',
        ) as Programme['programmeKind'],
        nqfLevel: currentQual ? currentQual.nqfLevel : Number(fd.get('nqfLevel') ?? 5),
        credits: currentQual ? currentQual.totalCredits : Number(fd.get('credits') ?? 120),
        seta: currentQual?.seta ? currentQual.seta : String(fd.get('seta') ?? 'MICT SETA'),
        description: String(fd.get('description') ?? ''),
        status: 'draft',
      });
      toast.success('Programme created');
      setShowModal(false);
      await load();
    } catch {
      toast.error('Could not create programme');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programmes</h1>
          <p className="text-gray-500 mt-1">
            Qualifications and learnerships for the active organisation.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add programme
        </Button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={programmes} keyField="id" />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create programme">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            name="qualificationId"
            label="SAQA Qualification *"
            value={selectedQualificationId}
            onChange={(e) => setSelectedQualificationId(e.target.value)}
            options={[
              { value: '', label: 'Select SAQA qualification...' },
              ...qualifications.map((q) => ({
                value: q.id,
                label: `SAQA ${q.saqaId} - ${q.title} (Level ${q.nqfLevel}, ${q.totalCredits} cr)`,
              })),
            ]}
          />
          <Input name="title" label="Title" required />
          <Input name="code" label="Code" required placeholder="ITS-NQF5" />
          <Select
            name="programmeKind"
            label="Programme kind"
            options={[
              { value: 'OCCUPATIONAL_PROGRAMME', label: 'Occupational programme' },
              { value: 'SKILLS_PROGRAMME', label: 'Skills programme' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              name="nqfLevel"
              label={`NQF level ${selectedQual ? '(Derived - read-only)' : ''}`}
              value={selectedQual ? String(selectedQual.nqfLevel) : undefined}
              defaultValue="5"
              disabled={Boolean(selectedQual)}
              options={NQF_LEVEL_OPTIONS}
            />
            <Input
              name="credits"
              type="number"
              label={`Credits ${selectedQual ? '(Derived - read-only)' : ''}`}
              value={selectedQual ? selectedQual.totalCredits : undefined}
              defaultValue="120"
              disabled={Boolean(selectedQual)}
              required
            />
          </div>
          <Select
            name="seta"
            label={`SETA ${selectedQual ? '(Derived - read-only)' : ''}`}
            value={selectedQual?.seta ? selectedQual.seta : undefined}
            defaultValue="MICT SETA"
            disabled={Boolean(selectedQual)}
            options={SETA_SELECT_OPTIONS}
          />
          <Input name="description" label="Description" placeholder="Programme description..." />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
