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
import { directoryService, type ScopedDirectoryEntry } from '../services/api';
import { exportRecordsAsJson } from '../utils/exportData';

type StaffRow = { id: string; name: string; role: string; status: string };

function roleMatchesTab(user: ScopedDirectoryEntry, tab: string): boolean {
  if (tab === 'facilitators') return user.role === 'FACILITATOR';
  return user.role === 'ASSESSOR' || user.role === 'MODERATOR';
}

export function FacilitatorsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('facilitators');
  const [users, setUsers] = useState<ScopedDirectoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    directoryService
      .staff({ roles: ['FACILITATOR', 'ASSESSOR', 'MODERATOR'], pageSize: 50 })
      .then((res) => {
        if (!cancelled) setUsers(res.data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load staff directory');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo<StaffRow[]>(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) => roleMatchesTab(user, activeTab))
      .filter((user) => !query || user.name.toLowerCase().includes(query))
      .map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role.replace(/_/g, ' '),
        status: user.status.replace(/_/g, ' '),
      }));
  }, [activeTab, search, users]);

  const stats = [
    { title: 'Facilitators', value: users.filter((u) => u.role === 'FACILITATOR').length },
    { title: 'Assessors & moderators', value: users.filter((u) => ['ASSESSOR', 'MODERATOR'].includes(u.role)).length },
    { title: 'Active accounts', value: users.filter((u) => u.status === 'ACTIVE').length },
  ];

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name' as const,
      cell: (row: StaffRow) => (
        <div className="flex items-center">
          <Avatar name={row.name} className="mr-3" size="sm" />
          <div className="font-medium text-gray-900">{row.name}</div>
        </div>
      ),
    },
    { header: 'Role', accessorKey: 'role' as const },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: StaffRow) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff management</h1>
          <p className="text-sm text-gray-500">Assignment-safe staff directory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => exportRecordsAsJson('staff-directory.json', rows, 'Staff list')}>Export</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/users')}>Add user</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-4">
            <p className="text-xs text-gray-500 uppercase">{stat.title}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>
      <Tabs tabs={[{ id: 'facilitators', label: 'Facilitators' }, { id: 'assessors', label: 'Assessors & moderators' }]} activeTab={activeTab} onChange={setActiveTab} />
      <Input placeholder="Search staff…" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      <Card noPadding>
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : rows.length === 0 ? <p className="p-6 text-gray-500">No staff found for this tab.</p> : <DataTable data={rows} columns={columns} keyField="id" />}
      </Card>
    </div>
  );
}
