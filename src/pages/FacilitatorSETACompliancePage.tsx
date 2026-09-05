import React, { useEffect, useMemo, useState } from 'react';
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
  Upload,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { FileUpload } from '../components/ui/FileUpload';
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
  Legend,
} from 'recharts';
import { complianceService, reportsService } from '../services/api';
import { triggerDownload } from '../utils/downloadJson';
import type {
  ComplianceDocument,
  DocumentStatus,
  SETASubmission,
  SubmissionStatus,
} from '../types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type DocRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  statusVariant: BadgeVariant;
  lastUpdated: string;
  expiry: string;
  fileUrl?: string;
};

type SubmissionRow = {
  id: string;
  type: string;
  ref: string;
  due: string;
  status: string;
  statusVariant: BadgeVariant;
  submittedBy: string;
  response: string;
  action: string;
  fileUrl?: string;
};

function formatDate(value?: string | null): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function mapDocStatus(status: DocumentStatus | string): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'verified':
    case 'approved':
      return { label: 'Verified', variant: 'success' };
    case 'pending_review':
      return { label: 'Pending Review', variant: 'warning' };
    case 'expiring_soon':
      return { label: 'Expiring Soon', variant: 'warning' };
    case 'expired':
      return { label: 'Expired', variant: 'danger' };
    case 'missing':
      return { label: 'Missing', variant: 'danger' };
    default:
      return { label: String(status).replace(/_/g, ' '), variant: 'neutral' };
  }
}

function mapSubmissionStatus(status: SubmissionStatus | string): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'submitted':
    case 'accepted':
      return { label: status === 'accepted' ? 'Accepted' : 'Submitted', variant: 'success' };
    case 'pending':
      return { label: 'Pending', variant: 'warning' };
    case 'overdue':
      return { label: 'Overdue', variant: 'danger' };
    case 'upcoming':
      return { label: 'Upcoming', variant: 'info' };
    case 'rejected':
      return { label: 'Rejected', variant: 'danger' };
    default:
      return { label: String(status), variant: 'neutral' };
  }
}

function toDocRow(doc: ComplianceDocument): DocRow {
  const mapped = mapDocStatus(doc.status);
  return {
    id: doc.id,
    name: doc.name,
    category: doc.category.replace(/^compliance[-_]?/i, '') || doc.category,
    status: mapped.label,
    statusVariant: mapped.variant,
    lastUpdated: formatDate(doc.lastUpdated || doc.updatedAt),
    expiry: formatDate(doc.expiryDate),
    fileUrl: doc.fileUrl,
  };
}

function toSubmissionRow(sub: SETASubmission): SubmissionRow {
  const mapped = mapSubmissionStatus(sub.status);
  const canView = Boolean(sub.fileUrl) || mapped.label === 'Submitted' || mapped.label === 'Accepted';
  return {
    id: sub.id,
    type: sub.type,
    ref: sub.reference,
    due: formatDate(sub.dueDate),
    status: mapped.label,
    statusVariant: mapped.variant,
    submittedBy: sub.submittedBy || '-',
    response: sub.setaResponse || '-',
    action: canView ? 'View Details' : 'Submit',
    fileUrl: sub.fileUrl,
  };
}

export function FacilitatorSETACompliancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [showDocFilters, setShowDocFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('all');
  const [docStatusFilter, setDocStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [documentsApi, setDocumentsApi] = useState<ComplianceDocument[]>([]);
  const [submissionsApi, setSubmissionsApi] = useState<SETASubmission[]>([]);
  const [snapshot, setSnapshot] = useState<{
    enrollments: number;
    docs: number;
    assessments: number;
  } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('compliance');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents' },
    { id: 'submissions', label: 'Submissions' },
    { id: 'audits', label: 'Audits & Verifications' },
  ];

  const loadCompliance = async () => {
    setLoading(true);
    try {
      const [docsRes, subsRes, snapRes] = await Promise.all([
        complianceService.getDocuments(),
        complianceService.getSubmissions(),
        reportsService.getSetaSnapshot().catch(() => null),
      ]);
      setDocumentsApi(docsRes.data ?? []);
      setSubmissionsApi(subsRes.data ?? []);
      if (snapRes?.data) {
        setSnapshot({
          enrollments: snapRes.data.enrollments,
          docs: snapRes.data.docs,
          assessments: snapRes.data.assessments,
        });
      }
    } catch {
      toast.error('Could not load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompliance();
  }, []);

  const documents = useMemo(
    () => documentsApi.map(toDocRow),
    [documentsApi],
  );

  const submissions = useMemo(
    () => submissionsApi.map(toSubmissionRow),
    [submissionsApi],
  );

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesSearch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q);
      const matchesCategory =
        docCategoryFilter === 'all' ||
        doc.category.toLowerCase().includes(docCategoryFilter.toLowerCase());
      const matchesStatus =
        docStatusFilter === 'all' ||
        doc.status.toLowerCase().includes(docStatusFilter.replace(/_/g, ' '));
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [documents, searchQuery, docCategoryFilter, docStatusFilter]);

  const verifiedDocs = documents.filter((d) => d.status === 'Verified').length;
  const pendingDocs = documents.filter((d) =>
    d.status.toLowerCase().includes('pending'),
  ).length;
  const gapDocs = documents.filter((d) =>
    ['Missing', 'Expired', 'Expiring Soon'].includes(d.status),
  ).length;
  const compliancePct =
    documents.length === 0
      ? 0
      : Math.round((verifiedDocs / documents.length) * 100);

  const upcomingSubs = submissions.filter((s) =>
    ['Pending', 'Upcoming'].includes(s.status),
  ).length;
  const overdueSubs = submissions.filter((s) => s.status === 'Overdue').length;
  const completedSubs = submissions.filter((s) =>
    ['Submitted', 'Accepted'].includes(s.status),
  ).length;

  const stats = [
    {
      label: 'Overall Compliance',
      value: `${compliancePct}%`,
      sub:
        documents.length === 0
          ? 'No documents yet'
          : compliancePct >= 80
            ? 'Good Standing'
            : 'Needs Attention',
      subColor: compliancePct >= 80 ? 'text-green-600' : 'text-amber-600',
      icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
    },
    {
      label: 'Upcoming Deadlines',
      value: String(upcomingSubs),
      sub: 'Pending / upcoming submissions',
      subColor: 'text-amber-600',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
    },
    {
      label: 'Compliance Gaps',
      value: String(gapDocs + overdueSubs),
      sub: 'Missing docs or overdue items',
      subColor: 'text-red-600',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
    },
    {
      label: 'Tracked Records',
      value: String(snapshot?.docs ?? documents.length),
      sub: snapshot
        ? `${snapshot.enrollments} enrolments · ${snapshot.assessments} assessments`
        : `${submissions.length} SETA submissions`,
      subColor: 'text-blue-600',
      icon: <Bell className="h-5 w-5 text-blue-500" />,
    },
  ];

  const compliancePieData = [
    { name: 'Compliant', value: verifiedDocs || (documents.length === 0 ? 1 : 0), color: '#10b981' },
    { name: 'Pending', value: pendingDocs, color: '#f59e0b' },
    { name: 'Non-Compliant', value: gapDocs, color: '#ef4444' },
  ].filter((d) => d.value > 0);
  const pieData =
    compliancePieData.length > 0
      ? compliancePieData
      : [{ name: 'No data', value: 1, color: '#d1d5db' }];

  const submissionsChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = months.map((month) => ({ month, compliant: 0, pending: 0 }));
    for (const sub of submissionsApi) {
      const d = new Date(sub.dueDate || sub.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const bucket = buckets[d.getMonth()];
      if (['submitted', 'accepted'].includes(sub.status)) bucket.compliant += 1;
      else bucket.pending += 1;
    }
    const withData = buckets.filter((b) => b.compliant + b.pending > 0);
    return withData.length > 0 ? withData : buckets.slice(0, 6);
  }, [submissionsApi]);

  const complianceItems = useMemo(() => {
    if (documents.length === 0) {
      return [
        {
          label: 'Compliance documents',
          desc: 'Upload required SETA documentation to start tracking',
          ok: false,
        },
      ];
    }
    return documents.slice(0, 6).map((doc) => ({
      label: doc.name,
      desc: `${doc.category} · ${doc.status}`,
      ok: doc.status === 'Verified',
    }));
  }, [documents]);

  const actionItems = useMemo(() => {
    const fromSubs = submissions
      .filter((s) => ['Pending', 'Overdue', 'Upcoming'].includes(s.status))
      .slice(0, 5)
      .map((s) => ({
        task: s.type,
        due: s.due,
        priority: s.status === 'Overdue' ? 'High' : s.status === 'Pending' ? 'Medium' : 'Low',
        priorityColor:
          s.status === 'Overdue'
            ? 'bg-red-100 text-red-700'
            : s.status === 'Pending'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-blue-100 text-blue-700',
        assigned: s.submittedBy !== '-' ? s.submittedBy : 'Unassigned',
        done: false,
      }));
    const fromGaps = documents
      .filter((d) => ['Missing', 'Expired', 'Expiring Soon', 'Pending Review'].includes(d.status))
      .slice(0, 3)
      .map((d) => ({
        task: `Update ${d.name}`,
        due: d.expiry !== 'N/A' ? d.expiry : d.lastUpdated,
        priority: d.status === 'Missing' || d.status === 'Expired' ? 'High' : 'Medium',
        priorityColor:
          d.status === 'Missing' || d.status === 'Expired'
            ? 'bg-red-100 text-red-700'
            : 'bg-amber-100 text-amber-700',
        assigned: 'Facilitator',
        done: false,
      }));
    return [...fromSubs, ...fromGaps].slice(0, 6);
  }, [documents, submissions]);

  const audits = submissions.map((s) => ({
    type: s.type,
    ref: s.ref,
    date: s.due,
    status: s.status,
    conductor: s.submittedBy,
    outcome: s.response === '-' ? s.status : s.response,
    outcomeVariant: s.statusVariant,
    fileUrl: s.fileUrl,
  }));

  const verificationReqs = [
    {
      label: 'Compliance documents on file',
      status: documents.length > 0 ? 'Complete' : 'Partial',
    },
    {
      label: 'SETA / NLRD submissions',
      status: submissions.length > 0 ? 'Complete' : 'Partial',
    },
    {
      label: 'Verified documents',
      status: verifiedDocs > 0 ? 'Complete' : 'Partial',
    },
    {
      label: 'Pending document reviews',
      status: pendingDocs === 0 && documents.length > 0 ? 'Complete' : 'Partial',
    },
  ];

  const recentFindings = submissions.slice(0, 6).map((s) => ({
    title: `${s.type} — ${s.ref}`,
    badge: s.status,
    badgeVariant: s.statusVariant,
    desc: s.response !== '-' ? s.response : `Due ${s.due}. Submitted by ${s.submittedBy}.`,
  }));

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await complianceService.exportSETA('mict-seta', 'pdf');
      toast.success(
        res.data?.url
          ? `SETA export ready: ${res.data.url}`
          : 'SETA export generated',
      );
    } catch {
      toast.error('SETA export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      toast.error('Choose a file to upload');
      return;
    }
    if (!uploadName.trim()) {
      toast.error('Document name is required');
      return;
    }
    setUploading(true);
    try {
      await complianceService.uploadDocument(uploadFile, {
        name: uploadName.trim(),
        category: uploadCategory.startsWith('compliance')
          ? uploadCategory
          : `compliance-${uploadCategory}`,
        status: 'pending_review',
      });
      toast.success('Document uploaded');
      setUploadOpen(false);
      setUploadFile(null);
      setUploadName('');
      setUploadCategory('compliance');
      await loadCompliance();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openDocUrl = (url?: string, label = 'document') => {
    if (!url || url === '/materials/placeholder') {
      toast.info(`No file URL available for this ${label}`);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
    <>
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
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
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
            onClick={() => void handleExport()}
            isLoading={exporting}>
            
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
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}>
                  
                    {pieData.map((entry, i) =>
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
              onClick={() => setUploadOpen(true)}>
              
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
              setDocCategoryFilter('all');
              setDocStatusFilter('all');
              setSearchQuery('');
              toast.success('Filters cleared');
              setShowDocFilters(false);
            }}>
              
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
              value={docCategoryFilter}
              onChange={(e) => setDocCategoryFilter(e.target.value)}
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
              },
              {
                value: 'accreditation',
                label: 'Accreditation'
              },
              {
                value: 'moderation',
                label: 'Moderation'
              }]
              } />
            
                <Select
              value={docStatusFilter}
              onChange={(e) => setDocStatusFilter(e.target.value)}
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
                value: 'pending',
                label: 'Pending'
              },
              {
                value: 'missing',
                label: 'Missing'
              },
              {
                value: 'expiring',
                label: 'Expiring'
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
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-sm text-gray-500 text-center">
                        Loading documents…
                      </td>
                    </tr>
                  ) : filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-sm text-gray-500 text-center">
                        No compliance documents yet. Upload the first one to get started.
                      </td>
                    </tr>
                  ) : (
                  filteredDocuments.map((doc) =>
                <tr key={doc.id} className="hover:bg-gray-50">
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
                        onClick={() => openDocUrl(doc.fileUrl, 'document')}>
                        
                            View
                          </button>
                          <button
                        className="text-brand-blue hover:underline"
                        onClick={() => {
                          setUploadName(doc.name);
                          setUploadCategory(
                            doc.category.toLowerCase().includes('compliance')
                              ? doc.category
                              : `compliance-${doc.category.toLowerCase()}`,
                          );
                          setUploadOpen(true);
                        }}>
                        
                            Update
                          </button>
                          <button
                        className="text-brand-blue hover:underline"
                        onClick={() => openDocUrl(doc.fileUrl, 'download')}>
                        
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
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
            onClick={() => {
              setActiveTab('submissions');
              toast.info('Review upcoming SETA submissions below');
            }}>
            
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
                <p className="text-3xl font-bold text-green-700">{completedSubs}</p>
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
                <p className="text-3xl font-bold text-amber-700">{upcomingSubs}</p>
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
                <p className="text-3xl font-bold text-red-700">{overdueSubs}</p>
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
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-sm text-gray-500 text-center">
                        Loading submissions…
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-sm text-gray-500 text-center">
                        No SETA submissions recorded yet.
                      </td>
                    </tr>
                  ) : (
                  submissions.map((sub) =>
                <tr key={sub.id} className="hover:bg-gray-50">
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
                      variant="primary"
                      onClick={() => {
                        if (sub.action === 'View Details') {
                          openDocUrl(sub.fileUrl, 'submission');
                        } else {
                          setUploadName(sub.type);
                          setUploadCategory('seta-submission');
                          setUploadOpen(true);
                        }
                      }}>
                      
                          {sub.action}
                        </Button>
                      </td>
                    </tr>
                ))}
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
            onClick={() => {
              setActiveTab('audits');
              toast.info('Review audit and verification details below');
            }}>
            
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
                onClick={() => {
                  setActiveTab('documents');
                  toast.info('Upload and verify required compliance documents');
                }}>
                
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
                      onClick={() => {
                        if (audit.fileUrl) {
                          window.open(audit.fileUrl, '_blank', 'noopener');
                          return;
                        }
                        void reportsService
                          .downloadSnapshot('pdf')
                          .then((file) =>
                            triggerDownload(
                              file.blob,
                              file.filename || 'seta-report.pdf',
                            ),
                          )
                          .catch(() => toast.error('Could not open report'));
                      }}>
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
    </div>

      <Modal
        isOpen={uploadOpen}
        onClose={() => {
          if (uploading) return;
          setUploadOpen(false);
        }}
        title="Upload compliance document"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={() => void handleUploadSubmit()} isLoading={uploading}>
              Upload
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <Input
            label="Document name"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="e.g. Facilitator Accreditation"
          />
          <Select
            label="Category"
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            options={[
              { value: 'compliance', label: 'General compliance' },
              { value: 'compliance-registration', label: 'Registration' },
              { value: 'compliance-accreditation', label: 'Accreditation' },
              { value: 'compliance-assessment', label: 'Assessment' },
              { value: 'compliance-moderation', label: 'Moderation' },
              { value: 'seta-submission', label: 'SETA submission' },
            ]}
          />
          <FileUpload
            multiple={false}
            maxSizeMB={25}
            accept=".pdf,.doc,.docx,.jpg,.png"
            onUpload={(files) => setUploadFile(files[0] ?? null)}
          />
          {uploadFile && (
            <p className="text-xs text-gray-500">Selected: {uploadFile.name}</p>
          )}
        </div>
      </Modal>
    </>
  );
}