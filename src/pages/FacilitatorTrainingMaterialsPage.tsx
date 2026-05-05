import React, { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Upload,
  Bot,
  Search,
  FolderOpen,
  CheckCircle,
  Clock,
  Sparkles,
  Play,
  FileText,
  Headphones,
  TrendingUp,
  ClipboardList,
  Eye,
  Download,
  Edit,
  MoreVertical,
  LayoutGrid,
  List,
  RefreshCw,
  Printer,
  Share2 } from
'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FileUpload } from '../components/ui/FileUpload';

type TrainingMaterialsCard = {
  title: string;
  program: string;
  module: string;
  type: string;
  duration: string;
  metric: string;
  icon: ReactNode;
  bg: string;
  uploadDate: string;
  downloads: number;
};

export function FacilitatorTrainingMaterialsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showMaterialViewer, setShowMaterialViewer] = useState(false);
  const [showMaterialEditor, setShowMaterialEditor] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] =
    useState<TrainingMaterialsCard | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const stats = [
  {
    label: 'Total Materials',
    value: '156',
    icon: <FolderOpen className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'SETA Approved',
    value: '142',
    icon: <CheckCircle className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Pending Review',
    value: '8',
    icon: <Clock className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'AI Enhanced',
    value: '67',
    icon: <Bot className="h-5 w-5 text-gray-500" />
  }];

  const materials = [
  {
    title: 'Introduction to Programming',
    program: 'IT Skills Program',
    module: 'Module 1',
    type: 'Video',
    duration: '45 min',
    metric: '124 views',
    icon: <Play className="h-8 w-8 text-white" />,
    bg: 'bg-gray-700',
    uploadDate: '12 Jan 2026',
    downloads: 124
  },
  {
    title: 'Business Communication Guide',
    program: 'Business Administration',
    module: 'Module 2',
    type: 'PDF',
    duration: '32 pages',
    metric: '89 downloads',
    icon: <FileText className="h-8 w-8 text-white" />,
    bg: 'bg-gray-600',
    uploadDate: '05 Jan 2026',
    downloads: 89
  },
  {
    title: 'Safety Protocols Interactive',
    program: 'Workplace Safety',
    module: 'Module 1',
    type: 'Interactive',
    duration: '20 min',
    metric: '56 completions',
    icon: <Sparkles className="h-8 w-8 text-white" />,
    bg: 'bg-gray-700',
    uploadDate: '20 Dec 2025',
    downloads: 56
  },
  {
    title: 'Customer Service Audio Course',
    program: 'Business Administration',
    module: 'Module 3',
    type: 'Audio',
    duration: '1h 15min',
    metric: '78 listens',
    icon: <Headphones className="h-8 w-8 text-white" />,
    bg: 'bg-gray-600',
    uploadDate: '15 Dec 2025',
    downloads: 78
  },
  {
    title: 'Data Analysis Fundamentals',
    program: 'IT Skills Program',
    module: 'Module 4',
    type: 'Interactive',
    duration: '2h 30min',
    metric: '92 completions',
    icon: <TrendingUp className="h-8 w-8 text-white" />,
    bg: 'bg-gray-700',
    uploadDate: '10 Dec 2025',
    downloads: 92
  },
  {
    title: 'Project Management Checklist',
    program: 'Business Administration',
    module: 'Module 5',
    type: 'Document',
    duration: '8 pages',
    metric: '67 downloads',
    icon: <ClipboardList className="h-8 w-8 text-white" />,
    bg: 'bg-gray-600',
    uploadDate: '01 Dec 2025',
    downloads: 67
  }];

  const handleAddMaterial = () => {
    toast.success('Material uploaded successfully');
    setShowAddMaterial(false);
  };
  const openViewer = (material: TrainingMaterialsCard) => {
    setSelectedMaterial(material);
    setShowMaterialViewer(true);
  };
  const openEditor = (material: TrainingMaterialsCard) => {
    setSelectedMaterial(material);
    setShowMaterialEditor(true);
  };
  const unitStandardOptions = [
  {
    value: '',
    label: 'Select Unit Standard'
  },
  {
    value: 'us1',
    label: 'US 115753 - Use a GUI-based word processor'
  },
  {
    value: 'us2',
    label: 'US 115790 - Use electronic mail'
  },
  {
    value: 'us3',
    label: 'US 116940 - Apply computing fundamentals'
  },
  {
    value: 'us4',
    label: 'US 117924 - Database design'
  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Training Materials</h1>
        <p className="text-sm text-gray-500">
          Manage learning content and resources
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex space-x-3">
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddMaterial(true)}>
            
            Add Material
          </Button>
          <Button
            variant="outline"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => setShowBulkUploadModal(true)}>
            
            Bulk Upload
          </Button>
          <Button
            variant="outline"
            leftIcon={<Bot className="h-4 w-4" />}
            onClick={() => setShowAiModal(true)}>
            
            AI Recommendations
          </Button>
        </div>
        <div className="flex space-x-3">
          <div className="w-48">
            <Input
              placeholder="Search materials..."
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
              label: 'All Types'
            }]
            } />
          
        </div>
      </div>

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

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Learning Materials</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            
            <List className="h-4 w-4" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material, i) =>
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          
            <div
            className={`${material.bg} p-10 flex items-center justify-center`}>
            
              {material.icon}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-1">
                <h4 className="text-sm font-bold text-gray-900">
                  {material.title}
                </h4>
                <div className="flex space-x-1 text-gray-400 flex-shrink-0 ml-2">
                  <Eye className="h-3.5 w-3.5" />
                  <Download className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {material.program} • {material.module}
              </p>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>
                  {material.type} • {material.duration}
                </span>
                <span>{material.metric}</span>
              </div>
              <div className="flex items-center mt-3 space-x-2">
                <Button
                size="sm"
                className="flex-1"
                onClick={() => openViewer(material)}>
                
                  View Material
                </Button>
                <button
                className="p-1.5 text-gray-400 hover:text-gray-600"
                onClick={() => openEditor(material)}>
                
                  <Edit className="h-4 w-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Showing 1-6 of 156 materials
        </span>
        <div className="flex space-x-1">
          <Button variant="outline" size="sm">
            Previous
          </Button>
          <Button size="sm" className="bg-brand-navy text-white">
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>

      {/* Add Material Modal */}
      <Modal
        isOpen={showAddMaterial}
        onClose={() => setShowAddMaterial(false)}
        title="Add Training Material">
        
        <div className="space-y-4">
          <Input label="Material Title" placeholder="Enter material title" />
          <div className="grid grid-cols-2 gap-4">
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
              }]
              } />
            
            <Select
              label="Module"
              options={[
              {
                value: 'm1',
                label: 'Module 1'
              },
              {
                value: 'm2',
                label: 'Module 2'
              },
              {
                value: 'm3',
                label: 'Module 3'
              }]
              } />
            
          </div>
          <Select label="Unit Standard" options={unitStandardOptions} />
          <Select
            label="Material Type"
            options={[
            {
              value: 'video',
              label: 'Video'
            },
            {
              value: 'pdf',
              label: 'PDF Document'
            },
            {
              value: 'interactive',
              label: 'Interactive Content'
            },
            {
              value: 'audio',
              label: 'Audio'
            },
            {
              value: 'document',
              label: 'Document'
            }]
            } />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter material description"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File
            </label>
            <FileUpload onUpload={(files) => console.log(files)} />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddMaterial(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMaterial}>Upload Material</Button>
          </div>
        </div>
      </Modal>

      {/* Material Viewer Modal */}
      <Modal
        isOpen={showMaterialViewer}
        onClose={() => setShowMaterialViewer(false)}
        title={selectedMaterial?.title || 'Material Viewer'}
        size="xl">
        
        {selectedMaterial &&
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="neutral">{selectedMaterial.type}</Badge>
              <span className="text-sm text-gray-500">
                {selectedMaterial.program} • {selectedMaterial.module}
              </span>
            </div>
            <div
            className={`${selectedMaterial.bg} rounded-lg h-96 flex items-center justify-center`}>
            
              <div className="text-center text-white">
                {selectedMaterial.icon}
                <p className="mt-4 text-lg font-medium">Document Preview</p>
                <p className="text-sm opacity-75">{selectedMaterial.title}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium">{selectedMaterial.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-medium">
                  {selectedMaterial.duration}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Uploaded</p>
                <p className="text-sm font-medium">
                  {selectedMaterial.uploadDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Downloads</p>
                <p className="text-sm font-medium">
                  {selectedMaterial.downloads}
                </p>
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <Button
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => toast.success('Downloading...')}>
                
                  Download
                </Button>
                <Button
                variant="outline"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => toast.info('Printing...')}>
                
                  Print
                </Button>
                <Button
                variant="outline"
                leftIcon={<Share2 className="h-4 w-4" />}
                onClick={() => toast.info('Share link copied!')}>
                
                  Share
                </Button>
              </div>
              <Button
              variant="ghost"
              onClick={() => setShowMaterialViewer(false)}>
              
                Close
              </Button>
            </div>
          </div>
        }
      </Modal>

      {/* Material Editor Modal */}
      <Modal
        isOpen={showMaterialEditor}
        onClose={() => setShowMaterialEditor(false)}
        title="Edit Material"
        size="xl">
        
        {selectedMaterial &&
        <div className="space-y-4">
            <Input label="Title" defaultValue={selectedMaterial.title} />
            <div className="grid grid-cols-2 gap-4">
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
            
              <Select
              label="Module"
              options={[
              {
                value: 'm1',
                label: 'Module 1'
              },
              {
                value: 'm2',
                label: 'Module 2'
              },
              {
                value: 'm3',
                label: 'Module 3'
              },
              {
                value: 'm4',
                label: 'Module 4'
              },
              {
                value: 'm5',
                label: 'Module 5'
              }]
              } />
            
            </div>
            <Select label="Unit Standard" options={unitStandardOptions} />
            <Select
            label="Type"
            options={[
            {
              value: 'video',
              label: 'Video'
            },
            {
              value: 'pdf',
              label: 'PDF Document'
            },
            {
              value: 'interactive',
              label: 'Interactive Content'
            },
            {
              value: 'audio',
              label: 'Audio'
            },
            {
              value: 'document',
              label: 'Document'
            }]
            } />
          
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
              defaultValue={`Content for ${selectedMaterial.title}`}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700">
                  Current file:{' '}
                  {selectedMaterial.title.toLowerCase().replace(/\s+/g, '_')}.
                  {selectedMaterial.type.toLowerCase()}
                </span>
              </div>
              <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('File picker opened...')}>
              
                Replace File
              </Button>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button
              variant="ghost"
              onClick={() => setShowMaterialEditor(false)}>
              
                Cancel
              </Button>
              <Button
              onClick={() => {
                toast.success('Material updated successfully');
                setShowMaterialEditor(false);
              }}>
              
                Save Changes
              </Button>
            </div>
          </div>
        }
      </Modal>

      {/* AI Recommendations Modal */}
      <Modal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        title="AI Content Recommendations"
        size="lg">
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
            <Bot className="h-6 w-6 text-brand-blue mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-brand-blue">
                Content Gap Analysis
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Based on the current curriculum and learner performance, I've
                identified gaps in your training materials.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-lg flex justify-between items-center bg-white">
              <div>
                <h5 className="font-bold text-sm text-gray-900">
                  Advanced SQL Queries
                </h5>
                <p className="text-xs text-gray-500">
                  Learners are struggling with this topic in recent assessments.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  toast.success('Generating material...');
                  setShowAiModal(false);
                }}>
                
                Generate Guide
              </Button>
            </div>

            <div className="p-3 border border-gray-200 rounded-lg flex justify-between items-center bg-white">
              <div>
                <h5 className="font-bold text-sm text-gray-900">
                  Workplace Ethics Case Studies
                </h5>
                <p className="text-xs text-gray-500">
                  Missing practical examples for Module 3.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  toast.success('Generating material...');
                  setShowAiModal(false);
                }}>
                
                Generate Cases
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => setShowAiModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        title="Bulk Upload Materials">
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Drag and drop multiple files here
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Supports PDF, PPT, DOC, MP4 (Max 50MB per file)
            </p>
            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start">
            <Sparkles className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>AI Auto-Tagging:</strong> Files will be automatically
              analyzed and tagged with appropriate programs and modules based on
              their content.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowBulkUploadModal(false)}>
              
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Files queued for upload and processing');
                setShowBulkUploadModal(false);
              }}>
              
              Start Upload
            </Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                Learner IDs & Passports
              </p>
              <p className="text-sm text-slate-500">
                Required for SETA registration
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Missing (12)
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                Signed Enrollment Forms
              </p>
              <p className="text-sm text-slate-500">Pending signatures</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Pending (5)
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                Previous Qualifications
              </p>
              <p className="text-sm text-slate-500">Verification required</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents (8)
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Medical Certificates</p>
              <p className="text-sm text-slate-500">
                For special accommodations
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents (2)
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Learner Documents</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-sm font-medium text-slate-900">
                      Q1 Assessment Report
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  Mar 10, 2024
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="success">Verified</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument('Q1 Assessment Report');
                        setShowViewerModal(true);
                      }}>
                      
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.success('Downloading document...')}>
                      
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-sm font-medium text-slate-900">
                      Learner Attendance Register
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  Mar 15, 2024
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="success">Verified</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument('Learner Attendance Register');
                        setShowViewerModal(true);
                      }}>
                      
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.success('Downloading document...')}>
                      
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-sm font-medium text-slate-900">
                      Moderation Report - Module 2
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  Mar 10, 2024
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="warning">Pending Review</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument('Moderation Report - Module 2');
                        setShowViewerModal(true);
                      }}>
                      
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.success('Downloading document...')}>
                      
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Document">
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Document Type
            </label>
            <Select
              options={[
              {
                value: 'id',
                label: 'Learner ID / Passport'
              },
              {
                value: 'enrollment',
                label: 'Signed Enrollment Form'
              },
              {
                value: 'qualification',
                label: 'Previous Qualification'
              },
              {
                value: 'medical',
                label: 'Medical Certificate'
              },
              {
                value: 'other',
                label: 'Other'
              }]
              } />
            
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-2">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-slate-500">
              Supports PDF, JPG, PNG (Max 10MB)
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                toast.success('Document uploaded successfully');
                setShowUploadModal(false);
              }}>
              
              Browse Files
            </Button>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Document uploaded successfully');
                setShowUploadModal(false);
              }}>
              
              Upload Document
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        title={`Viewing: ${selectedDocument}`}
        size="lg">
        
        <div className="space-y-4">
          <div
            className="bg-slate-100 rounded-lg flex items-center justify-center"
            style={{
              height: '400px'
            }}>
            
            <div className="text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">
                {selectedDocument}.pdf
              </p>
              <p className="text-sm text-slate-500">
                Document preview would appear here
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowViewerModal(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success('Document downloaded');
                setShowViewerModal(false);
              }}>
              
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}