import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { organisationService } from '../../services/api';
import { useOpsOrganisation } from '../../hooks/useOpsOrganisation';

type OrgRow = {
  id: string;
  name: string;
  type: string;
  registrationNo: string;
};

export function OpsOrganisationsPage() {
  const { isPlatformAdmin } = useOpsOrganisation();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await organisationService.list();
      setOrgs(
        (res.data ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          type: o.type,
          registrationNo: (o as { registrationNo?: string }).registrationNo ?? '—',
        })),
      );
    } catch {
      toast.error('Could not load organisations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = [
    { header: 'Name', accessorKey: 'name' as const },
    {
      header: 'Type',
      accessorKey: 'type' as const,
      cell: (row: OrgRow) => (
        <Badge variant="neutral">{row.type.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      header: 'Registration',
      accessorKey: 'registrationNo' as const,
      className: 'hidden sm:table-cell',
    },
  ];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await organisationService.create({
        name: String(fd.get('name') ?? ''),
        type: String(fd.get('type') ?? 'SDP'),
        registrationNo: String(fd.get('registrationNo') ?? '') || undefined,
      });
      toast.success('Organisation created');
      setShowModal(false);
      await load();
    } catch {
      toast.error('Could not create organisation');
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Organisation</h1>
        <p className="text-gray-500">
          Organisation creation is limited to platform administrators.
        </p>
        <DataTable columns={columns} data={orgs} keyField="id" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-gray-500 mt-1">
            SDPs, employers, and SETA partners on the platform.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add organisation
        </Button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={orgs} keyField="id" />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create organisation">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="name" label="Organisation name" required />
          <Select
            name="type"
            label="Type"
            defaultValue="SDP"
            options={[
              { value: 'SDP', label: 'SDP' },
              { value: 'EMPLOYER', label: 'Employer' },
              { value: 'SETA', label: 'SETA' },
            ]}
          />
          <Input name="registrationNo" label="Registration number" />
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
