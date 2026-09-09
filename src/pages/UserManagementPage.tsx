import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Mail, Phone, Building, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';
import { programmeService, userService } from '../services/api';
import type { DirectoryUserRow } from '../services/api';

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleCode: string;
  organisation: string;
  programmeId: string;
  programmeName: string;
  status: 'Active' | 'Inactive';
  activationPending: boolean;
  lastLogin: string;
};

const ROLE_FILTER_MAP: Record<string, string> = {
  admin: 'ADMIN',
  facilitator: 'FACILITATOR',
  learner: 'LEARNER',
  assessor: 'ASSESSOR',
  moderator: 'MODERATOR',
  seta_official: 'SETA',
};

function mapDirectoryUser(u: DirectoryUserRow): ManagedUser {
  const m = u.memberships[0];
  const roleCode = m?.role?.code ?? '';
  const roleName = m?.role?.name ?? '—';
  const orgName = m?.organisation?.name ?? '—';
  const firstEnr = u.enrollments[0];
  const prog = firstEnr?.programme;
  const last = u.lastLoginAt
    ? new Date(u.lastLoginAt).toLocaleString()
    : '—';
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: roleName,
    roleCode,
    organisation: orgName,
    programmeId: prog?.id ?? 'shared',
    programmeName: prog?.title ?? 'No programme enrolment',
    status: u.isActive ? 'Active' : 'Inactive',
    activationPending: !u.passwordSetAt,
    lastLogin: last,
  };
}

export function UserManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedProgrammeFilter, setSelectedProgrammeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [programmeOptions, setProgrammeOptions] = useState<
    { value: string; label: string }[]
  >([{ value: 'all', label: 'All Learnerships' }]);
  const [loading, setLoading] = useState(true);
  const [roleRows, setRoleRows] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [userRes, progRes, rolesRes] = await Promise.all([
          userService.getAll(),
          programmeService.getAll(),
          userService.listRoles(),
        ]);
        if (cancelled) return;
        setUsers((userRes.data ?? []).map(mapDirectoryUser));
        setRoleRows(rolesRes.data ?? []);
        const opts = [
          { value: 'all', label: 'All Learnerships' },
          ...(progRes.data ?? []).map((p) => ({
            value: p.id,
            label: p.title,
          })),
          { value: 'shared', label: 'No / multiple programmes' },
        ];
        setProgrammeOptions(opts);
      } catch {
        if (!cancelled) toast.error('Could not load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const searchOk =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const wantedCode = ROLE_FILTER_MAP[selectedRoleFilter];
      const roleOk =
        selectedRoleFilter === 'all' ||
        (wantedCode ? u.roleCode === wantedCode : true);
      const statusOk =
        selectedStatusFilter === 'all' ||
        u.status.toLowerCase() === selectedStatusFilter;
      const programmeOk =
        selectedProgrammeFilter === 'all' ||
        u.programmeId === selectedProgrammeFilter;
      return searchOk && roleOk && statusOk && programmeOk;
    });
  }, [
    users,
    searchQuery,
    selectedRoleFilter,
    selectedStatusFilter,
    selectedProgrammeFilter,
  ]);

  const columns = [
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'Email', accessorKey: 'email' as const },
    { header: 'Role', accessorKey: 'role' as const },
    {
      header: 'Learnership / Programme',
      accessorKey: 'programmeName' as const,
      cell: (row: ManagedUser) => (
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
          {row.programmeName}
        </span>
      ),
      className: 'hidden md:table-cell',
    },
    {
      header: 'Organisation',
      accessorKey: 'organisation' as const,
      className: 'hidden lg:table-cell',
    },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: ManagedUser) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'neutral'}>{row.status}</Badge>
      ),
    },
    {
      header: 'Last Login',
      accessorKey: 'lastLogin' as const,
      className: 'hidden sm:table-cell',
    },
    {
      header: 'Actions',
      accessorKey: 'id' as const,
      cell: (row: ManagedUser) => (
        <div className="flex space-x-2">
          {row.activationPending && (
            <button
              aria-label={`Resend activation to ${row.name}`}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const result = await userService.resendActivation(row.id);
                  toast[result.data.mailStatus === 'SENT' ? 'success' : 'error'](
                    result.data.mailStatus === 'SENT'
                      ? 'A replacement activation link was sent.'
                      : 'A replacement link was issued, but delivery failed and was queued for retry.',
                  );
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Could not resend activation');
                }
              }}
              className="text-gray-400 hover:text-brand-blue">
              <Mail className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="text-gray-400 hover:text-brand-blue">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleEdit = (user: ManagedUser) => {
    setSelectedUser(user);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const programmeId = formData.get('programmeId') as string;
    const roleKey = formData.get('role') as string;

    const newErrors: Record<string, string> = {};
    if (!email || !email.includes('@')) newErrors.email = 'Valid email required';
    if (!firstName || firstName.length < 2) newErrors.firstName = 'Required (min 2 chars)';
    if (!lastName || lastName.length < 2) newErrors.lastName = 'Required (min 2 chars)';
    if (phone && !phone.startsWith('+27')) newErrors.phone = 'Must start with +27';
    if (!programmeId || programmeId === 'all') {
      newErrors.programmeId = 'Assign a learnership/programme';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (selectedUser) {
      setIsModalOpen(false);
      toast.success('User assignment updated (enrolment changes via Enrolments admin)');
      return;
    }

    const roleCode = ROLE_FILTER_MAP[roleKey] ?? 'LEARNER';
    const role = roleRows.find((r) => r.code === roleCode);
    if (!role) {
      toast.error('Could not resolve role');
      return;
    }

    try {
      const created = await userService.create({
        email,
        firstName,
        lastName,
        roleId: role.id,
        ...(roleCode === 'LEARNER' ? { programmeId } : {}),
      });
      setIsModalOpen(false);
      toast.success(
        created.data.mailStatus === 'SENT'
          ? 'Account provisioned. An expiring activation link was sent.'
          : 'Account provisioned, but activation email delivery failed.',
      );
      const userRes = await userService.getAll();
      setUsers((userRes.data ?? []).map(mapDirectoryUser));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create user');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">
            Manage access per learnership/programme, including role and organisation mapping.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleAdd}>
          Add User
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={selectedProgrammeFilter}
            onChange={(e) => setSelectedProgrammeFilter(e.target.value)}
            options={programmeOptions}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'admin', label: 'Administrator' },
              { value: 'facilitator', label: 'Facilitator' },
              { value: 'learner', label: 'Learner' },
              { value: 'assessor', label: 'Assessor' },
              { value: 'moderator', label: 'Moderator' },
            ]}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      <DataTable
        data={filteredUsers}
        columns={columns}
        keyField="id"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? 'Edit User Assignment' : 'Add User Assignment'}
        size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="firstName"
              label="First Name"
              placeholder="John"
              defaultValue={selectedUser?.name.split(' ')[0]}
              error={errors.firstName}
              required
            />

            <Input
              name="lastName"
              label="Last Name"
              placeholder="Doe"
              defaultValue={selectedUser?.name.split(' ')[1]}
              error={errors.lastName}
              required
            />
          </div>

          <Input
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            icon={<Mail className="h-4 w-4" />}
            defaultValue={selectedUser?.email}
            error={errors.email}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              name="role"
              label="Role"
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'facilitator', label: 'Facilitator' },
                { value: 'learner', label: 'Learner' },
                { value: 'assessor', label: 'Assessor' },
                { value: 'moderator', label: 'Moderator' },
                { value: 'seta_official', label: 'SETA Official' },
                { value: 'workplace_mentor', label: 'Workplace Mentor' },
              ]}
              defaultValue={selectedUser?.role.toLowerCase().replace(' ', '_')}
            />

            <Input
              name="phone"
              label="Phone Number"
              placeholder="+27 82 123 4567"
              icon={<Phone className="h-4 w-4" />}
              error={errors.phone}
            />
          </div>

          <Select
            name="programmeId"
            label="Learnership / Programme"
            defaultValue={selectedUser?.programmeId ?? 'all'}
            options={programmeOptions.filter((p) => p.value !== 'all')}
            error={errors.programmeId}
            required
          />

          <Input
            name="organisation"
            label="Organisation"
            placeholder="Company Name"
            icon={<Building className="h-4 w-4" />}
            defaultValue={selectedUser?.organisation}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{selectedUser ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
