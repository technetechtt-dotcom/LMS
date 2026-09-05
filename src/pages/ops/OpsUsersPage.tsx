import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  enrollmentService,
  programmeService,
  userService,
  type DirectoryUserRow,
} from '../../services/api';
import { useOpsOrganisation } from '../../hooks/useOpsOrganisation';

type OpsUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleCode: string;
  organisation: string;
  status: string;
  lastLogin: string;
};

const ROLE_FILTER_MAP: Record<string, string> = {
  admin: 'ADMIN',
  facilitator: 'FACILITATOR',
  learner: 'LEARNER',
  assessor: 'ASSESSOR',
  moderator: 'MODERATOR',
  qa_officer: 'QA_OFFICER',
  mentor: 'MENTOR',
};

function mapUser(u: DirectoryUserRow): OpsUserRow {
  const m = u.memberships[0];
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: m?.role?.name ?? '—',
    roleCode: m?.role?.code ?? '',
    organisation: m?.organisation?.name ?? '—',
    status: u.isActive ? 'Active' : 'Inactive',
    lastLogin: u.lastLoginAt
      ? new Date(u.lastLoginAt).toLocaleString()
      : '—',
  };
}

export function OpsUsersPage() {
  const { selectedOrgId, isPlatformAdmin } = useOpsOrganisation();
  const [users, setUsers] = useState<OpsUserRow[]>([]);
  const [roles, setRoles] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);
  const [programmes, setProgrammes] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [userRes, rolesRes, progRes] = await Promise.all([
        userService.getAll(),
        userService.listRoles(),
        programmeService.getAll(),
      ]);
      setUsers((userRes.data ?? []).map(mapUser));
      setRoles(rolesRes.data ?? []);
      setProgrammes(progRes.data ?? []);
    } catch {
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedOrgId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  const columns = [
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'Email', accessorKey: 'email' as const },
    { header: 'Role', accessorKey: 'role' as const },
  ...(isPlatformAdmin
      ? [{ header: 'Organisation', accessorKey: 'organisation' as const }]
      : []),
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: OpsUserRow) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Last login',
      accessorKey: 'lastLogin' as const,
      className: 'hidden md:table-cell',
    },
  ];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '');
    const firstName = String(fd.get('firstName') ?? '');
    const lastName = String(fd.get('lastName') ?? '');
    const roleKey = String(fd.get('role') ?? 'learner');
    const programmeId = String(fd.get('programmeId') ?? '');

    const roleCode = ROLE_FILTER_MAP[roleKey] ?? 'LEARNER';
    const role = roles.find((r) => r.code === roleCode);
    if (!role) {
      toast.error('Invalid role');
      return;
    }

    try {
      const created = await userService.create({
        email,
        firstName,
        lastName,
      });
      const userId = created.data.id;
      await userService.addMembership({
        userId,
        roleId: role.id,
        ...(isPlatformAdmin ? { organisationId: selectedOrgId } : {}),
      });
      if (roleCode === 'LEARNER' && programmeId) {
        await enrollmentService.create({
          learnerId: userId,
          programmeId,
        });
      }
      const temp = created.data.temporaryPassword;
      toast.success(
        temp
          ? `User created. Temporary password: ${temp}`
          : 'User created',
      );
      setShowModal(false);
      await load();
    } catch {
      toast.error('Could not create user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            Create accounts and assign roles
            {isPlatformAdmin ? ' across organisations' : ''}.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add user
        </Button>
      </div>

      <Input
        placeholder="Search by name, email, or role…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} keyField="id" />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create user">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" required />
          </div>
          <Input name="email" type="email" label="Email" required />
          <Select
            name="role"
            label="Role"
            defaultValue="learner"
            options={[
              { value: 'learner', label: 'Learner' },
              { value: 'facilitator', label: 'Facilitator' },
              { value: 'assessor', label: 'Assessor' },
              { value: 'moderator', label: 'Moderator' },
              { value: 'qa_officer', label: 'QA Officer' },
              { value: 'mentor', label: 'Workplace Mentor' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Select
            name="programmeId"
            label="Programme (learners)"
            options={[
              { value: '', label: '— None —' },
              ...programmes.map((p) => ({ value: p.id, label: p.title })),
            ]}
          />
          <p className="text-xs text-gray-500">
            A unique temporary password is emailed to the user and shown once.
          </p>
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
