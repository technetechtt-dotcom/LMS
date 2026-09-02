import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Download,
  Search,
  Eye,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { learnerService } from '../services/api';
import type { Learner } from '../types';
import { exportRecordsAsJson } from '../utils/exportData';

export function FacilitatorLearnersPage() {
  const navigate = useNavigate();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    learnerService
      .getAll()
      .then((res) => {
        if (!cancelled) setLearners(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load learners');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return learners;
    return learners.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.programmeName.toLowerCase().includes(q),
    );
  }, [learners, search]);

  const stats = useMemo(
    () => [
      {
        label: 'Total Learners',
        value: String(learners.length),
        icon: <Users className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'Active',
        value: String(learners.filter((l) => l.status === 'active').length),
        icon: <UserPlus className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'Completed',
        value: String(learners.filter((l) => l.status === 'completed').length),
        icon: <ShieldCheck className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'At Risk',
        value: String(learners.filter((l) => l.status === 'at_risk').length),
        icon: <AlertTriangle className="h-5 w-5 text-gray-500" />,
      },
    ],
    [learners],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My learners</h1>
          <p className="text-sm text-gray-500">Enrolments across your programmes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              exportRecordsAsJson('facilitator-learners.json', filtered, 'Export')
            }>
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 uppercase">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
            {s.icon}
          </Card>
        ))}
      </div>

      <Input
        placeholder="Search learners…"
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">No learners found.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <Card
              key={l.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={l.name} />
                <div>
                  <h3 className="font-medium text-gray-900">{l.name}</h3>
                  <p className="text-sm text-gray-500">{l.email}</p>
                  <p className="text-xs text-gray-400">
                    {l.programmeName} · {l.progress}% progress
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    l.status === 'at_risk'
                      ? 'warning'
                      : l.status === 'completed'
                        ? 'success'
                        : 'neutral'
                  }>
                  {l.status.replace('_', ' ')}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Eye className="h-4 w-4" />}
                  onClick={() => navigate(`/learner/${l.id}`)}>
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
