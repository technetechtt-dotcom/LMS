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
  Zap } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/dashboard/StatCard';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { attendanceService } from '../services/api';

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
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleSaveAttendance = () => {
    toast.success('Attendance saved successfully');
    setShowMarkAttendance(false);
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
            onClick={() => toast.success('Exporting attendance report...')}>
            
            Export SETA Report
          </Button>
          <Button
            leftIcon={<QrCode className="h-4 w-4" />}
            onClick={() =>
            toast.success(
              'QR Code generated! Display on screen for learners to scan.'
            )
            }>
            
            Generate QR Code
          </Button>
        </div>
      </div>

      {/* Auto-Present Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center">
        <Zap className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          <span className="font-medium">Auto-Attendance:</span> Learners online
          for 20+ minutes are automatically marked as Present.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-64">
          <Select
            label="Learnership Program"
            options={[
            {
              value: 'all',
              label: 'All Programs'
            },
            {
              value: 'it',
              label: 'IT Skills Program'
            }]
            } />
          
        </div>
        <div className="w-full sm:w-64">
          <Select
            label="Date Range"
            options={[
            {
              value: 'week',
              label: 'This Week'
            },
            {
              value: 'month',
              label: 'This Month'
            }]
            } />
          
        </div>
        <div className="w-full sm:w-64">
          <Select
            label="Attendance Status"
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
          onClick={() => toast.info('Filters applied')}>
          
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
                onClick={() => toast.info('Showing all records...')}>
                
                  View All
                </Button>
                <Button size="sm" onClick={() => setShowMarkAttendance(true)}>
                  Mark Attendance
                </Button>
              </div>
            }
            noPadding>
            
            {loading ?
            <div className="p-8 text-center text-sm text-gray-500">
                Loading attendance…
              </div> :

            <DataTable data={attendanceData} columns={columns} keyField="id" />
            }
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {loading ?
                '…' :

                `${attendanceData.length} record${attendanceData.length === 1 ? '' : 's'}`
                }
              </span>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm">
                  Previous
                </Button>
                <Button size="sm" className="bg-brand-navy text-white">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="AI Attendance Insights"
            className="border-l-4 border-l-brand-teal">
            
            <div className="absolute top-4 right-4">
              <Badge variant="info" className="bg-brand-navy text-white">
                AI
              </Badge>
            </div>
            <div className="space-y-4 mt-2">
              <div className="bg-red-50 p-3 rounded-md border border-red-100">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900">
                      Chronic Absenteeism Alert
                    </h4>
                    <p className="text-xs text-red-700 mt-1">
                      3 learners have missed &gt;20% of classes this month
                    </p>
                    <button
                      className="text-xs font-medium text-red-800 underline mt-2"
                      onClick={() =>
                      toast.info('Opening absenteeism details...')
                      }>
                      
                      View Details
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                <div className="flex items-start">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">
                      Attendance Pattern
                    </h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Monday mornings show 15% lower attendance rates
                    </p>
                    <button
                      className="text-xs font-medium text-blue-800 underline mt-2"
                      onClick={() =>
                      toast.info('Opening attendance analysis...')
                      }>
                      
                      View Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="SETA Compliance Status">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Register Completeness
              </span>
              <span className="text-sm font-bold text-green-600">98%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: '98%'
                }}>
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              Ready for monthly submission
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showMarkAttendance}
        onClose={() => setShowMarkAttendance(false)}
        title="Mark Attendance">
        
        <div className="space-y-4">
          <Select
            label="Programme"
            options={[
            {
              value: 'it',
              label: 'IT Skills Program'
            },
            {
              value: 'business',
              label: 'Business Administration'
            }]
            } />
          
          <div className="text-sm font-medium text-gray-700 mb-2">Learners</div>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
            {[
            'Thandi Mokoena',
            'Sipho Ndlovu',
            'Nomsa Dlamini',
            'David van der Merwe'].
            map((name, i) =>
            <div
              key={i}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              
                <span className="text-sm text-gray-900">{name}</span>
                <div className="flex gap-3">
                  <label className="flex items-center text-xs font-medium">
                    <input
                    type="radio"
                    name={`att-${i}`}
                    className="mr-1"
                    defaultChecked />
                  {' '}
                    P
                  </label>
                  <label className="flex items-center text-xs font-medium">
                    <input type="radio" name={`att-${i}`} className="mr-1" /> A
                  </label>
                </div>
              </div>
            )}
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
    </div>);

}