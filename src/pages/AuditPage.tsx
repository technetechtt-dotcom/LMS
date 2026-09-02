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
import { auditService } from '../services/api';
type AuditLearnerRecord = {
  id: number;
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
  const [activeTab, setActiveTab] = useState('learners');
  const [auditRows, setAuditRows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [timeLeft, setTimeLeft] = useState(14385); // ~4 hours in seconds

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
  // Mock Data
  const learnerRecords = [
  {
    id: 1,
    name: 'Thabo Mbeki',
    idNo: '9501015890089',
    status: 'Verified',
    poeStatus: 'Complete'
  },
  {
    id: 2,
    name: 'Lerato Kganyago',
    idNo: '9605120000000',
    status: 'Verified',
    poeStatus: 'In Progress'
  },
  {
    id: 3,
    name: 'Sipho Nkosi',
    idNo: '9402025000000',
    status: 'Pending',
    poeStatus: 'Incomplete'
  }];

  const attendanceRecords = [
  {
    id: 1,
    date: '2023-05-15',
    session: 'Module 3: Advanced CSS',
    facilitator: 'Sarah Khumalo',
    present: 12,
    absent: 3,
    signed: true
  },
  {
    id: 2,
    date: '2023-05-12',
    session: 'Module 3: Flexbox',
    facilitator: 'Sarah Khumalo',
    present: 14,
    absent: 1,
    signed: true
  },
  {
    id: 3,
    date: '2023-05-10',
    session: 'Module 3: Responsive',
    facilitator: 'Sarah Khumalo',
    present: 15,
    absent: 0,
    signed: false
  }];

  const assessmentRecords = [
  {
    id: 1,
    learner: 'Thabo Mbeki',
    assessment: 'Module 1',
    assessor: 'Jane Smith',
    score: '85%',
    moderation: 'Completed',
    moderator: 'Mike Jones'
  },
  {
    id: 2,
    learner: 'Lerato Kganyago',
    assessment: 'Module 1',
    assessor: 'Jane Smith',
    score: '72%',
    moderation: 'Pending',
    moderator: '-'
  }];

  const facilitatorRecords = [
  {
    id: 1,
    name: 'Sarah Khumalo',
    qual: 'BSc Computer Science',
    regNo: 'FAC-2023-001',
    expiry: '2024-12-31',
    status: 'Valid'
  },
  {
    id: 2,
    name: 'Jane Smith',
    qual: 'Dip. IT',
    regNo: 'ASS-2023-045',
    expiry: '2023-11-30',
    status: 'Expiring Soon'
  }];

  // Columns
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
    cell: () =>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toast.info('Opening POE viewer...')}>
      
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
            <select className="block w-full pl-0 pr-10 py-2 text-base border-none focus:ring-0 font-bold text-gray-900 bg-transparent cursor-pointer hover:bg-gray-50 rounded">
              <option>
                National Certificate: Systems Development (NQF 5) - Cohort
                2023-A
              </option>
              <option>
                FET Certificate: Project Management (NQF 4) - Cohort 2023-B
              </option>
            </select>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => toast.success('Downloading Batch POE...')}>
            
            Download Batch POE
          </Button>
        </div>

        {/* Audit Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Enrolled Learners</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">45</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-3xl font-bold text-brand-blue mt-1">68%</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500">Compliance Score</p>
              <p className="text-3xl font-bold text-green-600 mt-1">92%</p>
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
                    Total Assessed: <strong>42</strong>
                  </span>
                  <span>
                    Competent Rate: <strong>88%</strong>
                  </span>
                  <span>
                    Moderation Complete: <strong>65%</strong>
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
              placeholder="Enter audit findings, non-compliance issues, or general comments here..." />
            
            <div className="flex justify-end">
              <Button
                onClick={() => toast.success('Finding saved successfully')}>
                
                Save Finding
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>);

}