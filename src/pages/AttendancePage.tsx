import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarCheck,
  Download,
  QrCode,
  Filter,
  AlertTriangle,
  TrendingUp,
  UserX,
  CheckCircle,
  Smartphone,
  Zap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/dashboard/StatCard';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { attendanceService, learnerService } from '../services/api';
import { programmeService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { downloadJson } from '../utils/downloadJson';

type AttendanceRow = {
  id: string;
  sessionDateIso: string;
  learner: { name: string; id: string };
  program: string;
  checkIn: string;
  status: string;
  method: string;
  loginTime: string;
  duration: string;
  online: boolean;
  autoMarked: boolean;
};

function mapAttendanceApi(raw: unknown): AttendanceRow {
  const r = raw as {
    id: string;
    sessionDate: string;
    status: string;
    enrollment: {
      learner: { firstName: string; lastName: string };
      programme: { title: string };
    };
  };
  const name =
    `${r.enrollment.learner.firstName} ${r.enrollment.learner.lastName}`.trim();
  const when = new Date(r.sessionDate);
  const statusLabel =
    r.status === 'PRESENT'
      ? 'Present'
      : r.status === 'ABSENT'
        ? 'Absent'
        : r.status === 'LATE'
          ? 'Late'
          : r.status === 'EXCUSED'
            ? 'Excused'
            : r.status;
  const timeStr = when.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    id: r.id,
    sessionDateIso: r.sessionDate,
    learner: { name, id: '—' },
    program: r.enrollment.programme.title,
    checkIn: timeStr,
    status: statusLabel,
    method: 'Register',
    loginTime: timeStr,
    duration: '—',
    online: false,
    autoMarked: false,
  };
}

export function AttendancePage() {
  const { user, linkedLearnerId } = useAuth();
  const isLearner = user?.role === 'Learner';
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrPayload, setQrPayload] = useState<{
    sessionId: string;
    qrToken: string;
    expiresAt: string;
  } | null>(null);
  const [programmes, setProgrammes] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualLearners, setManualLearners] = useState<
    Array<{ enrollmentId: string; name: string; status: string }>
  >([]);
  const [manualDate, setManualDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [checkInToken, setCheckInToken] = useState('');
  const [checkInSessionId, setCheckInSessionId] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('week');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    programmeService
      .getAll()
      .then((res) => {
        const list = res.data ?? [];
        setProgrammes(list.map((p) => ({ id: p.id, title: p.title })));
        if (list[0]?.id) setSelectedProgrammeId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    attendanceService
      .list()
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data ?? []).map(mapAttendanceApi);
        setAttendanceData(rows);
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
  }, []);

  const filteredAttendance = useMemo(() => {
    let rows = attendanceData;
    if (selectedProgrammeId) {
      const programme = programmes.find((p) => p.id === selectedProgrammeId);
      if (programme) {
        rows = rows.filter((row) => row.program === programme.title);
      }
    }
    if (statusFilter === 'absent') {
      rows = rows.filter((row) => row.status === 'Absent');
    }
    const now = new Date();
    if (dateRangeFilter === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      rows = rows.filter((row) => new Date(row.sessionDateIso) >= start);
    } else if (dateRangeFilter === 'month') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      rows = rows.filter((row) => new Date(row.sessionDateIso) >= start);
    }
    return rows;
  }, [
    attendanceData,
    selectedProgrammeId,
    programmes,
    statusFilter,
    dateRangeFilter,
  ]);

  const handleExportSeta = () => {
    downloadJson('attendance-seta-report.json', {
      exportedAt: new Date().toISOString(),
      programmeId: selectedProgrammeId || 'all',
      dateRange: dateRangeFilter,
      status: statusFilter,
      records: filteredAttendance,
    });
    toast.success('SETA attendance report exported');
  };

  const stats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    let present = 0;
    let absent = 0;
    for (const row of attendanceData) {
      const d = new Date(row.sessionDateIso);
      if (d < start || d >= end) continue;
      if (row.status === 'Present') present++;
      if (row.status === 'Absent') absent++;
    }
    const denom = present + absent;
    const pct = denom ? Math.round((present / denom) * 100) : 0;
    return [
      {
        title: "Today's attendance",
        value: denom ? `${pct}%` : '—',
        icon: <CalendarCheck className="h-6 w-6" />,
        trend: {
          value: present,
          label: 'present / ' + String(denom) + ' sessions today',
          direction: 'neutral' as const,
        },
      },
      {
        title: 'Total records',
        value: String(attendanceData.length),
        icon: <TrendingUp className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'loaded from API',
          direction: 'neutral' as const,
        },
      },
      {
        title: 'Absent today',
        value: String(absent),
        icon: <UserX className="h-6 w-6" />,
        trend: {
          value: 0,
          label: 'sessions',
          direction: 'neutral' as const,
        },
      },
    ];
  }, [attendanceData]);

  const columns = [
  {
    header: 'Learner',
    accessorKey: 'learner' as const,
    cell: (row: AttendanceRow) =>
    <div className="flex items-center">
          <Avatar name={row.learner.name} className="mr-3" />
          <div>
            <div className="font-medium text-gray-900">{row.learner.name}</div>
            <div className="text-xs text-gray-500">ID: {row.learner.id}</div>
          </div>
        </div>

  },
  {
    header: 'Program',
    accessorKey: 'program' as const
  },
  {
    header: 'Online Status',
    accessorKey: 'online' as const,
    cell: (row: AttendanceRow) =>
    <div>
          <div className="flex items-center mb-1">
            {row.online ?
        <span className="flex items-center text-sm text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                Online
              </span> :

        <span className="flex items-center text-sm text-gray-400">
                <span className="h-2 w-2 rounded-full bg-gray-300 mr-2" />
                Offline
              </span>
        }
          </div>
          {row.loginTime !== '-' &&
      <div className="text-xs text-gray-500">
              Login: {row.loginTime} · {row.duration}
            </div>
      }
        </div>

  },
  {
    header: 'Check-in Time',
    accessorKey: 'checkIn' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: AttendanceRow) =>
    <div className="flex items-center gap-2">
          <Badge variant={row.status === 'Present' ? 'success' : 'danger'}>
            {row.status}
          </Badge>
          {row.autoMarked &&
      <span
        className="flex items-center text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
        title="Auto-marked after 20+ min online">
        
              <Zap className="h-3 w-3 mr-0.5" />
              Auto
            </span>
      }
        </div>

  },
  {
    header: 'Method',
    accessorKey: 'method' as const,
    cell: (row: AttendanceRow) =>
    <div className="flex items-center text-sm text-gray-600">
          {row.method === 'QR Code' && <QrCode className="h-3 w-3 mr-1" />}
          {row.method === 'Mobile App' &&
      <Smartphone className="h-3 w-3 mr-1" />
      }
          {row.method}
        </div>

  }];

  const handleSaveAttendance = async () => {
    if (!selectedProgrammeId) {
      toast.error('Select a programme');
      return;
    }
    try {
      for (const row of manualLearners) {
        await attendanceService.markManual({
          enrollmentId: row.enrollmentId,
          sessionDate: manualDate,
          status: row.status,
        });
      }
      toast.success('Attendance saved');
      setShowMarkAttendance(false);
      const res = await attendanceService.list();
      setAttendanceData((res.data ?? []).map(mapAttendanceApi));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const openManualModal = async () => {
    try {
      const res = await learnerService.getAll({ programme: selectedProgrammeId });
      setManualLearners(
        (res.data ?? []).map((l) => ({
          enrollmentId: l.id,
          name: l.name,
          status: 'PRESENT',
        })),
      );
      setShowMarkAttendance(true);
    } catch {
      toast.error('Could not load learners');
    }
  };

  const handleLearnerCheckIn = async () => {
    if (!checkInSessionId || !checkInToken) {
      toast.error('Enter session ID and QR token');
      return;
    }
    const enrollmentId = linkedLearnerId;
    if (!enrollmentId) {
      toast.error('No enrolment linked to your account');
      return;
    }
    try {
      await attendanceService.checkIn(checkInSessionId, checkInToken, enrollmentId);
      toast.success('Checked in successfully');
      setCheckInToken('');
      const res = await attendanceService.list(enrollmentId);
      setAttendanceData((res.data ?? []).map(mapAttendanceApi));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check-in failed');
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance Management
          </h1>
          <p className="text-sm text-gray-500">
            Track and manage learner attendance across all programs
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExportSeta}
            disabled={filteredAttendance.length === 0}>
            Export SETA Report
          </Button>
          <Button
            leftIcon={<QrCode className="h-4 w-4" />}
            onClick={async () => {
              if (!selectedProgrammeId) {
                toast.error('Select a programme first');
                return;
              }
              try {
                const res = await attendanceService.openSession(
                  selectedProgrammeId,
                  30,
                );
                setQrPayload(res.data);
                setShowQrModal(true);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Could not open session',
                );
              }
            }}>
            
            Generate QR Code
          </Button>
        </div>
      </div>

      {/* Learner QR check-in */}
      {isLearner && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-gray-900 mb-3">QR check-in</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Session ID"
              value={checkInSessionId}
              onChange={(e) => setCheckInSessionId(e.target.value)}
              placeholder="From facilitator QR screen"
            />
            <Input
              label="QR token"
              value={checkInToken}
              onChange={(e) => setCheckInToken(e.target.value)}
              placeholder="Scan or paste token"
            />
            <div className="flex items-end">
              <Button className="w-full" onClick={() => void handleLearnerCheckIn()}>
                Check in
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Attendance is recorded via QR check-in or manual register only */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-64">
          <Select
            label="Learnership Program"
            value={selectedProgrammeId}
            onChange={(e) => setSelectedProgrammeId(e.target.value)}
            options={[
            {
              value: '',
              label: 'Select programme'
            },
            ...programmes.map((p) => ({
              value: p.id,
              label: p.title,
            })),
            ]}
            />
          
        </div>
        <div className="w-full sm:w-64">
          <Select
            label="Date Range"
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            options={[
            {
              value: 'week',
              label: 'This Week'
            },
            {
              value: 'month',
              label: 'This Month'
            },
            {
              value: 'all',
              label: 'All time'
            }]
            } />
          
        </div>
        <div className="w-full sm:w-64">
          <Select
            label="Attendance Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
            {
              value: 'all',
              label: 'All Status'
            },
            {
              value: 'absent',
              label: 'Absent'
            }]
            } />
          
        </div>
        <Button
          variant="secondary"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() =>
            toast.success(`Showing ${filteredAttendance.length} matching records`)
          }>
          
          Apply Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) =>
        <StatCard key={i} {...stat} delay={i * 0.1} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Daily Attendance Register"
            action={
            <div className="flex space-x-2">
                <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProgrammeId('')}>
                
                  View All
                </Button>
                <Button size="sm" onClick={() => void openManualModal()}>
                  Mark Attendance
                </Button>
              </div>
            }
            noPadding>
            
            {loading ?
            <div className="p-8 text-center text-sm text-gray-500">
                Loading attendance…
              </div> :

            <DataTable data={filteredAttendance} columns={columns} keyField="id" />
            }
            <div className="p-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {loading
                  ? '…'
                  : `${filteredAttendance.length} record${filteredAttendance.length === 1 ? '' : 's'} shown`}
              </span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Attendance summary">
            <p className="text-sm text-gray-600">
              {attendanceData.length === 0
                ? 'No attendance records yet for the selected programme.'
                : `${attendanceData.filter((r) => r.status === 'Present').length} present of ${attendanceData.length} register entries loaded.`}
            </p>
          </Card>

          <Card title="Register status">
            <p className="text-sm text-gray-600">
              {attendanceData.length === 0
                ? 'Open a programme register to view compliance readiness.'
                : `${Math.round((attendanceData.filter((r) => r.status === 'Present').length / attendanceData.length) * 100)}% present in loaded records.`}
            </p>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showMarkAttendance}
        onClose={() => setShowMarkAttendance(false)}
        title="Mark Attendance">
        
        <div className="space-y-4">
          <Input
            label="Session date"
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
          />
          <Select
            label="Programme"
            value={selectedProgrammeId}
            onChange={(e) => setSelectedProgrammeId(e.target.value)}
            options={[
              { value: '', label: 'Select programme' },
              ...programmes.map((p) => ({ value: p.id, label: p.title })),
            ]}
          />
          <div className="text-sm font-medium text-gray-700 mb-2">Learners</div>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
            {manualLearners.map((row, i) => (
              <div
                key={row.enrollmentId}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <span className="text-sm text-gray-900">{row.name}</span>
                <Select
                  value={row.status}
                  onChange={(e) => {
                    const next = [...manualLearners];
                    next[i] = { ...row, status: e.target.value };
                    setManualLearners(next);
                  }}
                  options={[
                    { value: 'PRESENT', label: 'Present' },
                    { value: 'ABSENT', label: 'Absent' },
                    { value: 'LATE', label: 'Late' },
                    { value: 'EXCUSED', label: 'Excused' },
                  ]}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowMarkAttendance(false)}>
              
              Cancel
            </Button>
            <Button onClick={handleSaveAttendance}>Save Register</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Attendance QR session">
        {qrPayload && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600">
              Learners scan or enter this token before{' '}
              {new Date(qrPayload.expiresAt).toLocaleTimeString()}.
            </p>
            <div className="p-4 bg-gray-100 rounded-lg font-mono text-xs break-all">
              {qrPayload.qrToken}
            </div>
            <p className="text-xs text-gray-500">Session ID: {qrPayload.sessionId}</p>
          </div>
        )}
      </Modal>
    </div>);

}