import React, { useEffect, useMemo, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { attendanceService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { triggerDownload } from '../../utils/downloadJson';

type SessionRow = {
  id: string;
  date: string;
  title: string;
  status: string;
};

function statusLabel(raw: string): string {
  if (raw === 'PRESENT') return 'Present';
  if (raw === 'ABSENT') return 'Absent';
  if (raw === 'LATE') return 'Late';
  if (raw === 'EXCUSED') return 'Excused';
  return raw;
}

export function AttendanceView() {
  const { linkedLearnerId } = useAuth();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!linkedLearnerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    attendanceService
      .list(linkedLearnerId)
      .then((res) => {
        if (cancelled) return;
        setRows(
          (res.data ?? []).map((raw) => {
            const r = raw as {
              id: string;
              sessionDate: string;
              status: string;
              enrollment?: { programme?: { title?: string } };
            };
            return {
              id: r.id,
              date: new Date(r.sessionDate).toLocaleDateString(),
              title: r.enrollment?.programme?.title ?? 'Training session',
              status: statusLabel(r.status),
            };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load attendance');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkedLearnerId]);

  const stats = useMemo(() => {
    const present = rows.filter((r) => r.status === 'Present').length;
    const absent = rows.filter((r) => r.status === 'Absent').length;
    const late = rows.filter((r) => r.status === 'Late').length;
    const total = rows.length || 1;
    const percentage = Math.round((present / total) * 100);
    return { present, absent, late, total: rows.length, percentage };
  }, [rows]);

  const columns = [
    { header: 'Date', accessorKey: 'date' as const },
    {
      header: 'Session',
      accessorKey: 'title' as const,
      cell: (row: SessionRow) => (
        <div className="font-medium text-gray-900">{row.title}</div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: SessionRow) => (
        <Badge
          variant={
            row.status === 'Present'
              ? 'success'
              : row.status === 'Late'
                ? 'warning'
                : 'danger'
          }>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Record',
      accessorKey: 'id' as const,
      cell: () => (
        <div className="flex items-center text-sm text-gray-600">
          <Check className="h-4 w-4 text-green-500 mr-2" />
          Verified
        </div>
      ),
    },
  ];

  const exportRegister = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      ['Date', 'Session', 'Status'],
      ...rows.map((row) => [row.date, row.title, row.status]),
    ]
      .map((values) => values.map(escape).join(','))
      .join('\n');
    triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `attendance-register-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success('Attendance register exported');
  };

  if (loading) {
    return <p className="text-gray-500">Loading attendance…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">Overall Attendance</p>
            <div className="mt-2 flex justify-center">
              <div className="relative h-24 w-24 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={`${stats.percentage >= 80 ? 'text-green-500' : 'text-amber-500'}`}
                    strokeDasharray={`${stats.percentage}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
                <span className="absolute text-xl font-bold text-gray-900">
                  {rows.length ? `${stats.percentage}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Attendance Breakdown</h3>
          <div className="space-y-4">
            <ProgressBar value={stats.present} max={stats.total || 1} label="Present" variant="success" />
            <ProgressBar value={stats.late} max={stats.total || 1} label="Late" variant="warning" />
            <ProgressBar value={stats.absent} max={stats.total || 1} label="Absent" variant="danger" />
          </div>
        </Card>
      </div>

      <Card
        title="Session History"
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={exportRegister}
            disabled={rows.length === 0}>
            Export Register
          </Button>
        }
        noPadding>
        {rows.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">No attendance records yet.</p>
        ) : (
          <DataTable data={rows} columns={columns} keyField="id" />
        )}
      </Card>
    </div>
  );
}
