import React, { useEffect, useMemo, useState } from 'react';
import { Download, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import {
  assessmentService,
  attendanceService,
  auditService,
  learnerService,
  programmeService,
  directoryService,
} from '../services/api';
import { downloadJson } from '../utils/downloadJson';

type LearnerRow = {
  id: string;
  name: string;
  idNumber: string;
  enrollmentStatus: string;
  recordedProgress: string;
};

type AttendanceRow = {
  id: string;
  date: string;
  session: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
};

type AssessmentRow = {
  id: string;
  learner: string;
  assessment: string;
  assessor: string;
  recordedResult: string;
  moderation: string;
  moderator: string;
};

type StaffRow = {
  id: string;
  name: string;
  roles: string;
  lastSignIn: string;
  accountStatus: string;
};

export function AuditPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('learners');
  const [findingNotes, setFindingNotes] = useState('');
  const [auditEventCount, setAuditEventCount] = useState(0);
  const [programmes, setProgrammes] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    void Promise.all([
      programmeService.getAll(),
      directoryService.staff({ roles: ['FACILITATOR', 'ASSESSOR', 'MODERATOR'], pageSize: 50 }),
      auditService.list(200),
    ])
      .then(([programmeResponse, userResponse, auditEvents]) => {
        const available = (programmeResponse.data ?? []).map((programme) => ({
          id: programme.id,
          title: programme.title,
        }));
        setProgrammes(available);
        setSelectedProgrammeId((current) => current || available[0]?.id || '');
        setStaff(
          (userResponse.data?.items ?? [])
            .map((account) => ({
              id: account.id,
              name: account.name,
              roles: account.role,
              lastSignIn: 'Restricted',
              accountStatus: account.status,
            })),
        );
        setAuditEventCount(auditEvents.length);
      })
      .catch(() => toast.error('Could not load the audit workspace'));
  }, []);

  useEffect(() => {
    void Promise.all([
      learnerService.getAll({
        programme: selectedProgrammeId || undefined,
      }),
      attendanceService.list(),
      assessmentService.listInstances(),
    ])
      .then(([learnerResponse, attendanceResponse, assessmentResponse]) => {
        setLearners(
          (learnerResponse.data ?? []).map((learner) => ({
            id: learner.id,
            name: learner.name,
            idNumber: learner.idNumber || 'Not recorded',
            enrollmentStatus: learner.status,
            recordedProgress: `${learner.progress}%`,
          })),
        );

        const grouped = new Map<string, AttendanceRow>();
        for (const raw of attendanceResponse.data ?? []) {
          const record = raw as {
            sessionDate: string;
            status: string;
            enrollment?: { programme?: { id?: string; title?: string } };
          };
          if (
            selectedProgrammeId &&
            record.enrollment?.programme?.id !== selectedProgrammeId
          ) continue;
          const date = record.sessionDate.slice(0, 10);
          const session = record.enrollment?.programme?.title || 'Training session';
          const key = `${date}|${session}`;
          const row = grouped.get(key) ?? {
            id: key,
            date,
            session,
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
          };
          if (record.status === 'PRESENT') row.present += 1;
          if (record.status === 'LATE') row.late += 1;
          if (record.status === 'ABSENT') row.absent += 1;
          if (record.status === 'EXCUSED') row.excused += 1;
          grouped.set(key, row);
        }
        setAttendance([...grouped.values()]);

        setAssessments(
          (assessmentResponse.data ?? []).map((instance) => ({
            id: instance.id,
            learner: instance.learnerName,
            assessment: instance.assessmentTitle,
            assessor: instance.gradedBy || 'Not recorded',
            recordedResult:
              instance.percentage != null
                ? `${Math.round(instance.percentage)}%`
                : instance.score != null
                  ? String(instance.score)
                  : 'Not recorded',
            moderation: instance.moderationRecord
              ? 'Recorded'
              : instance.status === 'moderation'
                ? 'Pending'
                : 'Not recorded',
            moderator: instance.moderationRecord?.moderatorName || 'Not recorded',
          })),
        );
      })
      .catch(() => toast.error('Could not load programme evidence'));
  }, [selectedProgrammeId]);

  const completedEnrollments = useMemo(
    () => learners.filter((learner) => learner.enrollmentStatus.toLowerCase() === 'completed').length,
    [learners],
  );

  const learnerColumns = [
    { header: 'Learner Name', accessorKey: 'name' as const },
    { header: 'ID Number', accessorKey: 'idNumber' as const },
    {
      header: 'Enrollment Status',
      accessorKey: 'enrollmentStatus' as const,
      cell: (row: LearnerRow) => (
        <Badge variant={row.enrollmentStatus.toLowerCase() === 'completed' ? 'success' : 'info'}>
          {row.enrollmentStatus}
        </Badge>
      ),
    },
    { header: 'Recorded Progress', accessorKey: 'recordedProgress' as const },
    {
      header: 'Actions',
      accessorKey: 'id' as const,
      cell: (row: LearnerRow) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/learner/${row.id}`)}>
          View PoE
        </Button>
      ),
    },
  ];

  const attendanceColumns = [
    { header: 'Date', accessorKey: 'date' as const },
    { header: 'Session', accessorKey: 'session' as const },
    { header: 'Present', accessorKey: 'present' as const },
    { header: 'Late', accessorKey: 'late' as const },
    { header: 'Absent', accessorKey: 'absent' as const },
    { header: 'Excused', accessorKey: 'excused' as const },
  ];

  const assessmentColumns = [
    { header: 'Learner', accessorKey: 'learner' as const },
    { header: 'Assessment', accessorKey: 'assessment' as const },
    { header: 'Assessor', accessorKey: 'assessor' as const },
    { header: 'Recorded Result', accessorKey: 'recordedResult' as const },
    { header: 'Moderation Record', accessorKey: 'moderation' as const },
    { header: 'Moderator', accessorKey: 'moderator' as const },
  ];

  const staffColumns = [
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'System Roles', accessorKey: 'roles' as const },
    { header: 'Last Sign In', accessorKey: 'lastSignIn' as const },
    { header: 'Account Status', accessorKey: 'accountStatus' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-navy px-6 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center space-x-3">
          <Shield className="h-8 w-8 text-brand-teal" />
          <div>
            <h1 className="text-xl font-bold">Audit Evidence Workspace</h1>
            <p className="text-xs text-blue-200">
              Internal operational records; not a SETA/QCTO certification
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label htmlFor="audit-programme" className="block text-xs font-medium uppercase tracking-wider text-gray-500">
              Programme evidence scope
            </label>
            <select
              id="audit-programme"
              className="mt-1 rounded border-gray-300 font-medium"
              value={selectedProgrammeId}
              onChange={(event) => setSelectedProgrammeId(event.target.value)}
            >
              <option value="">All available programmes</option>
              {programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>{programme.title}</option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => {
              downloadJson(`operational-evidence-${selectedProgrammeId || 'all'}.json`, {
                exportedAt: new Date().toISOString(),
                programmeId: selectedProgrammeId || null,
                learners,
                attendance,
                assessments,
              });
              toast.success('Operational evidence index downloaded');
            }}
          >
            Download Evidence Index
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card><div className="text-center"><p className="text-sm text-gray-500">Enrollment Records</p><p className="mt-1 text-3xl font-bold">{learners.length}</p></div></Card>
          <Card><div className="text-center"><p className="text-sm text-gray-500">Completed Enrollments</p><p className="mt-1 text-3xl font-bold text-brand-blue">{completedEnrollments}</p></div></Card>
          <Card><div className="text-center"><p className="text-sm text-gray-500">Audit Events Loaded</p><p className="mt-1 text-3xl font-bold text-green-600">{auditEventCount}</p></div></Card>
        </div>

        <div className="min-h-[500px] rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="px-6 pt-6">
            <Tabs
              tabs={[
                { id: 'learners', label: 'Learner Records' },
                { id: 'attendance', label: 'Attendance Records' },
                { id: 'assessments', label: 'Assessment & Moderation' },
                { id: 'staff', label: 'Staff Accounts' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
          <div className="p-6">
            {activeTab === 'learners' && <DataTable data={learners} columns={learnerColumns} keyField="id" />}
            {activeTab === 'attendance' && <DataTable data={attendance} columns={attendanceColumns} keyField="id" />}
            {activeTab === 'assessments' && <DataTable data={assessments} columns={assessmentColumns} keyField="id" />}
            {activeTab === 'staff' && <DataTable data={staff} columns={staffColumns} keyField="id" />}
          </div>
        </div>

        <Card title="Auditor Notes & Findings">
          <div className="space-y-4">
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-navy focus:ring-brand-navy"
              rows={4}
              placeholder="Enter an evidence-based finding or comment"
              value={findingNotes}
              onChange={(event) => setFindingNotes(event.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  if (!findingNotes.trim()) return toast.error('Enter findings before saving');
                  await auditService.log('AUDIT_FINDING', 'audit_session', selectedProgrammeId || 'all', findingNotes.trim());
                  setFindingNotes('');
                  setAuditEventCount((count) => count + 1);
                  toast.success('Finding persisted in the audit trail');
                }}
              >
                Save Finding
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
