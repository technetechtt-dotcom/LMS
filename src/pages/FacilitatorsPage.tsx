import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Plus, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { userService, type DirectoryUserRow } from '../services/api';
import { exportRecordsAsJson } from '../utils/exportData';

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  organisation: string;
  programmes: string;
  status: string;
};

function mapStaff(u: DirectoryUserRow): StaffRow {
  const m = u.memberships[0];
  const programmes = u.enrollments?.length
    ? u.enrollments.map((e) => e.programme?.title).filter(Boolean).join(', ')
    : '—';
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: m?.role?.name ?? '—',
    organisation: m?.organisation?.name ?? '—',
    programmes: programmes || '—',
    status: u.isActive ? 'Active' : 'Inactive',
  };
}

function roleMatchesTab(u: DirectoryUserRow, tab: string): boolean {
  const code = (u.memberships[0]?.role?.code ?? '').toUpperCase();
  if (tab === 'facilitators') return code.includes('FACILITATOR');
  if (tab === 'assessors') {
    return code.includes('ASSESSOR') || code.includes('MODERATOR');
  }
  return true;
}

export function FacilitatorsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('facilitators');
  const [users, setUsers] = useState<DirectoryUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    userService
      .getAll()
      .then((res) => {
        if (!cancelled) setUsers(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load staff directory');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => roleMatchesTab(u, activeTab))
      .map(mapStaff)
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
  }, [users, activeTab, search]);

  const stats = useMemo(
    () => [
      {
        title: 'Facilitators',
        value: String(
          users.filter((u) => roleMatchesTab(u, 'facilitators')).length,
        ),
      },
      {
        title: 'Assessors & moderators',
        value: String(
          users.filter((u) => roleMatchesTab(u, 'assessors')).length,
        ),
      },
      {
        title: 'Active accounts',
        value: String(users.filter((u) => u.isActive).length),
      },
    ],
    [users],
  );

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name' as const,
      cell: (row: StaffRow) => (
        <div className="flex items-center">
          <Avatar name={row.name} className="mr-3" size="sm" />
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    { header: 'Role', accessorKey: 'role' as const },
    { header: 'Organisation', accessorKey: 'organisation' as const },
    { header: 'Programmes', accessorKey: 'programmes' as const },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: StaffRow) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff management</h1>
          <p className="text-sm text-gray-500">
            Facilitators, assessors, and moderators from the user directory
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              exportRecordsAsJson('staff-directory.json', rows, 'Staff list')
            }>
            Export
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/users')}>
            Add user
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.title} className="p-4">
            <p className="text-xs text-gray-500 uppercase">{s.title}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: 'facilitators', label: 'Facilitators' },
          { id: 'assessors', label: 'Assessors & moderators' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <Input
        placeholder="Search staff…"
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card noPadding>
        {loading ? (
          <p className="p-6 text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-gray-500">No staff found for this tab.</p>
        ) : (
          <DataTable data={rows} columns={columns} keyField="id" />
        )}
      </Card>
    </div>
  );
}
