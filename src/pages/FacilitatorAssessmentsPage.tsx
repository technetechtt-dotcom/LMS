import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Bot,
  Download,
  Search,
  FileCheck,
  CheckCircle,
  TrendingUp,
  Eye,
  MoreVertical } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
export function FacilitatorAssessmentsPage() {
  const navigate = useNavigate();
  const [showAiModal, setShowAiModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const stats = [
  {
    label: 'Total Assessments',
    value: '47',
    icon: <FileCheck className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Active Assessments',
    value: '12',
    icon: <CheckCircle className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Avg. Pass Rate',
    value: '78%',
    icon: <TrendingUp className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'AI Generated',
    value: '23',
    icon: <Bot className="h-5 w-5 text-gray-500" />
  }];

  const assessments = [
  {
    id: 1,
    title: 'Programming Fundamentals Quiz',
    status: 'Active',
    statusVariant: 'success' as const,
    program: 'IT Skills Program',
    module: 'Module 1',
    questions: 20,
    format: 'Multiple Choice',
    created: 'Jan 15, 2025',
    due: 'Feb 15, 2025',
    attempts: '89/120 learners',
    passRate: '82%',
    action: 'View Results',
    actionVariant: 'primary'
  },
  {
    id: 2,
    title: 'Business Communication Assessment',
    status: 'Draft',
    statusVariant: 'neutral' as const,
    program: 'Business Administration',
    module: 'Module 2',
    questions: 15,
    format: 'Mixed Format',
    created: 'Jan 18, 2025',
    due: 'Not Set',
    attempts: 'Status: Under Review',
    passRate: 'Estimated Time: 45 min',
    action: 'Continue Editing',
    actionVariant: 'outline'
  },
  {
    id: 3,
    title: 'Safety Protocol Practical Assessment',
    status: 'Scheduled',
    statusVariant: 'info' as const,
    program: 'Workplace Safety',
    module: 'Module 1',
    questions: null,
    format: 'Practical Evaluation • On-site Required',
    created: 'Jan 12, 2025',
    due: 'Scheduled: Jan 25, 2025',
    attempts: 'Registered: 34 learners',
    passRate: 'Duration: 2 hours',
    action: 'Manage Schedule',
    actionVariant: 'primary'
  },
  {
    id: 4,
    title: 'Data Analysis Final Project',
    status: 'Overdue',
    statusVariant: 'danger' as const,
    program: 'IT Skills Program',
    module: 'Module 4',
    questions: null,
    format: 'Project Submission • Portfolio Assessment',
    created: 'Dec 20, 2024',
    due: 'Due: Jan 20, 2025',
    attempts: 'Submitted: 67/95 learners',
    passRate: 'Avg Score: 74%',
    action: 'Review Submissions',
    actionVariant: 'primary'
  },
  {
    id: 5,
    title: 'Customer Service Role-Play Assessment',
    status: 'Completed',
    statusVariant: 'success' as const,
    program: 'Business Administration',
    module: 'Module 3',
    questions: null,
    format: 'Oral Assessment • Video Submission',
    created: 'Dec 15, 2024',
    due: 'Completed: Jan 10, 2025',
    attempts: 'Participants: 78/78 learners',
    passRate: 'Pass Rate: 91%',
    action: 'View Report',
    actionVariant: 'outline'
  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
        <p className="text-sm text-gray-500">
          Manage assessments and track learner performance
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex space-x-3">
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/assessment-builder')}>
            
            Create Assessment
          </Button>
          <Button
            variant="outline"
            leftIcon={<Bot className="h-4 w-4" />}
            onClick={() => setShowAiModal(true)}>
            
            AI Question Generator
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => toast.success('Exporting assessment results...')}>
            
            Export Results
          </Button>
        </div>
        <div className="flex space-x-3">
          <div className="w-48">
            <Input
              placeholder="Search assessments..."
              icon={<Search className="h-4 w-4" />} />
            
          </div>
          <Select
            options={[
            {
              value: 'all',
              label: 'All Programs'
            }]
            } />
          
          <Select
            options={[
            {
              value: 'all',
              label: 'All Status'
            }]
            } />
          
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) =>
        <div
          key={i}
          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
          
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
            </div>
            <div className="p-2 bg-gray-50 rounded-full">{stat.icon}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
        {
          id: 'all',
          label: 'All Assessments'
        },
        {
          id: 'pending',
          label: 'Pending Review'
        },
        {
          id: 'seta',
          label: 'SETA Compliance'
        },
        {
          id: 'results',
          label: 'Results Analysis'
        }]
        }
        activeTab={activeTab}
        onChange={setActiveTab} />
      

      {/* Assessment List */}
      <div className="space-y-0">
        {assessments.map((assessment) =>
        <div
          key={assessment.id}
          className="bg-white p-6 border border-gray-200 border-b-0 last:border-b first:rounded-t-lg last:rounded-b-lg">
          
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-bold text-gray-900">
                    {assessment.title}
                  </h4>
                  <Badge variant={assessment.statusVariant}>
                    {assessment.status}
                  </Badge>
                  {assessment.status === 'Active' &&
                <>
                      <Bot className="h-4 w-4 text-gray-400" />
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </>
                }
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {assessment.program} • {assessment.module}
                  {assessment.questions &&
                ` • ${assessment.questions} Questions`}
                  {` • ${assessment.format}`}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  <span>Created: {assessment.created}</span>
                  <span>{assessment.due}</span>
                  <span>{assessment.attempts}</span>
                  <span>{assessment.passRate}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                variant={
                assessment.actionVariant === 'primary' ?
                'primary' :
                'outline'
                }
                size="sm"
                onClick={() => {
                  if (
                  assessment.action === 'View Results' ||
                  assessment.action === 'Review Submissions')
                  {
                    navigate(`/assessment/${assessment.id}/submissions`);
                  } else if (assessment.action === 'Continue Editing') {
                    navigate(`/assessment-builder/${assessment.id}`);
                  } else {
                    toast.info(
                      `Opening ${assessment.action.toLowerCase()}...`
                    );
                  }
                }}>
                
                  {assessment.action}
                </Button>
                <button
                className="p-1 text-gray-400 hover:text-gray-600"
                onClick={() => toast.info('Opening preview...')}>
                
                  <Eye className="h-4 w-4" />
                </button>
                <button
                className="p-1 text-gray-400 hover:text-gray-600"
                onClick={() => toast.info(`Options for ${assessment.title}`)}>
                
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Showing 1-5 of 47 assessments
        </span>
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Previous page')}>
            
            Previous
          </Button>
          <Button size="sm" className="bg-brand-navy text-white">
            1
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Page 2')}>
            
            2
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Page 3')}>
            
            3
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Next page')}>
            
            Next
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/assessment-builder')}
            className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center hover:border-brand-navy transition-all">
            
            <Plus className="h-5 w-5 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">
              New Assessment
            </span>
          </button>
          <button
            onClick={() => setShowAiModal(true)}
            className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center hover:border-brand-navy transition-all">
            
            <Bot className="h-5 w-5 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">
              AI Generator
            </span>
          </button>
          <button
            onClick={() => toast.success('Exporting all results...')}
            className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center hover:border-brand-navy transition-all">
            
            <Download className="h-5 w-5 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">
              Export All
            </span>
          </button>
          <button
            onClick={() => navigate('/facilitator-seta-compliance')}
            className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center hover:border-brand-navy transition-all">
            
            <FileCheck className="h-5 w-5 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">
              SETA Report
            </span>
          </button>
        </div>
      </Card>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Bot className="h-4 w-4" />}
          onClick={() => setShowAiModal(true)}>
          
          Generate Questions
        </Button>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Exporting assessment results...')}>
            
            Export Results
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        title="AI Question Generator"
        size="lg">
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
            <Bot className="h-6 w-6 text-brand-blue mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-brand-blue">
                AI Assistant
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                I can generate assessment questions based on your unit standards
                and course materials. What topic would you like to cover?
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic or Unit Standard
            </label>
            <Input placeholder="e.g. Database Normalization" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Question Type"
              options={[
              {
                value: 'mcq',
                label: 'Multiple Choice'
              },
              {
                value: 'essay',
                label: 'Essay'
              },
              {
                value: 'practical',
                label: 'Practical Task'
              }]
              } />
            
            <Select
              label="Difficulty Level"
              options={[
              {
                value: 'easy',
                label: 'NQF Level 3 (Easy)'
              },
              {
                value: 'medium',
                label: 'NQF Level 4 (Medium)'
              },
              {
                value: 'hard',
                label: 'NQF Level 5 (Hard)'
              }]
              } />
            
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Questions
            </label>
            <Input type="number" defaultValue="5" min="1" max="20" />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setShowAiModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Generated 5 questions successfully');
                setShowAiModal(false);
                navigate('/assessment-builder');
              }}>
              
              Generate & Edit
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}