import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  FileCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Briefcase } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/dashboard/StatCard';
export function WorkplaceMentorDashboardPage() {
  const navigate = useNavigate();
  const [showLogbookModal, setShowLogbookModal] = useState(false);
  const [selectedLogbookLearner, setSelectedLogbookLearner] = useState('');
  const stats = [
  {
    title: 'My Learners',
    value: '12',
    icon: <Users className="h-6 w-6" />,
    trend: {
      value: 2,
      label: 'new this month',
      direction: 'up' as const
    }
  },
  {
    title: 'Pending Logbooks',
    value: '5',
    icon: <Clock className="h-6 w-6" />,
    trend: {
      value: 2,
      label: 'due this week',
      direction: 'up' as const
    }
  },
  {
    title: 'Verified Logbooks',
    value: '34',
    icon: <CheckCircle className="h-6 w-6" />,
    trend: {
      value: 8,
      label: 'from last month',
      direction: 'up' as const
    }
  },
  {
    title: 'Workplace Visits',
    value: '2',
    icon: <Briefcase className="h-6 w-6" />,
    trend: {
      value: 0,
      label: 'scheduled',
      direction: 'neutral' as const
    }
  }];

  const logbookQueue = [
  {
    id: 1,
    learner: 'Thandi Mokoena',
    task: 'Database Administration Logbook - Week 4',
    submitted: '2026-04-15',
    status: 'Pending Review'
  },
  {
    id: 2,
    learner: 'Sipho Ndlovu',
    task: 'Network Troubleshooting Logbook - Week 3',
    submitted: '2026-04-14',
    status: 'Pending Review'
  },
  {
    id: 3,
    learner: 'Nomsa Dlamini',
    task: 'Helpdesk Support Logbook - Week 2',
    submitted: '2026-04-10',
    status: 'Verified'
  },
  {
    id: 4,
    learner: 'David van der Merwe',
    task: 'System Maintenance Logbook - Week 4',
    submitted: '2026-04-16',
    status: 'Pending Review'
  }];

  type LogbookQueueRow = (typeof logbookQueue)[number];

  const columns = [
  {
    header: 'Learner',
    accessorKey: 'learner' as const,
    cell: (row: LogbookQueueRow) =>
    <div className="flex items-center">
          <Avatar name={row.learner} className="mr-3" size="sm" />
          <span className="font-medium text-gray-900">{row.learner}</span>
        </div>

  },
  {
    header: 'Logbook Task',
    accessorKey: 'task' as const
  },
  {
    header: 'Submitted',
    accessorKey: 'submitted' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: LogbookQueueRow) =>
    <Badge
      variant={row.status === 'Pending Review' ? 'warning' : 'success'}>
      
          {row.status}
        </Badge>

  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: (row: LogbookQueueRow) =>
    <Button
      size="sm"
      variant={row.status === 'Verified' ? 'outline' : 'primary'}
      onClick={() => {
        setSelectedLogbookLearner(row.learner);
        setShowLogbookModal(true);
      }}>
      
          {row.status === 'Verified' ? 'View' : 'Review'}
        </Button>

  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Workplace Mentor Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Welcome back, David Naidoo ·{' '}
          <span className="text-brand-blue font-medium">
            TechCorp Solutions
          </span>
        </p>
      </div>

      {/* Role Indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center">
        <AlertCircle className="h-5 w-5 text-brand-blue mr-3 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          As a Workplace Mentor, you are responsible for verifying learner
          logbooks and practical experience at your organisation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) =>
        <StatCard key={i} {...stat} delay={i * 0.1} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Logbook Queue */}
          <Card title="Logbook Verification Queue" noPadding>
            <DataTable data={logbookQueue} columns={columns} keyField="id" />
          </Card>
        </div>

        <div>
          <Card title="Upcoming Workplace Visits">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">
                    SETA Monitoring Visit
                  </h4>
                  <Badge variant="info">Next Week</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  MICT SETA official will be visiting to verify workplace
                  facilities and interview learners.
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" /> April 24, 2026 · 10:00 AM
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">
                    Facilitator Check-in
                  </h4>
                  <Badge variant="neutral">In 2 Weeks</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Sarah Johnson (Lead Facilitator) will review practical
                  progress with you.
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" /> May 2, 2026 · 14:00 PM
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* At-Risk Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-red-800">At-Risk Learner</h4>
            <p className="text-xs text-red-700 mt-1">
              David van der Merwe has not logged workplace hours in 2 weeks and
              has an overdue logbook.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => navigate('/learner/l3')}>
              
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Logbook Review Modal */}
      <Modal
        isOpen={showLogbookModal}
        onClose={() => setShowLogbookModal(false)}
        title={`Logbook Review - ${selectedLogbookLearner}`}
        size="lg">
        
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div>
              <h3 className="font-bold text-gray-900">
                Week 4: Database Administration
              </h3>
              <p className="text-sm text-gray-500">Submitted: April 15, 2026</p>
            </div>
            <Badge variant="warning">Pending Review</Badge>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-900">
                  Activity Description (Learner)
                </h4>
                <span className="text-xs font-medium text-brand-blue">
                  8 Hours Logged
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Assisted the senior DBA with routine database backups and
                maintenance. Wrote SQL scripts to identify duplicate records in
                the customer table and generated a report for the data cleansing
                team. Also shadowed the process of restoring a test database
                from yesterday's backup.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">
                Evidence Attached
              </h4>
              <div className="flex items-center p-2 bg-white border border-gray-200 rounded text-sm text-brand-blue cursor-pointer hover:underline">
                <FileCheck className="h-4 w-4 mr-2" />
                SQL_Scripts_Backup_Log.pdf
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Supervisor Comments
              </label>
              <textarea
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-navy focus:border-brand-navy text-sm"
                rows={4}
                placeholder="Enter your feedback or verification comments here...">
              </textarea>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                setShowLogbookModal(false);
                toast.error('Logbook rejected. Learner notified.');
              }}>
              
              Reject & Request Changes
            </Button>
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowLogbookModal(false)}>
                
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setShowLogbookModal(false);
                  toast.success('Logbook verified and approved successfully');
                }}>
                
                Verify & Approve
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>);

}