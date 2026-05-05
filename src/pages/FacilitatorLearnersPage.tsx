import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  Eye,
  MoreVertical,
  AlertTriangle,
  ShieldCheck,
  Mail } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
export function FacilitatorLearnersPage() {
  const navigate = useNavigate();
  const [showAddLearner, setShowAddLearner] = useState(false);
  const [showBulkImportModal, setShowBulkUploadModal] = useState(false);
  const stats = [
  {
    label: 'Total Learners',
    value: '247',
    icon: <Users className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Active',
    value: '189',
    icon: <UserPlus className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Completed',
    value: '42',
    icon: <ShieldCheck className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'At Risk',
    value: '16',
    icon: <AlertTriangle className="h-5 w-5 text-gray-500" />
  }];

  const learners = [
  {
    id: 1,
    name: 'Thandi Mokoena',
    email: 'thandi.mokoena@email.com',
    program: 'IT Skills Program',
    level: 'Level 4 NQF',
    progress: 75,
    setaStatus: 'Compliant',
    setaVariant: 'success' as const,
    lastActivity: '2 hours ago',
    lastAction: 'Assessment submission'
  },
  {
    id: 2,
    name: 'Michael Ndaba',
    email: 'michael.ndaba@email.com',
    program: 'Business Administration',
    level: 'Level 3 NQF',
    progress: 100,
    setaStatus: 'Completed',
    setaVariant: 'success' as const,
    lastActivity: '4 hours ago',
    lastAction: 'Module completion'
  },
  {
    id: 3,
    name: 'Nomsa Khumalo',
    email: 'nomsa.khumalo@email.com',
    program: 'Workplace Safety',
    level: 'Level 2 NQF',
    progress: 45,
    setaStatus: 'Documents Pending',
    setaVariant: 'warning' as const,
    lastActivity: '6 hours ago',
    lastAction: 'Help request'
  },
  {
    id: 4,
    name: 'Sipho Mthembu',
    email: 'sipho.mthembu@email.com',
    program: 'IT Skills Program',
    level: 'Level 4 NQF',
    progress: 62,
    setaStatus: 'Compliant',
    setaVariant: 'success' as const,
    lastActivity: '1 day ago',
    lastAction: 'Module progress'
  }];

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };
  const handleAddLearner = () => {
    toast.success('Learner added successfully');
    setShowAddLearner(false);
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learner Management</h1>
        <p className="text-sm text-gray-500">
          Manage and track learner progress
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex space-x-3">
          <Button
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowAddLearner(true)}>
            
            Add Learner
          </Button>
          <Button
            variant="outline"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => setShowBulkUploadModal(true)}>
            
            Bulk Import
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => toast.success('Exporting learner data...')}>
            
            Export
          </Button>
        </div>
        <div className="flex space-x-3">
          <div className="w-56">
            <Input
              placeholder="Search learners..."
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

      {/* Learners List */}
      <Card noPadding>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Learners List</h3>
          <div className="flex space-x-2 text-gray-400">
            <button className="hover:text-gray-600">
              <Users className="h-5 w-5" />
            </button>
            <button className="hover:text-gray-600">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Learner</th>
                <th className="text-left px-6 py-3">Program</th>
                <th className="text-left px-6 py-3">Progress</th>
                <th className="text-left px-6 py-3">SETA Status</th>
                <th className="text-left px-6 py-3">Last Activity</th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {learners.map((learner) =>
              <tr key={learner.id} className="hover:bg-gray-50">
                  <td
                  className="px-6 py-4 cursor-pointer"
                  onClick={() => navigate(`/learner/${learner.id}`)}>
                  
                    <div className="flex items-center">
                      <Avatar name={learner.name} className="h-10 w-10 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-brand-blue hover:underline">
                          {learner.name}
                        </p>
                        <p className="text-xs text-gray-500">{learner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-brand-blue">
                      {learner.program}
                    </p>
                    <p className="text-xs text-gray-500">{learner.level}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                        className={`h-full rounded-full ${getProgressColor(learner.progress)}`}
                        style={{
                          width: `${learner.progress}%`
                        }} />
                      
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {learner.progress}%
                      </span>
                      {learner.progress === 100 &&
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    }
                      {learner.progress < 50 &&
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={learner.setaVariant}>
                      {learner.setaStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">
                      {learner.lastActivity}
                    </p>
                    <p className="text-xs text-gray-500">
                      {learner.lastAction}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                      className="text-gray-400 hover:text-brand-blue"
                      onClick={() => navigate(`/learner/${learner.id}`)}>
                      
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                      className="text-gray-400 hover:text-brand-blue"
                      onClick={() => navigate('/messages')}>
                      
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                      className="text-gray-400 hover:text-brand-blue"
                      onClick={() =>
                      toast.info(`Viewing options for ${learner.name}`)
                      }>
                      
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Showing 1-4 of 247 learners
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
      </Card>

      <Modal
        isOpen={showAddLearner}
        onClose={() => setShowAddLearner(false)}
        title="Add New Learner">
        
        <div className="space-y-4">
          <Input label="Full Name" placeholder="Enter learner's full name" />
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="ID Number" placeholder="SA ID Number" />
            <Input label="Phone Number" placeholder="Enter phone number" />
          </div>
          <Select
            label="Programme"
            options={[
            {
              value: 'it',
              label: 'IT Skills Program'
            },
            {
              value: 'business',
              label: 'Business Administration'
            },
            {
              value: 'safety',
              label: 'Workplace Safety'
            }]
            } />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="NQF Level"
              options={[
              {
                value: '2',
                label: 'Level 2'
              },
              {
                value: '3',
                label: 'Level 3'
              },
              {
                value: '4',
                label: 'Level 4'
              },
              {
                value: '5',
                label: 'Level 5'
              }]
              } />
            
            <Input label="Expected Completion" type="date" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddLearner(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLearner}>Add Learner</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkUploadModal(false)}
        title="Bulk Import Learners">
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
            <h4 className="text-sm font-bold text-brand-blue mb-1">
              Instructions
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Upload a CSV or Excel file containing learner details. Ensure your
              file matches the required template format.
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => toast.success('Template downloaded')}>
              
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Drag and drop your CSV/Excel file here
            </p>
            <p className="text-xs text-gray-500 mb-4">Max file size: 10MB</p>
            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowBulkUploadModal(false)}>
              
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Learners imported successfully');
                setShowBulkUploadModal(false);
              }}>
              
              Import Learners
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}