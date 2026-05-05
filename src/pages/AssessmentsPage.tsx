import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileCheck,
  Clock,
  Eye,
  CheckCircle,
  Bot,
  Filter,
  Plus,
  BarChart3,
  AlertTriangle } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';

type AssessmentQueueRow = {
  id: number;
  learner: { name: string; id: string };
  assessment: { name: string; module: string; flagged?: boolean };
  program: { name: string; seta: string };
  assessor: string;
};

type PendingReviewRow = {
  id: number;
  learner: string;
  assessment: string;
  submittedDate: string;
  assessor: string;
  status: string;
};
export function AssessmentsPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');
  const stats = [
  {
    label: 'Total Assessments',
    value: '342',
    icon: <FileCheck className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Pending Review',
    value: '47',
    icon: <Clock className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Under Moderation',
    value: '23',
    icon: <Eye className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Completed',
    value: '272',
    icon: <CheckCircle className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'AI Flagged',
    value: '8',
    icon: <Bot className="h-5 w-5 text-gray-500" />,
    badge: true
  }];

  const queue = [
  {
    id: 1,
    learner: {
      name: 'Thandi Mokoena',
      id: '9012345678901'
    },
    assessment: {
      name: 'Portfolio of Evidence',
      module: 'Module 3 - Database Design'
    },
    program: {
      name: 'IT Skills Program',
      seta: 'MICT SETA'
    },
    assessor: 'Sarah Johnson'
  },
  {
    id: 2,
    learner: {
      name: 'John Smith',
      id: '8712345678901'
    },
    assessment: {
      name: 'Practical Assessment',
      module: 'Module 2 - Safety Procedures'
    },
    program: {
      name: 'Manufacturing Learnership',
      seta: 'Manufacturing SETA'
    },
    assessor: 'Mike Wilson'
  },
  {
    id: 3,
    learner: {
      name: 'Nomsa Dlamini',
      id: '9512345678901'
    },
    assessment: {
      name: 'Written Assessment',
      module: 'Module 1 - Business Ethics',
      flagged: true
    },
    program: {
      name: 'Business Administration',
      seta: 'Services SETA'
    },
    assessor: 'Lisa Adams'
  },
  {
    id: 4,
    learner: {
      name: 'David van der Merwe',
      id: '8812345678901'
    },
    assessment: {
      name: 'Practical Assessment',
      module: 'Module 4 - Network Security'
    },
    program: {
      name: 'IT Skills Program',
      seta: 'MICT SETA'
    },
    assessor: 'Sarah Johnson'
  }];

  const pendingReviews = [
  {
    id: 1,
    learner: 'Thandi Mokoena',
    assessment: 'Portfolio of Evidence',
    submittedDate: '2026-02-10',
    assessor: 'Sarah Johnson',
    status: 'Pending'
  },
  {
    id: 2,
    learner: 'Sipho Ndlovu',
    assessment: 'Practical Assessment',
    submittedDate: '2026-02-09',
    assessor: 'Mike Wilson',
    status: 'In Review'
  },
  {
    id: 3,
    learner: 'Zanele Dlamini',
    assessment: 'Written Assessment',
    submittedDate: '2026-02-08',
    assessor: 'Lisa Adams',
    status: 'Pending'
  },
  {
    id: 4,
    learner: 'David van der Merwe',
    assessment: 'Database Design Quiz',
    submittedDate: '2026-02-07',
    assessor: 'Sarah Johnson',
    status: 'In Review'
  }];

  const queueColumns = [
  {
    header: 'LEARNER',
    accessorKey: 'learner' as const,
    cell: (row: AssessmentQueueRow) =>
    <div className="flex items-center">
          <Avatar name={row.learner.name} className="mr-3" />
          <div>
            <div className="font-medium text-gray-900">{row.learner.name}</div>
            <div className="text-xs text-gray-500">ID: {row.learner.id}</div>
          </div>
        </div>

  },
  {
    header: 'ASSESSMENT',
    accessorKey: 'assessment' as const,
    cell: (row: AssessmentQueueRow) =>
    <div
      className="cursor-pointer hover:opacity-80"
      onClick={() => navigate(`/assessment/${row.id}/submissions`)}>
      
          <div className="font-medium text-gray-900 hover:text-brand-blue hover:underline">
            {row.assessment.name}
          </div>
          <div className="text-xs text-gray-500">{row.assessment.module}</div>
          {row.assessment.flagged &&
      <Badge
        variant="info"
        className="mt-1 bg-brand-navy text-white text-[10px] py-0 px-1">
        
              AI Flagged
            </Badge>
      }
        </div>

  },
  {
    header: 'PROGRAM',
    accessorKey: 'program' as const,
    cell: (row: AssessmentQueueRow) =>
    <div>
          <div className="text-sm text-gray-900">{row.program.name}</div>
          <div className="text-xs text-gray-500">{row.program.seta}</div>
        </div>

  },
  {
    header: 'ASSESSOR',
    accessorKey: 'assessor' as const,
    cell: (row: AssessmentQueueRow) =>
    <div className="flex items-center text-sm text-gray-600">
          <Avatar name={row.assessor} className="h-6 w-6 mr-2" />
          {row.assessor}
        </div>

  },
  {
    header: 'ACTIONS',
    accessorKey: 'id' as const,
    cell: (row: AssessmentQueueRow) =>
    <Button
      size="sm"
      variant="outline"
      onClick={() => navigate(`/assessment/${row.id}/submissions`)}>
      
          Review
        </Button>

  }];

  const pendingColumns = [
  {
    header: 'Learner',
    accessorKey: 'learner' as const,
    cell: (row: PendingReviewRow) =>
    <div className="flex items-center">
          <Avatar name={row.learner} className="mr-3" size="sm" />
          <span className="font-medium text-gray-900">{row.learner}</span>
        </div>

  },
  {
    header: 'Assessment',
    accessorKey: 'assessment' as const
  },
  {
    header: 'Submitted',
    accessorKey: 'submittedDate' as const
  },
  {
    header: 'Assessor',
    accessorKey: 'assessor' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: PendingReviewRow) =>
    <Badge variant={row.status === 'Pending' ? 'warning' : 'info'}>
          {row.status}
        </Badge>

  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: () =>
    <Button size="sm" onClick={() => toast.info('Opening review...')}>
          Review
        </Button>

  }];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-sm text-gray-500">
            Manage and track all assessments across programs
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}>
            
            Filter
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/assessment-builder')}>
            
            Create Assessment
          </Button>
        </div>
      </div>

      {showFilters &&
      <Card className="bg-gray-50 border-dashed">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Filter Assessments
            </h3>
            <button
            className="text-sm text-brand-blue hover:underline"
            onClick={() => {
              toast.success('Filters cleared');
              setShowFilters(false);
            }}>
            
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
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
          
            <Select
            options={[
            {
              value: 'all',
              label: 'All Modules'
            },
            {
              value: 'm1',
              label: 'Module 1'
            }]
            } />
          
            <Select
            options={[
            {
              value: 'all',
              label: 'All Statuses'
            },
            {
              value: 'active',
              label: 'Active'
            },
            {
              value: 'draft',
              label: 'Draft'
            }]
            } />
          
            <Button
            className="w-full"
            onClick={() => {
              toast.success('Filters applied');
              setShowFilters(false);
            }}>
            
              Apply Filters
            </Button>
          </div>
        </Card>
      }

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) =>
        <div
          key={i}
          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
          
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-md">{stat.icon}</div>
            </div>
            {stat.badge &&
          <div className="absolute top-2 right-12">
                <Badge
              variant="info"
              className="bg-brand-navy text-white text-xs">
              
                  AI
                </Badge>
              </div>
          }
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
        {
          id: 'queue',
          label: 'Assessment Queue',
          count: 4
        },
        {
          id: 'pending',
          label: 'Pending Review',
          count: 47
        },
        {
          id: 'compliance',
          label: 'SETA Compliance'
        },
        {
          id: 'analysis',
          label: 'Results Analysis'
        }]
        }
        activeTab={activeTab}
        onChange={setActiveTab} />
      

      {activeTab === 'queue' &&
      <Card title="Assessment Queue" noPadding>
          <div className="p-4 border-b border-gray-100 flex justify-end gap-4">
            <div className="w-48">
              <Select
              options={[
              {
                value: 'all',
                label: 'All Programs'
              }]
              } />
            
            </div>
            <div className="w-48">
              <Select
              options={[
              {
                value: 'all',
                label: 'All Statuses'
              }]
              } />
            
            </div>
          </div>
          <DataTable data={queue} columns={queueColumns} keyField="id" />
        </Card>
      }

      {activeTab === 'pending' &&
      <Card title="Pending Reviews" noPadding>
          <DataTable
          data={pendingReviews}
          columns={pendingColumns}
          keyField="id" />
        
        </Card>
      }

      {activeTab === 'compliance' &&
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Assessment Compliance Checklist">
            <div className="space-y-4">
              {[
            {
              label: 'Assessment Instruments Approved by SETA',
              status: true
            },
            {
              label: 'Moderation Reports Complete & Signed',
              status: true
            },
            {
              label: 'Assessment Records Filed (NLRD Format)',
              status: false
            },
            {
              label: 'External Verification Completed',
              status: false
            },
            {
              label: 'Assessor Registrations Valid',
              status: true
            },
            {
              label: 'Moderator Registrations Valid',
              status: true
            }].
            map((item, i) =>
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              
                  <div className="flex items-center">
                    {item.status ?
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" /> :

                <AlertTriangle className="h-5 w-5 text-amber-500 mr-3" />
                }
                    <span className="text-sm font-medium text-gray-700">
                      {item.label}
                    </span>
                  </div>
                  <Badge variant={item.status ? 'success' : 'warning'}>
                    {item.status ? 'Complete' : 'Pending'}
                  </Badge>
                </div>
            )}
            </div>
          </Card>
          <Card title="Compliance Summary">
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="text-5xl font-bold text-green-600 mb-2">
                  67%
                </div>
                <p className="text-sm text-gray-500">
                  Overall Assessment Compliance
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Instruments Approved</span>
                  <span className="font-medium">4/4</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Moderation Complete</span>
                  <span className="font-medium">3/4</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Records Filed</span>
                  <span className="font-medium">2/4</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">External Verification</span>
                  <span className="font-medium">1/4</span>
                </div>
              </div>
              <Button
              className="w-full"
              onClick={() => toast.success('Generating compliance report...')}>
              
                Generate Compliance Report
              </Button>
            </div>
          </Card>
        </div>
      }

      {activeTab === 'analysis' &&
      <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Pass Rate
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">82%</p>
              <p className="text-xs text-green-600 mt-1">
                ↑ 3% from last quarter
              </p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Average Score
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">74%</p>
              <p className="text-xs text-gray-500 mt-1">
                Across all programmes
              </p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Highest Score
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-1">96%</p>
              <p className="text-xs text-gray-500 mt-1">Database Design Quiz</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Lowest Score
              </p>
              <p className="text-3xl font-bold text-red-600 mt-1">45%</p>
              <p className="text-xs text-gray-500 mt-1">Network Security</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Score Distribution" noPadding>
              <div className="p-6 flex items-center justify-center h-64 bg-gray-50">
                <div className="text-center text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Score distribution chart</p>
                </div>
              </div>
            </Card>
            <Card title="Top Performers">
              <div className="space-y-4">
                {[
              {
                name: 'Thandi Mokoena',
                score: '96%',
                programme: 'IT Skills Program'
              },
              {
                name: 'Sipho Nkosi',
                score: '94%',
                programme: 'IT Skills Program'
              },
              {
                name: 'Zanele Dlamini',
                score: '91%',
                programme: 'Business Administration'
              },
              {
                name: 'David van der Merwe',
                score: '89%',
                programme: 'IT Skills Program'
              },
              {
                name: 'Nomsa Khumalo',
                score: '87%',
                programme: 'Manufacturing'
              }].
              map((performer, i) =>
              <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                    
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {performer.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {performer.programme}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {performer.score}
                    </span>
                  </div>
              )}
              </div>
            </Card>
          </div>
        </div>
      }
    </div>);

}