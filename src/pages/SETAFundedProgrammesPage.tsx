import React, { useState } from 'react';
import {
  Search,
  Building,
  Users,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  FileCheck,
  Mail,
  ShieldCheck } from
'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { ComplianceGauge } from '../components/dashboard/ComplianceGauge';
// Mock Data
const PROVIDERS = [
{
  id: 1,
  name: 'TechCorp Solutions',
  programme: 'NC: Systems Development',
  saqaId: '48872',
  learners: 42,
  activeLearners: 38,
  compliance: 92,
  status: 'On Track',
  lastReport: '08 Feb 2026',
  logo: 'TC'
},
{
  id: 2,
  name: 'Manufacturing Plus',
  programme: 'FETC: Project Management',
  saqaId: '50080',
  learners: 28,
  activeLearners: 25,
  compliance: 78,
  status: 'At Risk',
  lastReport: '15 Jan 2026',
  logo: 'MP'
},
{
  id: 3,
  name: 'ABC Engineering',
  programme: 'Occupational Cert: Welding',
  saqaId: '94100',
  learners: 35,
  activeLearners: 34,
  compliance: 95,
  status: 'On Track',
  lastReport: '01 Feb 2026',
  logo: 'AE'
},
{
  id: 4,
  name: 'Digital Academy SA',
  programme: 'NC: Business Analysis',
  saqaId: '63909',
  learners: 19,
  activeLearners: 15,
  compliance: 65,
  status: 'Delayed',
  lastReport: '10 Dec 2025',
  logo: 'DA'
},
{
  id: 5,
  name: 'GreenTech Industries',
  programme: 'Skills Programme: Python',
  saqaId: 'SP-001',
  learners: 15,
  activeLearners: 15,
  compliance: 88,
  status: 'On Track',
  lastReport: '20 Jan 2026',
  logo: 'GI'
},
{
  id: 6,
  name: 'Metro Services Group',
  programme: 'NC: Systems Development',
  saqaId: '48872',
  learners: 22,
  activeLearners: 18,
  compliance: 71,
  status: 'At Risk',
  lastReport: '05 Feb 2026',
  logo: 'MS'
}];

const REPORTS = [
{
  id: 1,
  name: 'Q1 Learner Progress Report',
  date: '2026-01-15',
  status: 'Accepted'
},
{
  id: 2,
  name: 'Workplace Logbook Summary',
  date: '2026-02-01',
  status: 'Accepted with Comments'
},
{
  id: 3,
  name: 'Moderation Report - Batch A',
  date: '2025-12-10',
  status: 'Rejected'
},
{
  id: 4,
  name: 'Learner Enrolment Data',
  date: '2025-11-20',
  status: 'Accepted'
}];

const LEARNERS = [
{
  id: 1,
  name: 'Thabo Mbeki',
  idNo: '9501015000086',
  enrolmentDate: '2025-06-01',
  progress: 85,
  docs: '8/8',
  contracts: '3/3',
  compliance: 'Compliant',
  lastActivity: '2 days ago'
},
{
  id: 2,
  name: 'Lerato Kganyago',
  idNo: '9605120000000',
  enrolmentDate: '2025-06-01',
  progress: 45,
  docs: '6/8',
  contracts: '2/3',
  compliance: 'Non-Compliant',
  lastActivity: '1 week ago'
},
{
  id: 3,
  name: 'Sipho Nkosi',
  idNo: '9402025000000',
  enrolmentDate: '2025-06-15',
  progress: 92,
  docs: '8/8',
  contracts: '3/3',
  compliance: 'Compliant',
  lastActivity: '5 hours ago'
},
{
  id: 4,
  name: 'Zanele Dlamini',
  idNo: '9708230000000',
  enrolmentDate: '2025-07-01',
  progress: 60,
  docs: '7/8',
  contracts: '3/3',
  compliance: 'Pending',
  lastActivity: '3 days ago'
},
{
  id: 5,
  name: 'John Doe',
  idNo: '9001015000000',
  enrolmentDate: '2025-06-01',
  progress: 10,
  docs: '4/8',
  contracts: '1/3',
  compliance: 'Non-Compliant',
  lastActivity: '1 month ago'
}];

type SetaLearnerRow = (typeof LEARNERS)[number];
type SetaReportRow = (typeof REPORTS)[number];

export function SETAFundedProgrammesPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('progress');
  const [selectedLearner, setSelectedLearner] =
    useState<SetaLearnerRow | null>(null);
  const selectedProvider = PROVIDERS.find((p) => p.id === selectedProviderId);
  const filteredProviders = PROVIDERS.filter((provider) => {
    const matchesSearch =
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.programme.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
    filterStatus === 'all' ?
    true :
    filterStatus === 'active' ?
    provider.status === 'On Track' :
    ['At Risk', 'Delayed'].includes(provider.status);
    return matchesSearch && matchesFilter;
  });
  // Learner Table Columns
  const learnerColumns = [
  {
    header: 'Learner',
    accessorKey: 'name' as const,
    cell: (row: SetaLearnerRow) =>
    <div className="flex items-center">
          <Avatar name={row.name} className="mr-3" size="sm" />
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500">{row.idNo}</div>
          </div>
        </div>

  },
  {
    header: 'Enrolment',
    accessorKey: 'enrolmentDate' as const
  },
  {
    header: 'Progress',
    accessorKey: 'progress' as const,
    cell: (row: SetaLearnerRow) =>
    <div className="w-24">
          <ProgressBar value={row.progress} size="sm" />
        </div>

  },
  {
    header: 'Documents',
    accessorKey: 'docs' as const,
    cell: (row: SetaLearnerRow) =>
    <span
      className={`text-sm ${row.docs === '8/8' ? 'text-green-600' : 'text-amber-600'}`}>
      
          {row.docs}
        </span>

  },
  {
    header: 'Compliance',
    accessorKey: 'compliance' as const,
    cell: (row: SetaLearnerRow) => {
      const variants: Record<string, 'success' | 'danger' | 'warning'> = {
        Compliant: 'success',
        'Non-Compliant': 'danger',
        Pending: 'warning',
      };
      const v = variants[row.compliance] ?? 'neutral';
      return <Badge variant={v}>{row.compliance}</Badge>;
    },
  },
  {
    header: 'Last Activity',
    accessorKey: 'lastActivity' as const
  }];

  // Reports Table Columns
  const reportColumns = [
  {
    header: 'Report Name',
    accessorKey: 'name' as const
  },
  {
    header: 'Submission Date',
    accessorKey: 'date' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: SetaReportRow) => {
      const variants: Record<string, 'success' | 'warning' | 'danger'> = {
        Accepted: 'success',
        'Accepted with Comments': 'warning',
        Rejected: 'danger',
      };
      const v = variants[row.status] ?? 'neutral';
      return <Badge variant={v}>{row.status}</Badge>;
    },
  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: () =>
    <div className="flex space-x-2">
          <Button
        variant="ghost"
        size="sm"
        onClick={() => toast.info('Viewing PDF...')}>
        
            <FileText className="h-4 w-4" />
          </Button>
          <Button
        variant="ghost"
        size="sm"
        onClick={() => toast.success('Downloading report...')}>
        
            <Download className="h-4 w-4" />
          </Button>
        </div>

  }];

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6">
      {/* Left Sidebar - Provider List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Funded Programmes
          </h2>
          <div className="space-y-3">
            <Input
              placeholder="Search companies..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
            
            <Select
              options={[
              {
                value: 'all',
                label: 'All Providers'
              },
              {
                value: 'active',
                label: 'Active / On Track'
              },
              {
                value: 'issues',
                label: 'With Compliance Issues'
              }]
              }
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)} />
            
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {filteredProviders.map((provider) =>
          <div
            key={provider.id}
            onClick={() => setSelectedProviderId(provider.id)}
            className={`
                p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md
                ${selectedProviderId === provider.id ? 'bg-white border-brand-navy ring-1 ring-brand-navy shadow-sm' : 'bg-white border-gray-200 hover:border-brand-blue/50'}
              `}>
            
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900 text-sm">
                  {provider.name}
                </h3>
                <Badge
                variant={
                provider.status === 'On Track' ?
                'success' :
                provider.status === 'Delayed' ?
                'warning' :
                'danger'
                }
                className="text-[10px] px-1.5 py-0.5">
                
                  {provider.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mb-3 line-clamp-1">
                {provider.programme}
              </p>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center text-gray-600">
                  <Users className="h-3 w-3 mr-1" />
                  {provider.learners} Learners
                </div>
                <div
                className={`flex items-center font-medium ${provider.compliance >= 90 ? 'text-green-600' : provider.compliance >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {provider.compliance}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Detail View */}
      <div className="flex-1 bg-gray-50 overflow-y-auto h-full">
        {selectedProvider ?
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-16 w-16 rounded-lg bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-xl mr-5">
                    {selectedProvider.logo}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedProvider.name}
                    </h1>
                    <p className="text-gray-600">
                      {selectedProvider.programme}
                    </p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium mr-3">
                        SAQA ID: {selectedProvider.saqaId}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" /> Last Report:{' '}
                        {selectedProvider.lastReport}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Button
                  variant="outline"
                  leftIcon={<Mail className="h-4 w-4" />}
                  onClick={() => toast.info('Opening mail client...')}>
                  
                    Contact Provider
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Total Learners</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {selectedProvider.learners}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Active</span>
                  <span className="text-2xl font-bold text-green-600">
                    {selectedProvider.activeLearners}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    Compliance Score
                  </span>
                  <div className="flex items-center">
                    <span
                    className={`text-2xl font-bold mr-2 ${selectedProvider.compliance >= 90 ? 'text-green-600' : selectedProvider.compliance >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    
                      {selectedProvider.compliance}%
                    </span>
                    <ComplianceGauge
                    score={selectedProvider.compliance}
                    label=""
                    size="sm" />
                  
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <Button
                  size="sm"
                  className="w-full"
                  onClick={() => toast.success('Report downloaded')}>
                  
                    Download Summary
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px]">
              <div className="px-6 pt-2">
                <Tabs
                tabs={[
                {
                  id: 'progress',
                  label: 'Programme Progress'
                },
                {
                  id: 'reports',
                  label: 'Submitted Reports',
                  count: 4
                },
                {
                  id: 'learners',
                  label: 'Learners & Compliance'
                }]
                }
                activeTab={activeTab}
                onChange={setActiveTab} />
              
              </div>

              <div className="p-6">
                {activeTab === 'progress' &&
              <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Overall Completion Status
                      </h3>
                      <ProgressBar
                    value={65}
                    label="Programme Curriculum Completed"
                    size="md"
                    showValue />
                  
                      <p className="text-sm text-gray-500 mt-2">
                        Expected completion date: 30 Nov 2026
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card
                    title="Monthly Completion Trend"
                    noPadding
                    className="h-64 flex items-center justify-center bg-gray-50">
                    
                        <div className="text-center text-gray-400">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Completion trend chart visualization</p>
                        </div>
                      </Card>

                      <Card title="Key Milestones">
                        <div className="space-y-4">
                          {[
                      {
                        label: 'Induction & Registration',
                        date: '01 Jun 2025',
                        status: 'completed'
                      },
                      {
                        label: 'First Quarter Assessment',
                        date: '01 Sep 2025',
                        status: 'completed'
                      },
                      {
                        label: 'Mid-Year Moderation',
                        date: '15 Dec 2025',
                        status: 'completed'
                      },
                      {
                        label: 'Workplace Experience Start',
                        date: '10 Jan 2026',
                        status: 'current'
                      },
                      {
                        label: 'Final Assessment',
                        date: '01 Nov 2026',
                        status: 'pending'
                      }].
                      map((milestone, i) =>
                      <div key={i} className="flex items-center">
                              <div
                          className={`h-2 w-2 rounded-full mr-3 ${milestone.status === 'completed' ? 'bg-green-500' : milestone.status === 'current' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                        
                              <div className="flex-1">
                                <p
                            className={`text-sm font-medium ${milestone.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
                            
                                  {milestone.label}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500">
                                {milestone.date}
                              </span>
                            </div>
                      )}
                        </div>
                      </Card>
                    </div>
                  </div>
              }

                {activeTab === 'reports' &&
              <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Submission History
                      </h3>
                      <Button
                    leftIcon={<Download className="h-4 w-4" />}
                    variant="outline"
                    onClick={() => toast.success('Exporting history...')}>
                    
                        Export History
                      </Button>
                    </div>
                    <DataTable
                  data={REPORTS}
                  columns={reportColumns}
                  keyField="id" />
                
                  </div>
              }

                {activeTab === 'learners' &&
              <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                      placeholder="Search learners..."
                      className="pl-10" />
                    
                      </div>
                      <div className="flex space-x-2">
                        <Button
                      variant="outline"
                      leftIcon={<Download className="h-4 w-4" />}
                      onClick={() =>
                      toast.success('Downloading Excel list...')
                      }>
                      
                          Learner List
                        </Button>
                        <Button
                      variant="outline"
                      leftIcon={<FileCheck className="h-4 w-4" />}
                      onClick={() =>
                      toast.success('Generating POE package...')
                      }>
                      
                          Full POE Package
                        </Button>
                        <Button
                      leftIcon={<ShieldCheck className="h-4 w-4" />}
                      onClick={() =>
                      toast.success('Generating compliance report...')
                      }>
                      
                          Compliance Report
                        </Button>
                      </div>
                    </div>

                    <DataTable
                  data={LEARNERS}
                  columns={learnerColumns}
                  keyField="id"
                  selectable
                  onRowClick={(row) => setSelectedLearner(row)}
                  onBulkAction={(action, ids) =>
                  toast.info(`${action} on ${ids.length} items`)
                  } />
                
                  </div>
              }
              </div>
            </div>
          </div> :

        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-2xl w-full">
              <div className="h-16 w-16 bg-brand-navy/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building className="h-8 w-8 text-brand-navy" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                SETA Funded Programmes Dashboard
              </h2>
              <p className="text-gray-500 mb-8">
                Select a provider from the list to view detailed compliance
                status, learner progress, and submitted reports.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Funded Providers
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">18</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Total Learners
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">1,247</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Avg Compliance
                  </p>
                  <p className="text-2xl font-bold text-green-600 mt-1">87%</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-red-100 bg-red-50/50">
                  <p className="text-xs text-red-600 uppercase tracking-wide font-semibold">
                    Attention Required
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">4</p>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      {/* Learner Compliance Modal */}
      <Modal
        isOpen={!!selectedLearner}
        onClose={() => setSelectedLearner(null)}
        title="Learner Compliance Detail"
        size="lg">
        
        {selectedLearner &&
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center">
                <Avatar
                name={selectedLearner.name}
                size="lg"
                className="mr-4" />
              
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedLearner.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    ID: {selectedLearner.idNo}
                  </p>
                </div>
              </div>
              <Badge
              variant={
              selectedLearner.compliance === 'Compliant' ?
              'success' :
              'danger'
              }>
              
                {selectedLearner.compliance}
              </Badge>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Document Checklist</h4>
              <div className="grid grid-cols-1 gap-3">
                {[
              {
                label: 'Certified ID Document',
                status: 'Verified',
                date: '2025-05-20'
              },
              {
                label: 'Highest Qualification',
                status: 'Verified',
                date: '2025-05-20'
              },
              {
                label: 'Learner Agreement / Contract',
                status: 'Signed',
                date: '2025-06-01'
              },
              {
                label: 'Workplace Approval Form',
                status: 'Pending',
                date: '-'
              },
              {
                label: 'Disability Status Declaration',
                status: 'Verified',
                date: '2025-05-20'
              }].
              map((doc, i) =>
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                
                    <div className="flex items-center">
                      {doc.status === 'Verified' || doc.status === 'Signed' ?
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" /> :

                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-3" />
                  }
                      <span className="text-sm font-medium text-gray-700">
                        {doc.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-gray-500">{doc.date}</span>
                      <Badge
                    variant={
                    doc.status === 'Pending' ? 'warning' : 'success'
                    }
                    className="text-xs">
                    
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
              )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => toast.success('Downloading learner pack...')}>
              
                Download Learner Pack
              </Button>
              <div className="space-x-3">
                <Button
                variant="ghost"
                onClick={() => setSelectedLearner(null)}>
                
                  Close
                </Button>
                <Button
                leftIcon={<Mail className="h-4 w-4" />}
                onClick={() => {
                  toast.success('Request sent to provider');
                  setSelectedLearner(null);
                }}>
                
                  Request Missing Docs
                </Button>
              </div>
            </div>
          </div>
        }
      </Modal>
    </div>);

}