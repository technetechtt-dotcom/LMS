import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  PlayCircle,
  Star,
  ShieldCheck,
  Download,
  Plus,
  Search,
  FileCheck,
  Eye } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { StatCard } from '../components/dashboard/StatCard';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';

type FacilitatorDirectoryRow = {
  id: number;
  name: string;
  email: string;
  programs: string;
  seta: string;
  learners: number;
  rating: number;
  expiry?: string;
};

type AssessorDirectoryRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  programs: string;
  regNo: string;
  status: string;
  expiry?: string;
};

type SelectedStaffProfile = FacilitatorDirectoryRow | AssessorDirectoryRow;

export function FacilitatorsPage() {
  const navigate = useNavigate();
  const [showAddFacilitator, setShowAddFacilitator] = useState(false);
  const [showAddAssessor, setShowAddAssessor] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedFacilitator, setSelectedFacilitator] =
    useState<SelectedStaffProfile | null>(null);
  const [activeTab, setActiveTab] = useState('facilitators');
  const stats = [
  {
    title: 'Total Facilitators',
    value: '18',
    icon: <Users className="h-6 w-6" />,
    trend: {
      value: 2,
      label: 'new this month',
      direction: 'up' as const
    }
  },
  {
    title: 'Active Sessions',
    value: '34',
    icon: <PlayCircle className="h-6 w-6" />,
    trend: {
      value: 12,
      label: 'scheduled today',
      direction: 'neutral' as const
    }
  },
  {
    title: 'Avg Rating',
    value: '4.6',
    icon: <Star className="h-6 w-6" />,
    trend: {
      value: 0.2,
      label: 'from last quarter',
      direction: 'up' as const
    }
  },
  {
    title: 'Compliance Rate',
    value: '96%',
    icon: <ShieldCheck className="h-6 w-6" />,
    trend: {
      value: 1,
      label: 'pending verification',
      direction: 'neutral' as const
    }
  }];

  const facilitators = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@skillforge.co.za',
    programs: 'IT Skills Program',
    seta: 'MICT SETA',
    learners: 28,
    rating: 4.8
  },
  {
    id: 2,
    name: 'Michael van der Merwe',
    email: 'michael.vdm@skillforge.co.za',
    programs: 'Manufacturing Learnership',
    seta: 'Manufacturing SETA',
    learners: 22,
    rating: 4.5
  },
  {
    id: 3,
    name: 'Nomsa Mthembu',
    email: 'nomsa.mthembu@skillforge.co.za',
    programs: 'Business Administration',
    seta: 'Services SETA',
    learners: 19,
    rating: 4.7
  },
  {
    id: 4,
    name: 'David Patel',
    email: 'david.patel@skillforge.co.za',
    programs: 'IT Skills Program',
    seta: 'MICT SETA',
    learners: 31,
    rating: 4.3
  }];

  const assessors = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@skillforge.co.za',
    role: 'Assessor',
    programs: 'IT Skills Program, Business Administration',
    regNo: 'ASS-2024-001',
    status: 'Active'
  },
  {
    id: 2,
    name: 'Mike Wilson',
    email: 'mike.w@skillforge.co.za',
    role: 'Assessor',
    programs: 'Manufacturing Learnership',
    regNo: 'ASS-2024-002',
    status: 'Active'
  },
  {
    id: 3,
    name: 'Lisa Adams',
    email: 'lisa.a@skillforge.co.za',
    role: 'Moderator',
    programs: 'IT Skills Program, Manufacturing Learnership',
    regNo: 'MOD-2024-001',
    status: 'Active'
  },
  {
    id: 4,
    name: 'Peter Nkosi',
    email: 'peter.n@skillforge.co.za',
    role: 'Moderator',
    programs: 'Business Administration',
    regNo: 'MOD-2024-002',
    status: 'Pending'
  }];

  const facilitatorColumns = [
  {
    header: 'Facilitator',
    accessorKey: 'name' as const,
    cell: (row: FacilitatorDirectoryRow) =>
    <div
      className="flex items-center cursor-pointer hover:opacity-80"
      onClick={() => {
        setSelectedFacilitator(row);
        setShowProfileModal(true);
      }}>
      
          <Avatar name={row.name} className="mr-3" />
          <div>
            <div className="font-medium text-gray-900 hover:text-brand-blue hover:underline">
              {row.name}
            </div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>

  },
  {
    header: 'Programs',
    accessorKey: 'programs' as const,
    cell: (row: FacilitatorDirectoryRow) =>
    <div>
          <div className="text-sm text-gray-900">{row.programs}</div>
          <div className="text-xs text-gray-500">{row.seta}</div>
        </div>

  },
  {
    header: 'Learners',
    accessorKey: 'learners' as const
  },
  {
    header: 'Rating',
    accessorKey: 'rating' as const,
    cell: (row: FacilitatorDirectoryRow) =>
    <div className="flex items-center text-sm text-gray-700">
          <Star className="h-3 w-3 text-gray-400 mr-1 fill-gray-400" />
          {row.rating}
        </div>

  }];

  const assessorColumns = [
  {
    header: 'Name',
    accessorKey: 'name' as const,
    cell: (row: AssessorDirectoryRow) =>
    <div className="flex items-center">
          <Avatar name={row.name} className="mr-3" />
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>

  },
  {
    header: 'Role',
    accessorKey: 'role' as const,
    cell: (row: AssessorDirectoryRow) =>
    <div className="flex items-center gap-2">
          {row.role === 'Assessor' ?
      <FileCheck className="h-4 w-4 text-red-500" /> :

      <Eye className="h-4 w-4 text-green-500" />
      }
          <Badge variant={row.role === 'Assessor' ? 'danger' : 'success'}>
            {row.role}
          </Badge>
        </div>

  },
  {
    header: 'Assigned Programmes',
    accessorKey: 'programs' as const,
    cell: (row: AssessorDirectoryRow) =>
    <span className="text-sm text-gray-600">{row.programs}</span>

  },
  {
    header: 'Reg. Number',
    accessorKey: 'regNo' as const,
    cell: (row: AssessorDirectoryRow) =>
    <span className="text-xs font-mono text-gray-500">{row.regNo}</span>

  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: AssessorDirectoryRow) =>
    <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>
          {row.status}
        </Badge>

  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: (row: AssessorDirectoryRow) =>
    <div className="flex space-x-2">
          <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setSelectedFacilitator(row);
          setShowProfileModal(true);
        }}>
        
            Manage
          </Button>
        </div>

  }];

  const handleAddFacilitator = () => {
    toast.success('Facilitator added successfully');
    setShowAddFacilitator(false);
  };
  const handleAddAssessor = () => {
    toast.success('Assessor/Moderator added and assigned successfully');
    setShowAddAssessor(false);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">
            Manage facilitators, assessors, and moderators
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => toast.success('Exporting staff list...')}>
            
            Export List
          </Button>
          {activeTab === 'facilitators' ?
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddFacilitator(true)}>
            
              Add Facilitator
            </Button> :

          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddAssessor(true)}>
            
              Add Assessor / Moderator
            </Button>
          }
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) =>
        <StatCard key={i} {...stat} delay={i * 0.1} />
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
        {
          id: 'facilitators',
          label: 'Facilitators',
          count: 18
        },
        {
          id: 'assessors',
          label: 'Assessors & Moderators',
          count: 4
        }]
        }
        activeTab={activeTab}
        onChange={setActiveTab} />
      

      {activeTab === 'facilitators' &&
      <Card title="Facilitators List" noPadding>
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search facilitators..." className="pl-10" />
            </div>
            <div className="w-full sm:w-48">
              <Select
              options={[
              {
                value: 'all',
                label: 'All Programs'
              }]
              } />
            
            </div>
          </div>
          <DataTable
          data={facilitators}
          columns={facilitatorColumns}
          keyField="id" />
        
        </Card>
      }

      {activeTab === 'assessors' &&
      <Card title="Assessors & Moderators" noPadding>
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
              placeholder="Search assessors & moderators..."
              className="pl-10" />
            
            </div>
            <div className="w-full sm:w-48">
              <Select
              options={[
              {
                value: 'all',
                label: 'All Roles'
              },
              {
                value: 'assessor',
                label: 'Assessors'
              },
              {
                value: 'moderator',
                label: 'Moderators'
              }]
              } />
            
            </div>
          </div>
          <DataTable data={assessors} columns={assessorColumns} keyField="id" />
        </Card>
      }

      {/* Add Facilitator Modal */}
      <Modal
        isOpen={showAddFacilitator}
        onClose={() => setShowAddFacilitator(false)}
        title="Add New Facilitator">
        
        <div className="space-y-4">
          <Input label="Full Name" placeholder="Enter facilitator name" />
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address" />
          
          <Input label="Phone Number" placeholder="+27" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qualifications
            </label>
            <textarea
              placeholder="List qualifications..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
          </div>
          <Select
            label="Programme Assignment"
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
            label="SETA Accreditation"
            options={[
            {
              value: 'mict',
              label: 'MICT SETA'
            },
            {
              value: 'services',
              label: 'Services SETA'
            }]
            } />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowAddFacilitator(false)}>
              
              Cancel
            </Button>
            <Button onClick={handleAddFacilitator}>Add Facilitator</Button>
          </div>
        </div>
      </Modal>

      {/* Add Assessor/Moderator Modal */}
      <Modal
        isOpen={showAddAssessor}
        onClose={() => setShowAddAssessor(false)}
        title="Add Assessor / Moderator">
        
        <div className="space-y-4">
          <Input label="Full Name" placeholder="Enter full name" />
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address" />
          
          <Input label="Phone Number" placeholder="+27" />
          <Input label="ID Number" placeholder="Enter SA ID number" />
          <Select
            label="Role"
            options={[
            {
              value: 'assessor',
              label: 'Assessor (Red Pen)'
            },
            {
              value: 'moderator',
              label: 'Moderator (Green Pen)'
            }]
            } />
          
          <Input label="Registration Number" placeholder="e.g. ASS-2024-003" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qualifications & Accreditation
            </label>
            <textarea
              placeholder="List qualifications and ETDP accreditation details..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Programmes
            </label>
            <div className="space-y-2 border border-gray-200 rounded-md p-3">
              {[
              'IT Skills Program (MICT SETA)',
              'Business Administration (Services SETA)',
              'Manufacturing Learnership (merSETA)',
              'Cyber Security (MICT SETA)'].
              map((prog, i) =>
              <label
                key={i}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                
                  <input
                  type="checkbox"
                  className="h-4 w-4 text-brand-navy rounded border-gray-300"
                  defaultChecked={i < 2} />
                
                  <span className="text-sm text-gray-700">{prog}</span>
                </label>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddAssessor(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAssessor}>Add Staff Member</Button>
          </div>
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Staff Profile">
        
        {selectedFacilitator &&
        <div className="space-y-6">
            <div className="flex items-center space-x-4 border-b border-gray-200 pb-6">
              <Avatar
              name={selectedFacilitator.name}
              size="lg"
              className="h-16 w-16 text-xl" />
            
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedFacilitator.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedFacilitator.email}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge
                  variant={
                  'status' in selectedFacilitator &&
                  selectedFacilitator.status === 'Active' ?
                  'success' :
                  'neutral'
                  }>
                  
                    {'status' in selectedFacilitator
                      ? selectedFacilitator.status
                      : 'Active'}
                  </Badge>
                  {'role' in selectedFacilitator && selectedFacilitator.role ?
                <Badge variant="info">{selectedFacilitator.role}</Badge> :

                null
                }
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Registration No.
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {'regNo' in selectedFacilitator
                    ? selectedFacilitator.regNo
                    : 'FAC-2023-089'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Expiry Date
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFacilitator.expiry ?? 'Dec 2025'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Phone Number
                </p>
                <p className="text-sm font-medium text-gray-900">
                  +27 82 123 4567
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Assigned Programmes
              </p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <ShieldCheck className="h-4 w-4 text-green-500 mr-2" /> IT
                    Skills Program (NQF 5)
                  </li>
                  <li className="flex items-center">
                    <ShieldCheck className="h-4 w-4 text-green-500 mr-2" />{' '}
                    Business Administration (NQF 4)
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button
              variant="outline"
              onClick={() => setShowProfileModal(false)}>
              
                Close
              </Button>
              <Button
              onClick={() => {
                setShowProfileModal(false);
                navigate('/messages');
              }}>
              
                Send Message
              </Button>
            </div>
          </div>
        }
      </Modal>
    </div>);

}