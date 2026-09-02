import React, { useEffect, useState } from 'react';
import {
  Shield,
  Clock,
  Download,
  CheckCircle,
  XCircle } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import {
  assessmentService,
  attendanceService,
  auditService,
  learnerService,
  programmeService,
  userService,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
type AuditLearnerRecord = {
  id: string;
  name: string;
  idNo: string;
  status: string;
  poeStatus: string;
};
type AuditAttendanceRecord = {
  id: number;
  date: string;
  session: string;
  facilitator: string;
  present: number;
  absent: number;
  signed: boolean;
};
type AuditAssessmentRecord = {
  id: number;
  learner: string;
  assessment: string;
  assessor: string;
  score: string;
  moderation: string;
  moderator: string;
};
type AuditFacilitatorRecord = {
  id: number;
  name: string;
  qual: string;
  regNo: string;
  expiry: string;
  status: string;
};

export function AuditPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('learners');
  const [auditRows, setAuditRows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [timeLeft, setTimeLeft] = useState(14385); // ~4 hours in seconds
  const [findingNotes, setFindingNotes] = useState('');
  const [learnerRecords, setLearnerRecords] = useState<AuditLearnerRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AuditAttendanceRecord[]>([]);
  const [assessmentRecords, setAssessmentRecords] = useState<AuditAssessmentRecord[]>([]);
  const [facilitatorRecords, setFacilitatorRecords] = useState<AuditFacilitatorRecord[]>([]);
  const [programmes, setProgrammes] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');

  useEffect(() => {
    programmeService
      .getAll()
      .then((res) => {
        const list = (res.data ?? []).map((p) => ({ id: p.id, title: p.title }));
        setProgrammes(list);
        if (list.length > 0) setSelectedProgrammeId(list[0].id);
      })
      .catch(() => toast.error('Could not load programmes'));
  }, []);

  useEffect(() => {
    attendanceService
      .list()
      .then((res) => {
        const grouped = new Map<
          string,
          { date: string; session: string; facilitator: string; present: number; absent: number; signed: boolean }
        >();
        for (const raw of res.data ?? []) {
          const r = raw as {
            sessionDate: string;
            status: string;
            enrollment?: {
              programme?: { title: string; id: string };
            };
          };
          const programmeId = r.enrollment?.programme?.id ?? '';
          if (selectedProgrammeId && programmeId !== selectedProgrammeId) continue;
          const date = r.sessionDate.slice(0, 10);
          const session = r.enrollment?.programme?.title ?? 'Training session';
          const key = `${date}|${session}`;
          const row = grouped.get(key) ?? {
            date,
            session,
            facilitator: '—',
            present: 0,
            absent: 0,
            signed: true,
          };
          if (r.status === 'PRESENT' || r.status === 'LATE') row.present += 1;
          else row.absent += 1;
          grouped.set(key, row);
        }
        setAttendanceRecords(
          Array.from(grouped.values()).map((row, i) => ({
            id: i + 1,
            ...row,
          })),
        );
      })
      .catch(() => toast.error('Could not load attendance records'));
  }, [selectedProgrammeId]);

  useEffect(() => {
    assessmentService
      .listInstances()
      .then((res) => {
        setAssessmentRecords(
          (res.data ?? []).map((inst, i) => ({
            id: i + 1,
            learner: inst.learnerName,
            assessment: inst.assessmentTitle,
            assessor: inst.gradedBy ?? '—',
            score:
              inst.percentage != null
                ? `${Math.round(inst.percentage)}%`
                : inst.score != null
                  ? String(inst.score)
                  : '—',
            moderation: inst.moderationRecord
                ? 'Completed'
                : inst.status === 'moderation'
                  ? 'Pending'
                  : inst.status === 'completed'
                    ? 'Graded'
                    : 'In progress',
            moderator: inst.moderationRecord?.moderatorName ?? '—',
          })),
        );
      })
      .catch(() => toast.error('Could not load assessment records'));
  }, []);

  useEffect(() => {
    userService
      .getAll()
      .then((res) => {
        const staff = (res.data ?? []).filter((u) =>
          u.memberships.some((m) =>
            ['FACILITATOR', 'ASSESSOR', 'MODERATOR'].includes(m.role.code),
          ),
        );
        setFacilitatorRecords(
          staff.map((u, i) => {
            const role = u.memberships[0]?.role.name ?? 'Staff';
            const expiry = u.lastLoginAt
              ? new Date(u.lastLoginAt).toISOString().slice(0, 10)
              : '—';
            return {
              id: i + 1,
              name: `${u.firstName} ${u.lastName}`.trim(),
              qual: role,
              regNo: u.id.slice(0, 8).toUpperCase(),
              expiry,
              status: u.isActive ? 'Valid' : 'Inactive',
            };
          }),
        );
      })
      .catch(() => toast.error('Could not load facilitator records'));
  }, []);

  useEffect(() => {
    learnerService
      .getAll()
      .then((res) => {
        const rows = (res.data ?? []).filter(
          (l) => !selectedProgrammeId || l.programmeId === selectedProgrammeId,
        );
        setLearnerRecords(
          rows.map((l) => ({
            id: l.id,
            name: l.name,
            idNo: l.idNumber,
            status: l.status === 'active' ? 'Verified' : 'Pending',
            poeStatus:
              l.progress >= 80
                ? 'Complete'
                : l.progress >= 40
                  ? 'In Progress'
                  : 'Incomplete',
          })),
        );
      })
      .catch(() => toast.error('Could not load learner audit records'));
  }, [selectedProgrammeId]);

  useEffect(() => {
    auditService
      .list(200)
      .then((rows) => setAuditRows(rows as Array<Record<string, unknown>>))
      .catch(() => toast.error('Could not load audit log'));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const enrolledCount = learnerRecords.length;
  const completionRate =
    enrolledCount > 0
      ? Math.round(
          (learnerRecords.filter((l) => l.poeStatus === 'Complete').length /
            enrolledCount) *
            100,
        )
      : 0;
  const complianceScore =
    assessmentRecords.length > 0
      ? Math.round(
          (assessmentRecords.filter((a) => a.moderation === 'Completed').length /
            assessmentRecords.length) *
            100,
        )
      : 0;
  const assessedCount = assessmentRecords.filter((a) => a.score !== '—').length;
  const competentRate =
    assessedCount > 0
      ? Math.round(
          (assessmentRecords.filter((a) => {
            const pct = parseInt(a.score, 10);
            return !Number.isNaN(pct) && pct >= 50;
          }).length /
            assessedCount) *
            100,
        )
      : 0;
  const moderationComplete =
    assessmentRecords.length > 0
      ? Math.round(
          (assessmentRecords.filter((a) => a.moderation === 'Completed').length /
            assessmentRecords.length) *
            100,
        )
      : 0;

  const learnerColumns = [
  {
    header: 'Learner Name',
    accessorKey: 'name' as const
  },
  {
    header: 'ID Number',
    accessorKey: 'idNo' as const
  },
  {
    header: 'ID Verification',
    accessorKey: 'status' as const,
    cell: (row: AuditLearnerRecord) =>
    <Badge variant={row.status === 'Verified' ? 'success' : 'warning'}>
          {row.status}
        </Badge>

  },
  {
    header: 'POE Status',
    accessorKey: 'poeStatus' as const,
    cell: (row: AuditLearnerRecord) =>
    <Badge variant={row.poeStatus === 'Complete' ? 'success' : 'warning'}>
          {row.poeStatus}
        </Badge>

  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: (row: AuditLearnerRecord) =>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(`/learner/${row.id}`)}>
      
          View POE
        </Button>

  }];

  const attendanceColumns = [
  {
    header: 'Date',
    accessorKey: 'date' as const
  },
  {
    header: 'Session',
    accessorKey: 'session' as const
  },
  {
    header: 'Facilitator',
    accessorKey: 'facilitator' as const
  },
  {
    header: 'Present',
    accessorKey: 'present' as const
  },
  {
    header: 'Absent',
    accessorKey: 'absent' as const
  },
  {
    header: 'Signed',
    accessorKey: 'signed' as const,
    cell: (row: AuditAttendanceRecord) =>
    row.signed ?
    <CheckCircle className="h-4 w-4 text-green-500" /> :

    <XCircle className="h-4 w-4 text-red-500" />

  }];

  const assessmentColumns = [
  {
    header: 'Learner',
    accessorKey: 'learner' as const
  },
  {
    header: 'Assessment',
    accessorKey: 'assessment' as const
  },
  {
    header: 'Assessor',
    accessorKey: 'assessor' as const
  },
  {
    header: 'Score',
    accessorKey: 'score' as const
  },
  {
    header: 'Moderation',
    accessorKey: 'moderation' as const,
    cell: (row: AuditAssessmentRecord) =>
    <Badge variant={row.moderation === 'Completed' ? 'success' : 'warning'}>
          {row.moderation}
        </Badge>

  },
  {
    header: 'Moderator',
    accessorKey: 'moderator' as const
  }];

  const facilitatorColumns = [
  {
    header: 'Name',
    accessorKey: 'name' as const
  },
  {
    header: 'Qualification',
    accessorKey: 'qual' as const
  },
  {
    header: 'Reg No.',
    accessorKey: 'regNo' as const
  },
  {
    header: 'Expiry',
    accessorKey: 'expiry' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: AuditFacilitatorRecord) =>
    <Badge
      variant={
      row.status === 'Valid' ?
      'success' :
      row.status === 'Expiring Soon' ?
      'warning' :
      'danger'
      }>
      
          {row.status}
        </Badge>

  }];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Audit Header Banner */}
      <div className="bg-brand-navy text-white px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-brand-teal" />
            <div>
              <h1 className="text-xl font-bold">External Audit Mode</h1>
              <p className="text-xs text-blue-200">
                Restricted Read-Only Access for SETA/QCTO Officials
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 bg-blue-900/50 px-4 py-2 rounded-lg border border-blue-800">
            <Clock className="h-5 w-5 text-brand-teal" />
            <div className="text-right">
              <p className="text-xs text-blue-200">Session Expires In</p>
              <p className="font-mono font-bold">{formatTime(timeLeft)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Programme Context */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Selected Programme for Audit
            </label>
            <select
              className="block w-full pl-0 pr-10 py-2 text-base border-none focus:ring-0 font-bold text-gray-900 bg-transparent cursor-pointer hover:bg-gray-50 rounded"
              value={selectedProgrammeId}
              onChange={(e) => setSelectedProgrammeId(e.target.value)}>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            disabled
            title="Batch POE export requires learner selection from the directory">
            
            Download Batch POE
          </Button>
        </div>

        {/* Audit Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Enrolled Learners</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{enrolledCount}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-3xl font-bold text-brand-blue mt-1">{completionRate}%</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Compliance Score</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{complianceScore}%</p>
            </div>
          </Card>
        </div>

        {/* Main Data View */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
          <div className="px-6 pt-6">
            <Tabs
              tabs={[
              {
                id: 'learners',
                label: 'Learner Records'
              },
              {
                id: 'attendance',
                label: 'Attendance Registers'
              },
              {
                id: 'assessments',
                label: 'Assessment & Moderation'
              },
              {
                id: 'facilitators',
                label: 'Facilitator Qualifications'
              }]
              }
              activeTab={activeTab}
              onChange={setActiveTab} />
            
          </div>

          <div className="p-6">
            {activeTab === 'learners' &&
            <DataTable
              data={learnerRecords}
              columns={learnerColumns}
              keyField="id" />

            }
            {activeTab === 'attendance' &&
            <DataTable
              data={attendanceRecords}
              columns={attendanceColumns}
              keyField="id" />

            }
            {activeTab === 'assessments' &&
            <div className="space-y-4">
                <div className="flex space-x-4 text-sm text-gray-500 mb-2">
                  <span>
                    Total Assessed: <strong>{assessedCount}</strong>
                  </span>
                  <span>
                    Competent Rate: <strong>{competentRate}%</strong>
                  </span>
                  <span>
                    Moderation Complete: <strong>{moderationComplete}%</strong>
                  </span>
                </div>
                <DataTable
                data={assessmentRecords}
                columns={assessmentColumns}
                keyField="id" />
              
              </div>
            }
            {activeTab === 'facilitators' &&
            <DataTable
              data={facilitatorRecords}
              columns={facilitatorColumns}
              keyField="id" />

            }
          </div>
        </div>

        {/* Auditor Notes */}
        <Card title="Auditor Notes & Findings">
          <div className="space-y-4">
            <textarea
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-navy focus:border-brand-navy"
              rows={4}
              placeholder="Enter audit findings, non-compliance issues, or general comments here..."
              value={findingNotes}
              onChange={(e) => setFindingNotes(e.target.value)} />
            
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  if (!findingNotes.trim()) {
                    toast.error('Enter findings before saving');
                    return;
                  }
                  await auditService.log(
                    'AUDIT_FINDING',
                    'audit_session',
                    'current',
                    findingNotes.trim(),
                  );
                  toast.success('Finding saved successfully');
                  setFindingNotes('');
                }}>
                
                Save Finding
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>);

}