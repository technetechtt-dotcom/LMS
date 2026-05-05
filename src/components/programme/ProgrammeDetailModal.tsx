import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { DataTable } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Download, Calendar, UserCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ProgrammeDetailLite {
  name: string;
  saqaId: string;
  nqf: number;
  credits: number;
  type: string;
}

interface UnitStandardTableRow {
  status: string;
}

interface LearnerTableRow {
  progress: number;
  status: string;
}

interface HistoryTableRow {
  action: string;
}

interface ProgrammeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  programme: ProgrammeDetailLite | null;
}
export function ProgrammeDetailModal({
  isOpen,
  onClose,
  programme
}: ProgrammeDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [assignedAssessor, setAssignedAssessor] = useState('sarah-k');
  const [assignedModerator, setAssignedModerator] = useState('');
  if (!programme) return null;
  // Mock Data
  const unitStandards = [
  {
    id: '115378',
    title:
    'Demonstrate an understanding of the principles of the internet and the world-wide web',
    level: 5,
    credits: 12,
    type: 'Core',
    status: 'Active'
  },
  {
    id: '115362',
    title: 'Manage software development source files using version control',
    level: 5,
    credits: 8,
    type: 'Core',
    status: 'Active'
  },
  {
    id: '114050',
    title: 'Explain the principles of computer networks',
    level: 5,
    credits: 10,
    type: 'Elective',
    status: 'Active'
  },
  {
    id: '115388',
    title: 'Apply principles of computer programming',
    level: 5,
    credits: 20,
    type: 'Core',
    status: 'Active'
  }];

  const learners = [
  {
    id: 1,
    name: 'Thabo Mbeki',
    idNo: '9501015890089',
    progress: 68,
    status: 'Active'
  },
  {
    id: 2,
    name: 'Lerato Kganyago',
    idNo: '9605120000000',
    progress: 45,
    status: 'Active'
  },
  {
    id: 3,
    name: 'Sipho Nkosi',
    idNo: '9402025000000',
    progress: 12,
    status: 'At Risk'
  }];

  const assessorOptions = [
  {
    value: '',
    label: 'Select Assessor...'
  },
  {
    value: 'sarah-k',
    label: 'Sarah Khumalo (ETDP SETA Registered)'
  },
  {
    value: 'jane-s',
    label: 'Jane Smith (MICT SETA Registered)'
  },
  {
    value: 'peter-m',
    label: 'Peter Molefe (ETDP SETA Registered)'
  },
  {
    value: 'nomsa-d',
    label: 'Nomsa Dlamini (MICT SETA Registered)'
  }];

  const moderatorOptions = [
  {
    value: '',
    label: 'Select Moderator...'
  },
  {
    value: 'david-n',
    label: 'David Naidoo (ETDP SETA Registered)'
  },
  {
    value: 'linda-v',
    label: 'Linda van Wyk (MICT SETA Registered)'
  },
  {
    value: 'bongani-z',
    label: 'Bongani Zulu (ETDP SETA Registered)'
  }];

  const assignmentHistory = [
  {
    id: 1,
    role: 'Assessor',
    name: 'Sarah Khumalo',
    date: '15 Jan 2023',
    action: 'Assigned',
    by: 'John Doe'
  },
  {
    id: 2,
    role: 'Moderator',
    name: 'David Naidoo',
    date: '15 Jan 2023',
    action: 'Assigned',
    by: 'John Doe'
  },
  {
    id: 3,
    role: 'Moderator',
    name: 'David Naidoo',
    date: '10 Mar 2023',
    action: 'Removed',
    by: 'John Doe'
  }];

  const handleSaveAssignments = () => {
    const assessorName =
    assessorOptions.
    find((o) => o.value === assignedAssessor)?.
    label?.split(' (')[0] || 'None';
    const moderatorName =
    moderatorOptions.
    find((o) => o.value === assignedModerator)?.
    label?.split(' (')[0] || 'None';
    toast.success(
      `QA assignments updated — Assessor: ${assessorName}, Moderator: ${moderatorName}`
    );
  };
  const usColumns = [
  {
    header: 'US ID',
    accessorKey: 'id' as const
  },
  {
    header: 'Title',
    accessorKey: 'title' as const,
    className: 'w-1/2'
  },
  {
    header: 'Level',
    accessorKey: 'level' as const
  },
  {
    header: 'Credits',
    accessorKey: 'credits' as const
  },
  {
    header: 'Type',
    accessorKey: 'type' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: UnitStandardTableRow) => (
      <Badge variant="success">{row.status}</Badge>
    )
  }];

  const learnerColumns = [
  {
    header: 'Name',
    accessorKey: 'name' as const
  },
  {
    header: 'ID Number',
    accessorKey: 'idNo' as const
  },
  {
    header: 'Progress',
    accessorKey: 'progress' as const,
    cell: (row: LearnerTableRow) => (
      <ProgressBar value={row.progress} size="sm" showValue />
    )

  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: LearnerTableRow) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'danger'}>
        {row.status}
      </Badge>
    )

  }];

  const historyColumns = [
  {
    header: 'Role',
    accessorKey: 'role' as const
  },
  {
    header: 'Name',
    accessorKey: 'name' as const
  },
  {
    header: 'Action',
    accessorKey: 'action' as const,
    cell: (row: HistoryTableRow) => (
      <Badge variant={row.action === 'Assigned' ? 'success' : 'neutral'}>
        {row.action}
      </Badge>
    )

  },
  {
    header: 'Date',
    accessorKey: 'date' as const
  },
  {
    header: 'By',
    accessorKey: 'by' as const
  }];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Programme Details: ${programme.name}`}
      size="xl">
      
      <Tabs
        tabs={[
        {
          id: 'overview',
          label: 'Overview'
        },
        {
          id: 'standards',
          label: 'Unit Standards',
          count: unitStandards.length
        },
        {
          id: 'learners',
          label: 'Enrolled Learners',
          count: learners.length
        },
        {
          id: 'qa',
          label: 'QA Assignment'
        },
        {
          id: 'schedule',
          label: 'Assessment Schedule'
        }]
        }
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6" />
      

      {activeTab === 'overview' &&
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500">SAQA ID</h4>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {programme.saqaId}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">NQF Level</h4>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {programme.nqf}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Credits</h4>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {programme.credits}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Type</h4>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {programme.type}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Description
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              This qualification provides learners with a solid foundation in
              systems development. It covers the principles of programming,
              database design, web development, and software engineering
              practices. Upon completion, learners will be able to design,
              develop, test, and document software solutions.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Accreditation Status
            </h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Accreditation Start Date:</span>
              <span className="font-medium">01 Jan 2020</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-600">Accreditation End Date:</span>
              <span className="font-medium">31 Dec 2025</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-600">Last Verification:</span>
              <span className="font-medium text-green-600">
                15 Mar 2023 (Compliant)
              </span>
            </div>
          </div>
        </div>
      }

      {activeTab === 'standards' &&
      <DataTable data={unitStandards} columns={usColumns} keyField="id" />
      }

      {activeTab === 'learners' &&
      <DataTable data={learners} columns={learnerColumns} keyField="id" />
      }

      {activeTab === 'qa' &&
      <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Assign registered assessors and moderators to this programme.
            Assessors evaluate learner evidence, and moderators verify
            assessment quality and consistency.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assessor Assignment */}
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <UserCheck className="h-5 w-5 text-brand-navy" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Assessor
                  </h4>
                  <p className="text-xs text-gray-500">
                    Evaluates learner evidence &amp; POE
                  </p>
                </div>
              </div>
              {assignedAssessor &&
            <div className="mb-3">
                  <Badge variant="success">Currently Assigned</Badge>
                </div>
            }
              <Select
              label="Assign Assessor"
              options={assessorOptions}
              value={assignedAssessor}
              onChange={(e) => setAssignedAssessor(e.target.value)} />
            
            </div>

            {/* Moderator Assignment */}
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center mr-3">
                  <ShieldCheck className="h-5 w-5 text-brand-teal" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Moderator
                  </h4>
                  <p className="text-xs text-gray-500">
                    Verifies assessment quality &amp; consistency
                  </p>
                </div>
              </div>
              {assignedModerator &&
            <div className="mb-3">
                  <Badge variant="success">Currently Assigned</Badge>
                </div>
            }
              <Select
              label="Assign Moderator"
              options={moderatorOptions}
              value={assignedModerator}
              onChange={(e) => setAssignedModerator(e.target.value)} />
            
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveAssignments}>Save QA Assignments</Button>
          </div>

          {/* Assignment History */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Assignment History
            </h4>
            <DataTable
            data={assignmentHistory}
            columns={historyColumns}
            keyField="id"
            pagination={false} />
          
          </div>
        </div>
      }

      {activeTab === 'schedule' &&
      <div className="space-y-4">
          <div className="flex justify-end">
            <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}>
            
              Export Schedule
            </Button>
          </div>
          <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 py-4">
            {[
          {
            date: '15 Feb 2023',
            title: 'Module 1: Intro to Programming',
            type: 'Formative'
          },
          {
            date: '20 Mar 2023',
            title: 'Module 2: Database Design',
            type: 'Formative'
          },
          {
            date: '15 Apr 2023',
            title: 'Module 3: Web Development',
            type: 'Formative'
          },
          {
            date: '30 May 2023',
            title: 'Mid-Year Summative Assessment',
            type: 'Summative'
          }].
          map((item, idx) =>
          <div key={idx} className="relative pl-8">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white border-2 border-brand-navy" />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {item.type} Assessment
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-brand-blue mt-1 sm:mt-0">
                    <Calendar className="h-4 w-4 mr-1" />
                    {item.date}
                  </div>
                </div>
              </div>
          )}
          </div>
        </div>
      }
    </Modal>);

}