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

export function OpsProgrammesPage() {
  const { selectedOrgId } = useOpsOrganisation();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await programmeService.getAll();
      setProgrammes(res.data ?? []);
    } catch {
      toast.error('Could not load programmes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedOrgId]);

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
    try {
      await programmeService.create({
        title: String(fd.get('title') ?? ''),
        code: String(fd.get('code') ?? ''),
        programmeKind: String(
          fd.get('programmeKind') ?? 'OCCUPATIONAL_PROGRAMME',
        ) as Programme['programmeKind'],
        nqfLevel: Number(fd.get('nqfLevel') ?? 5),
        credits: Number(fd.get('credits') ?? 120),
        seta: String(fd.get('seta') ?? 'MICT SETA'),
        description: String(fd.get('description') ?? ''),
        status: 'active',
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
            <Input
              name="nqfLevel"
              type="number"
              label="NQF level"
              defaultValue="5"
              required
            />
            <Input
              name="credits"
              type="number"
              label="Credits"
              defaultValue="120"
              required
            />
          </div>
          <Input name="seta" label="SETA" defaultValue="MICT SETA" />
          <Input name="description" label="Description" />
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
