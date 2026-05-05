import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  Bell,
  Filter,
  Download,
  Search,
  CheckCircle,
  Calendar,
  FileText,
  Upload } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend } from
'recharts';
export function FacilitatorSETACompliancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [showDocFilters, setShowDocFilters] = useState(false);
  const tabs = [
  {
    id: 'overview',
    label: 'Overview'
  },
  {
    id: 'documents',
    label: 'Documents'
  },
  {
    id: 'submissions',
    label: 'Submissions'
  },
  {
    id: 'audits',
    label: 'Audits & Verifications'
  }];

  const stats = [
  {
    label: 'Overall Compliance',
    value: '85%',
    sub: 'Good Standing',
    subColor: 'text-green-600',
    icon: <ShieldCheck className="h-5 w-5 text-green-600" />
  },
  {
    label: 'Upcoming Deadlines',
    value: '3',
    sub: 'Within 30 days',
    subColor: 'text-amber-600',
    icon: <Clock className="h-5 w-5 text-amber-500" />
  },
  {
    label: 'Compliance Gaps',
    value: '2',
    sub: 'Needs Attention',
    subColor: 'text-red-600',
    icon: <AlertCircle className="h-5 w-5 text-red-500" />
  },
  {
    label: 'Next SETA Visit',
    value: '42 days',
    sub: 'Scheduled',
    subColor: 'text-blue-600',
    icon: <Bell className="h-5 w-5 text-blue-500" />
  }];

  const compliancePieData = [
  {
    name: 'Compliant',
    value: 85,
    color: '#10b981'
  },
  {
    name: 'Pending',
    value: 10,
    color: '#f59e0b'
  },
  {
    name: 'Non-Compliant',
    value: 5,
    color: '#ef4444'
  }];

  const submissionsChartData = [
  {
    month: 'Jan',
    compliant: 5,
    pending: 0
  },
  {
    month: 'Feb',
    compliant: 4,
    pending: 1
  },
  {
    month: 'Mar',
    compliant: 6,
    pending: 2
  },
  {
    month: 'Apr',
    compliant: 3,
    pending: 0
  },
  {
    month: 'May',
    compliant: 5,
    pending: 1
  },
  {
    month: 'Jun',
    compliant: 4,
    pending: 0
  }];

  const complianceItems = [
  {
    label: 'Learner Registration Forms',
    desc: 'All 24 active learners registered with SETA',
    ok: true
  },
  {
    label: 'Quarterly Progress Reports',
    desc: 'Q1 and Q2 reports submitted on time',
    ok: true
  },
  {
    label: 'Workplace Assessment Documentation',
    desc: '3 learners missing workplace evaluations',
    ok: false
  },
  {
    label: 'POE Verification',
    desc: 'All POEs verified and backed up',
    ok: true
  },
  {
    label: 'QCTO Alignment Documentation',
    desc: 'All modules aligned with latest QCTO requirements',
    ok: true
  }];

  const actionItems = [
  {
    task: 'Submit Q2 Learner Progress Reports',
    due: '15 Jun 2023',
    priority: 'High',
    priorityColor: 'bg-red-100 text-red-700',
    assigned: 'Sarah Johnson',
    done: false
  },
  {
    task: 'Update Workplace Assessment Documentation',
    due: '30 Jun 2023',
    priority: 'Medium',
    priorityColor: 'bg-amber-100 text-amber-700',
    assigned: 'Sarah Johnson',
    done: false
  },
  {
    task: 'Complete QCTO Alignment Documentation',
    due: '15 Jul 2023',
    priority: 'Low',
    priorityColor: 'bg-blue-100 text-blue-700',
    assigned: 'Unassigned',
    done: false
  },
  {
    task: 'Verify Learner Registration Forms',
    due: '22 Jun 2023',
    priority: 'Medium',
    priorityColor: 'bg-amber-100 text-amber-700',
    assigned: 'Sarah Johnson',
    done: true
  },
  {
    task: 'Schedule External Moderator Visit',
    due: '05 Jul 2023',
    priority: 'High',
    priorityColor: 'bg-red-100 text-red-700',
    assigned: 'Unassigned',
    done: false
  }];

  const documents = [
  {
    name: 'Learner Registration Forms',
    category: 'Registration',
    status: 'Verified',
    statusVariant: 'success' as const,
    lastUpdated: '15 May 2023',
    expiry: 'N/A'
  },
  {
    name: 'Facilitator Accreditation',
    category: 'Accreditation',
    status: 'Verified',
    statusVariant: 'success' as const,
    lastUpdated: '03 Apr 2023',
    expiry: '03 Apr 2025'
  },
  {
    name: 'Workplace Assessment Guide',
    category: 'Assessment',
    status: 'Pending Review',
    statusVariant: 'warning' as const,
    lastUpdated: '10 Jun 2023',
    expiry: 'N/A'
  },
  {
    name: 'SETA Program Approval',
    category: 'Accreditation',
    status: 'Verified',
    statusVariant: 'success' as const,
    lastUpdated: '22 Jan 2023',
    expiry: '22 Jan 2026'
  },
  {
    name: 'External Moderator Reports',
    category: 'Moderation',
    status: 'Missing',
    statusVariant: 'danger' as const,
    lastUpdated: 'N/A',
    expiry: 'N/A'
  },
  {
    name: 'Training Provider Accreditation',
    category: 'Accreditation',
    status: 'Expiring Soon',
    statusVariant: 'warning' as const,
    lastUpdated: '15 Jul 2021',
    expiry: '15 Jul 2023'
  }];

  const submissions = [
  {
    type: 'Quarterly Learner Progress Report',
    ref: 'QPR-2023-Q1',
    due: '15 Apr 2023',
    status: 'Submitted',
    statusVariant: 'success' as const,
    submittedBy: 'Sarah Johnson',
    response: 'Accepted',
    action: 'View Details'
  },
  {
    type: 'Quarterly Learner Progress Report',
    ref: 'QPR-2023-Q2',
    due: '15 Jul 2023',
    status: 'Pending',
    statusVariant: 'warning' as const,
    submittedBy: '-',
    response: '-',
    action: 'Submit'
  },
  {
    type: 'Workplace Assessment Verification',
    ref: 'WAV-2023-05',
    due: '30 May 2023',
    status: 'Overdue',
    statusVariant: 'danger' as const,
    submittedBy: '-',
    response: '-',
    action: 'Submit'
  },
  {
    type: 'Annual Training Report',
    ref: 'ATR-2023',
    due: '31 Mar 2023',
    status: 'Submitted',
    statusVariant: 'success' as const,
    submittedBy: 'Sarah Johnson',
    response: 'Accepted with Comments',
    action: 'View Details'
  },
  {
    type: 'Workplace Skills Plan',
    ref: 'WSP-2023',
    due: '30 Apr 2023',
    status: 'Submitted',
    statusVariant: 'success' as const,
    submittedBy: 'Sarah Johnson',
    response: 'Accepted',
    action: 'View Details'
  },
  {
    type: 'Moderation Summary Report',
    ref: 'MSR-2023-Q2',
    due: '15 Jul 2023',
    status: 'Upcoming',
    statusVariant: 'info' as const,
    submittedBy: '-',
    response: '-',
    action: 'Submit'
  }];

  const audits = [
  {
    type: 'SETA Verification Visit',
    ref: 'SVV-2023-05',
    date: '15 May 2023',
    status: 'Completed',
    conductor: 'MICT SETA',
    outcome: 'Compliant',
    outcomeVariant: 'success' as const
  },
  {
    type: 'Internal Compliance Audit',
    ref: 'ICA-2023-04',
    date: '10 Apr 2023',
    status: 'Completed',
    conductor: 'Internal QA Team',
    outcome: 'Partially Compliant',
    outcomeVariant: 'warning' as const
  },
  {
    type: 'QCTO Site Visit',
    ref: 'QSV-2023-02',
    date: '22 Feb 2023',
    status: 'Completed',
    conductor: 'QCTO',
    outcome: 'Compliant',
    outcomeVariant: 'success' as const
  },
  {
    type: 'External Moderation',
    ref: 'EXM-2023-03',
    date: '15 Mar 2023',
    status: 'Completed',
    conductor: 'John Nkosi (External Moderator)',
    outcome: 'Compliant',
    outcomeVariant: 'success' as const
  },
  {
    type: 'SETA Verification Visit',
    ref: 'SVV-2023-08',
    date: '15 Aug 2023',
    status: 'Scheduled',
    conductor: 'MICT SETA',
    outcome: '-',
    outcomeVariant: 'neutral' as const
  }];

  const verificationReqs = [
  {
    label: 'Learner Registration Forms',
    status: 'Complete'
  },
  {
    label: 'Facilitator Qualifications',
    status: 'Complete'
  },
  {
    label: 'Assessment Tools & Instruments',
    status: 'Complete'
  },
  {
    label: 'Moderation Reports',
    status: 'Complete'
  },
  {
    label: 'Learner Attendance Records',
    status: 'Partial'
  },
  {
    label: 'Workplace Logbooks',
    status: 'Partial'
  },
  {
    label: 'QCTO Curriculum Alignment',
    status: 'Complete'
  }];

  const recentFindings = [
  {
    title: 'SETA Verification - May 2023',
    badge: 'Compliant',
    badgeVariant: 'success' as const,
    desc: 'All requirements met with minor recommendations for improvement in workplace assessment documentation.'
  },
  {
    title: 'Internal Audit - April 2023',
    badge: 'Action Items',
    badgeVariant: 'warning' as const,
    desc: 'Identified 3 areas for improvement: attendance tracking, POE organization, and assessment feedback documentation.'
  },
  {
    title: 'QCTO Site Visit - February 2023',
    badge: 'Compliant',
    badgeVariant: 'success' as const,
    desc: 'Full compliance with occupational qualification requirements. Commendation for practical training facilities.'
  }];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Verified':
      case 'Submitted':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'Pending Review':
      case 'Pending':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'Missing':
      case 'Overdue':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'Expiring Soon':
        return <Bell className="h-3 w-3 mr-1" />;
      case 'Upcoming':
        return <Calendar className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SETA Compliance</h1>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            SETA Compliance Management
          </h2>
          <p className="text-sm text-brand-blue">
            IT Skills Development Program (MICT SETA)
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="w-56">
            <Input
              placeholder="Search documents..."
              icon={<Search className="h-4 w-4" />} />
            
          </div>
          <Button
            variant="outline"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}>
            
            Filter
          </Button>
          <Button
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => toast.success('Exporting report...')}>
            
            Export Report
          </Button>
        </div>
      </div>

      {showFilters &&
      <Card className="bg-gray-50 border-dashed">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Filter Compliance Data
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
              label: 'All Statuses'
            },
            {
              value: 'compliant',
              label: 'Compliant'
            },
            {
              value: 'non-compliant',
              label: 'Non-Compliant'
            }]
            } />
          
            <Select
            options={[
            {
              value: 'all',
              label: 'All SETAs'
            },
            {
              value: 'mict',
              label: 'MICT SETA'
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

      <div className="border-b border-gray-200">
        <div className="flex space-x-6">
          {tabs.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            
              {tab.label}
            </button>
          )}
        </div>
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' &&
      <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) =>
          <div
            key={i}
            className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            
                <div className="mb-3">{stat.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                <p className={`text-xs mt-1 ${stat.subColor}`}>{stat.sub}</p>
              </div>
          )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Compliance Status
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                  data={compliancePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}>
                  
                    {compliancePieData.map((entry, i) =>
                  <Cell key={i} fill={entry.color} />
                  )}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                SETA Submissions
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={submissionsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 12
                  }} />
                
                  <YAxis
                  tick={{
                    fontSize: 12
                  }} />
                
                  <Tooltip />
                  <Legend />
                  <Bar
                  dataKey="compliant"
                  fill="#10b981"
                  name="Compliant"
                  radius={[2, 2, 0, 0]} />
                
                  <Bar
                  dataKey="pending"
                  fill="#f59e0b"
                  name="Pending"
                  radius={[2, 2, 0, 0]} />
                
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                SETA Compliance Status
              </h3>
              <Badge variant="success">94% Compliant</Badge>
            </div>
            <div className="space-y-4">
              {complianceItems.map((item, i) =>
            <div key={i} className="flex items-start">
                  {item.ok ?
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /> :

              <Clock className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
              }
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
            )}
            </div>
          </Card>

          {/* Compliance Action Items */}
          <Card title="Compliance Action Items">
            <div className="space-y-0 divide-y divide-gray-100">
              {actionItems.map((item, i) =>
            <div
              key={i}
              className={`py-4 first:pt-0 last:pb-0 ${item.done ? 'opacity-60' : ''}`}>
              
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      {item.done ?
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" /> :

                  <Clock className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                  }
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.task}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" /> Due: {item.due}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${item.priorityColor}`}>
                    
                        {item.priority}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned to: {item.assigned}
                      </p>
                    </div>
                  </div>
                </div>
            )}
            </div>
          </Card>
        </div>
      }

      {/* ===== DOCUMENTS TAB ===== */}
      {activeTab === 'documents' &&
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">
              Required Documentation
            </h3>
            <div className="flex space-x-3">
              <Button
              variant="outline"
              leftIcon={<Filter className="h-4 w-4" />}
              onClick={() => setShowDocFilters(!showDocFilters)}
              className={showDocFilters ? 'bg-gray-100' : ''}>
              
                Filter
              </Button>
              <Button
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() =>
                toast.info('Document upload will open when storage is connected.')
              }>
              
                Upload Document
              </Button>
            </div>
          </div>

          {showDocFilters &&
        <Card className="bg-gray-50 border-dashed">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Filter Documents
                </h3>
                <button
              className="text-sm text-brand-blue hover:underline"
              onClick={() => {
                toast.success('Filters cleared');
                setShowDocFilters(false);
              }}>
              
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
              options={[
              {
                value: 'all',
                label: 'All Categories'
              },
              {
                value: 'registration',
                label: 'Registration'
              },
              {
                value: 'assessment',
                label: 'Assessment'
              }]
              } />
            
                <Select
              options={[
              {
                value: 'all',
                label: 'All Statuses'
              },
              {
                value: 'verified',
                label: 'Verified'
              },
              {
                value: 'missing',
                label: 'Missing'
              }]
              } />
            
                <Select
              options={[
              {
                value: 'all',
                label: 'All Time'
              },
              {
                value: 'recent',
                label: 'Recently Updated'
              }]
              } />
            
                <Button
              className="w-full"
              onClick={() => {
                toast.success('Filters applied');
                setShowDocFilters(false);
              }}>
              
                  Apply Filters
                </Button>
              </div>
            </Card>
        }

          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Document Type</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Last Updated</th>
                    <th className="text-left px-6 py-3">Expiry Date</th>
                    <th className="text-left px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc, i) =>
                <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {doc.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={doc.statusVariant}>
                          {getStatusIcon(doc.status)}
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {doc.lastUpdated}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {doc.expiry}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-3 text-sm">
                          <button
                        className="text-brand-blue hover:underline"
                        onClick={() =>
                        toast.info('Opening document viewer...')
                        }>
                        
                            View
                          </button>
                          <button
                        className="text-brand-blue hover:underline"
                        onClick={() =>
                        toast.info('Opening document uploader...')
                        }>
                        
                            Update
                          </button>
                          <button
                        className="text-brand-blue hover:underline"
                        onClick={() =>
                        toast.success('Downloading document...')
                        }>
                        
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      }

      {/* ===== SUBMISSIONS TAB ===== */}
      {activeTab === 'submissions' &&
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">
              SETA Submissions
            </h3>
            <Button
            leftIcon={<Calendar className="h-4 w-4" />}
            onClick={() => toast.info('Opening scheduler...')}>
            
              Schedule Submission
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Completed
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    All requirements met
                  </p>
                </div>
                <p className="text-3xl font-bold text-green-700">18</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-amber-700">Upcoming</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Due within 30 days
                  </p>
                </div>
                <p className="text-3xl font-bold text-amber-700">3</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-red-700">Overdue</p>
                  <p className="text-xs text-red-600 mt-1">
                    Requires immediate attention
                  </p>
                </div>
                <p className="text-3xl font-bold text-red-700">1</p>
              </div>
            </div>
          </div>

          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Submission Type</th>
                    <th className="text-left px-6 py-3">Due Date</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Submitted By</th>
                    <th className="text-left px-6 py-3">SETA Response</th>
                    <th className="text-left px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((sub, i) =>
                <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {sub.type}
                        </p>
                        <p className="text-xs text-gray-500">{sub.ref}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {sub.due}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={sub.statusVariant}>
                          {getStatusIcon(sub.status)}
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {sub.submittedBy}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {sub.response}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                      size="sm"
                      variant={
                      sub.action === 'View Details' ?
                      'primary' :
                      'primary'
                      }
                      onClick={() =>
                      sub.action === 'View Details' ?
                      toast.info('Opening submission details...') :
                      toast.info('Opening submission form...')
                      }>
                      
                          {sub.action}
                        </Button>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      }

      {/* ===== AUDITS & VERIFICATIONS TAB ===== */}
      {activeTab === 'audits' &&
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">
              Audits & Verifications
            </h3>
            <Button
            leftIcon={<Calendar className="h-4 w-4" />}
            onClick={() => toast.info('Opening audit scheduler...')}>
            
              Schedule Audit
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start">
              <Bell className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-brand-blue">
                  Upcoming SETA Verification Visit
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Date: August 15, 2023
                </p>
                <p className="text-sm text-gray-600">
                  Focus Areas: Learner POEs, Assessment Practices, Facilitator
                  Qualifications
                </p>
                <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => toast.info('Opening preparation checklist...')}>
                
                  View Preparation Checklist
                </Button>
              </div>
            </div>
          </div>

          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Audit Type</th>
                    <th className="text-left px-6 py-3">Date</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Conducted By</th>
                    <th className="text-left px-6 py-3">Outcome</th>
                    <th className="text-left px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {audits.map((audit, i) =>
                <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {audit.type}
                        </p>
                        <p className="text-xs text-gray-500">{audit.ref}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {audit.date}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                      variant={
                      audit.status === 'Completed' ? 'success' : 'info'
                      }>
                      
                          {audit.status === 'Completed' ?
                      <CheckCircle className="h-3 w-3 mr-1" /> :

                      <Calendar className="h-3 w-3 mr-1" />
                      }
                          {audit.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {audit.conductor}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={audit.outcomeVariant}>
                          {audit.outcome}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <button
                      className="text-sm text-brand-blue hover:underline"
                      onClick={() => toast.info('Opening audit report...')}>
                      
                          View Report
                        </button>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Verification Requirements">
              <div className="space-y-3">
                {verificationReqs.map((req, i) =>
              <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-brand-blue">{req.label}</span>
                    <Badge
                  variant={
                  req.status === 'Complete' ? 'success' : 'warning'
                  }>
                  
                      {req.status === 'Complete' ?
                  <CheckCircle className="h-3 w-3 mr-1" /> :

                  <Clock className="h-3 w-3 mr-1" />
                  }
                      {req.status}
                    </Badge>
                  </div>
              )}
              </div>
            </Card>
            <Card title="Recent Findings">
              <div className="space-y-4">
                {recentFindings.map((finding, i) =>
              <div
                key={i}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold text-gray-900">
                        {finding.title}
                      </h4>
                      <Badge variant={finding.badgeVariant}>
                        {finding.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{finding.desc}</p>
                  </div>
              )}
              </div>
            </Card>
          </div>
        </div>
      }
    </div>);

}