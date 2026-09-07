import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Download,
  UserPlus,
  Search,
  Bot,
  Eye,
  Edit,
  Mail,
  AlertTriangle,
  CheckCircle,
  Flag,
  MessageSquare,
  BookOpen } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { learnerService, programmeService } from '../services/api';
import { exportRecordsAsJson } from '../utils/exportData';
import { messagingService } from '../services/api';
import type { Learner, Programme } from '../types';

export type LearnerTableRow = {
  id: string;
  name: string;
  email: string;
  idNo: string;
  program: string;
  seta: string;
  progress: number;
  status: string;
  lastActive: string;
  aiRisk: string;
  programCount: number;
};

function displayStatus(s: Learner['status']): string {
  switch (s) {
    case 'at_risk':
      return 'At Risk';
    case 'completed':
      return 'Completed';
    case 'withdrawn':
      return 'Withdrawn';
    default:
      return 'Active';
  }
}

function aiRiskFromLearner(s: Learner['status']): string {
  if (s === 'completed') return 'N/A';
  if (s === 'at_risk') return 'High';
  return 'Low';
}

export function LearnersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAddLearner, setShowAddLearner] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState<LearnerTableRow | null>(
    null,
  );
  const [apiLearners, setApiLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMultiProgramOnly, setShowMultiProgramOnly] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    idNumber: '',
    phone: '',
    programmeId: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    idNumber: '',
    programmeId: '',
  });
  const [savingLearner, setSavingLearner] = useState(false);

  const reloadLearners = () => {
    setLoading(true);
    return learnerService
      .getAll()
      .then((res) => {
        setApiLearners(res.data);
        setLoadError(null);
      })
      .catch(() => setLoadError('Could not load learners'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([learnerService.getAll(), programmeService.getAll()])
      .then(([learnerRes, progRes]) => {
        if (!cancelled) {
          setApiLearners(learnerRes.data);
          setProgrammes(progRes.data ?? []);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load learners');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enrollmentCountByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of apiLearners) {
      m.set(l.userId, (m.get(l.userId) ?? 0) + 1);
    }
    return m;
  }, [apiLearners]);

  const learners: LearnerTableRow[] = useMemo(() => {
    return apiLearners.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      idNo: l.idNumber,
      program: l.programmeName,
      seta: '—',
      progress: l.progress,
      status: displayStatus(l.status),
      lastActive: l.lastActivity,
      aiRisk: aiRiskFromLearner(l.status),
      programCount: enrollmentCountByUser.get(l.userId) ?? 1,
    }));
  }, [apiLearners, enrollmentCountByUser]);

  const filteredLearners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = learners;
    if (showMultiProgramOnly) {
      rows = rows.filter((l) => l.programCount > 1);
    }
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.idNo.toLowerCase().includes(q),
    );
  }, [learners, searchQuery, showMultiProgramOnly]);

  const multiProgramLearners = useMemo(
    () => learners.filter((l) => l.programCount > 1).length,
    [learners],
  );

  const atRiskCount = useMemo(
    () => learners.filter((l) => l.status === 'At Risk').length,
    [learners],
  );

  const columns = [
  {
    header: 'LEARNER',
    accessorKey: 'name' as const,
    cell: (row: LearnerTableRow) =>
    <div
      className="flex items-center cursor-pointer hover:opacity-80"
      onClick={() => navigate(`/learner/${row.id}`)}>
      
          <Avatar name={row.name} className="mr-3" />
          <div>
            <div className="flex items-center">
              <span className="font-medium text-gray-900 hover:text-brand-blue hover:underline">
                {row.name}
              </span>
              {row.programCount > 1 &&
          <span
            className="ml-2 flex items-center text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium"
            title="Enrolled in multiple programs">
            
                  <Flag className="h-3 w-3 mr-0.5" />
                  Multi-Program
                </span>
          }
            </div>
            <div className="text-xs text-gray-500">{row.email}</div>
            <div className="text-xs text-gray-400">ID: {row.idNo}</div>
          </div>
        </div>

  },
  {
    header: 'PROGRAM',
    accessorKey: 'program' as const,
    cell: (row: LearnerTableRow) =>
    <div>
          <div className="text-sm font-medium text-gray-900">{row.program}</div>
          <div className="text-xs text-gray-500">{row.seta}</div>
        </div>

  },
  {
    header: 'PROGRESS',
    accessorKey: 'progress' as const,
    cell: (row: LearnerTableRow) =>
    <div className="w-full max-w-xs flex items-center">
          <div className="flex-1 mr-3">
            <ProgressBar value={row.progress} size="sm" />
          </div>
          <span className="text-xs font-medium text-gray-700">
            {row.progress}%
          </span>
        </div>

  },
  {
    header: 'STATUS',
    accessorKey: 'status' as const,
    cell: (row: LearnerTableRow) => {
      const variants: Record<string, 'success' | 'danger' | 'neutral'> = {
        Active: 'success',
        'At Risk': 'danger',
        Completed: 'neutral',
        Withdrawn: 'neutral',
      };
      return (
        <Badge variant={variants[row.status] ?? 'neutral'}>{row.status}</Badge>
      );
    }
  },
  {
    header: 'LAST ACTIVITY',
    accessorKey: 'lastActive' as const,
    cell: (row: LearnerTableRow) =>
    <span className="text-sm text-gray-500">{row.lastActive}</span>

  },
  {
    header: 'AI RISK',
    accessorKey: 'aiRisk' as const,
    cell: (row: LearnerTableRow) => {
      if (row.aiRisk === 'N/A')
      return <span className="text-xs text-gray-400">N/A</span>;
      return (
        <Badge
          variant={row.aiRisk === 'Low' ? 'success' : 'danger'}
          className="flex items-center w-fit">
          
            {row.aiRisk === 'High' ?
          <AlertTriangle className="h-3 w-3 mr-1" /> :

          <CheckCircle className="h-3 w-3 mr-1" />
          }
            {row.aiRisk}
          </Badge>);

    }
  },
  {
    header: 'ACTIONS',
    accessorKey: 'id' as const,
    cell: (row: LearnerTableRow) =>
    <div className="flex space-x-2 text-gray-400">
          <button
        className="hover:text-brand-blue"
        onClick={() => navigate(`/learner/${row.id}`)}>
        
            <Eye className="h-4 w-4" />
          </button>
          <button
        className="hover:text-brand-blue"
        onClick={() => {
          setSelectedLearner(row);
          openEditModal(row);
        }}>
        
            <Edit className="h-4 w-4" />
          </button>
          <button
        className="hover:text-brand-blue"
        onClick={() => navigate('/messages')}>
        
            <Mail className="h-4 w-4" />
          </button>
        </div>

  }];

  const programmeOptions = useMemo(
    () => [
      { value: 'all', label: 'All Programs' },
      ...programmes.map((p) => ({ value: p.id, label: p.title })),
    ],
    [programmes],
  );

  const handleAddLearner = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.programmeId) {
      toast.error('Name, email, and programme are required');
      return;
    }
    setSavingLearner(true);
    try {
      await learnerService.create({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        idNumber: addForm.idNumber.trim() || undefined,
        phone: addForm.phone.trim() || undefined,
        programmeId: addForm.programmeId,
      });
      toast.success('Learner added successfully');
      setShowAddLearner(false);
      setAddForm({ name: '', email: '', idNumber: '', phone: '', programmeId: '' });
      await reloadLearners();
    } catch {
      toast.error('Could not add learner');
    } finally {
      setSavingLearner(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedLearner) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSavingLearner(true);
    try {
      await learnerService.update(selectedLearner.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        idNumber: editForm.idNumber.trim() || undefined,
        programmeId: editForm.programmeId || undefined,
      });
      toast.success('Learner updated successfully');
      setShowEditModal(false);
      await reloadLearners();
    } catch {
      toast.error('Could not update learner');
    } finally {
      setSavingLearner(false);
    }
  };

  const openEditModal = (row: LearnerTableRow) => {
    const api = apiLearners.find((l) => l.id === row.id);
    setSelectedLearner(row);
    setEditForm({
      name: row.name,
      email: row.email,
      idNumber: row.idNo,
      programmeId: api?.programmeId ?? '',
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 text-center text-gray-700">
        <p className="mb-4">{loadError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Learner Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage learners across all programs and track their progress
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              exportRecordsAsJson('learners.json', filteredLearners, 'Learner export')
            }>
            
            Export
          </Button>
          <Button
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowAddLearner(true)}>
            
            Add Learner
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Filters &amp; Search
          </h3>
          <button
            className="text-sm text-brand-blue hover:underline"
            onClick={() => {
              setSearchQuery('');
              toast.success('Filters cleared');
            }}>
            
            Clear all
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1">
            <Input
              placeholder="Name, ID, or email..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <Select
              options={programmeOptions}
            />
            
          </div>
          <div className="col-span-1">
            <Select
              options={[
              {
                value: 'all',
                label: 'All Status'
              }]
              } />
            
          </div>
          <div className="col-span-1">
            <Select
              options={[
              {
                value: 'all',
                label: 'All SETAs'
              }]
              } />
            
          </div>
        </div>
      </Card>

      {/* Multi-Program Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-amber-600 mr-3" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">
              ⚠️ {multiProgramLearners} learner
              {multiProgramLearners === 1 ? '' : 's'}
            </span>{' '}
            enrolled in multiple programmes simultaneously
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowMultiProgramOnly(true)}>
          
          View Flagged
        </Button>
      </div>

      {/* AI Risk Assessment Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-brand-navy flex items-center justify-center mr-4">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center">
              <h4 className="text-sm font-bold text-gray-900 mr-2">
                AI Risk Assessment
              </h4>
              <Badge
                variant="info"
                className="bg-brand-navy text-white text-[10px] py-0 px-1">
                
                AI
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {atRiskCount} enrolment{atRiskCount === 1 ? '' : 's'} flagged at
              risk (from progress and activity in the system). Connect an
              analytics service for predictive scores.
            </p>
          </div>
        </div>
        <button
          className="text-sm font-medium text-brand-blue hover:text-blue-700 flex items-center"
          onClick={() => {
            setSelectedLearner(
              learners.find((l) => l.aiRisk === 'High') || learners[0]
            );
            setShowRiskModal(true);
          }}>
          
          View Details &gt;
        </button>
      </div>

      <Card title="Learners Overview" noPadding>
        <div className="p-4 border-b border-gray-100 flex justify-end">
          <span className="text-sm text-gray-500">
            Showing {filteredLearners.length} of {learners.length} enrolments
          </span>
        </div>
        <DataTable
          data={filteredLearners}
          columns={columns}
          keyField="id"
          selectable
        />
      </Card>

      <Modal
        isOpen={showAddLearner}
        onClose={() => setShowAddLearner(false)}
        title="Add New Learner">
        
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Enter learner's full name"
            value={addForm.name}
            onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            value={addForm.email}
            onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ID Number"
              placeholder="SA ID Number"
              value={addForm.idNumber}
              onChange={(e) => setAddForm((f) => ({ ...f, idNumber: e.target.value }))}
            />
            <Input
              label="Phone Number"
              placeholder="Enter phone number"
              value={addForm.phone}
              onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Select
            label="Programme"
            value={addForm.programmeId}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, programmeId: e.target.value }))
            }
            options={programmes.map((p) => ({ value: p.id, label: p.title }))}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddLearner(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLearner} disabled={savingLearner}>
              Add Learner
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Learner: ${selectedLearner?.name}`}>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ID Number
              </label>
              <Input
                value={editForm.idNumber}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, idNumber: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <Input
              value={editForm.email}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, email: e.target.value }))
              }
              type="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Programme
            </label>
            <Select
              value={editForm.programmeId}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, programmeId: e.target.value }))
              }
              options={programmes.map((p) => ({ value: p.id, label: p.title }))}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingLearner}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        title={`AI Risk Analysis: ${selectedLearner?.name}`}>
        
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
              <h4 className="font-medium text-amber-900">
                Risk Level:{' '}
                {selectedLearner?.status === 'At Risk' ? 'High' : 'Low'}
              </h4>
            </div>
            <p className="text-sm text-amber-800">
              Based on recent activity, this learner has a{' '}
              {selectedLearner?.status === 'At Risk' ? '78%' : '12%'}{' '}
              probability of falling behind in the next 30 days.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Key Factors</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                Missed 2 recent assignments
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                Login frequency decreased by 40% this week
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                High scores on previous module quizzes
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">
              Recommended Actions
            </h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowRiskModal(false);
                  setShowMessageModal(true);
                }}>
                
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Check-in Message
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowRiskModal(false);
                  navigate('/materials');
                  toast.info('Browse remedial materials in the library');
                }}>
                
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Remedial Materials
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowRiskModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={`Message ${selectedLearner?.name}`}>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject
            </label>
            <Input placeholder="Checking in on your progress" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Message
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent resize-none"
              placeholder="Hi there, I noticed you haven't logged in recently..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowMessageModal(false)}>
              
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const target = apiLearners.find((l) => l.id === selectedLearner?.id);
                if (!target?.userId || !messageBody.trim()) {
                  toast.error('Enter a message and select a learner');
                  return;
                }
                try {
                  await messagingService.send(target.userId, messageBody.trim());
                  toast.success('Message sent successfully');
                  setMessageBody('');
                  setShowMessageModal(false);
                } catch {
                  toast.error('Could not send message');
                }
              }}>
              
              <Mail className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}