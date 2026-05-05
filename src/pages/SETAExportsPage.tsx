import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, FileText, Settings } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';

type SetaExportPreviewRow = {
  id: number;
  name: string;
  idNo: string;
  program: string;
  status: string;
  date: string;
};

export function SETAExportsPage() {
  const navigate = useNavigate();
  const previewData = [
  {
    id: 1,
    name: 'Liam Johnson',
    idNo: '9203015002083',
    program: 'Business Administration',
    status: 'Completed',
    date: '2024-05-15'
  },
  {
    id: 2,
    name: 'Olivia Smith',
    idNo: '9508120001082',
    program: 'IT Support',
    status: 'In Progress',
    date: '2024-12-31'
  },
  {
    id: 3,
    name: 'Noah Williams',
    idNo: '9001155003081',
    program: 'Marketing',
    status: 'Completed',
    date: '2024-06-20'
  },
  {
    id: 4,
    name: 'Ava Brown',
    idNo: '9307220004080',
    program: 'Finance',
    status: 'Completed',
    date: '2024-07-10'
  },
  {
    id: 5,
    name: 'Ethan Davis',
    idNo: '9105055005079',
    program: 'Human Resources',
    status: 'In Progress',
    date: '2024-11-15'
  }];

  const columns = [
  {
    header: 'Learner Name',
    accessorKey: 'name' as const
  },
  {
    header: 'ID Number',
    accessorKey: 'idNo' as const
  },
  {
    header: 'Program',
    accessorKey: 'program' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: SetaExportPreviewRow) =>
    <Badge variant={row.status === 'Completed' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>

  },
  {
    header: 'Completion Date',
    accessorKey: 'date' as const
  }];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SETA Exports</h1>
          <p className="text-sm text-gray-500">
            Generate and export data in formats required by various SETAs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Options */}
        <div className="lg:col-span-1">
          <Card title="Export Options">
            <div className="space-y-4">
              <Select
                label="Select SETA"
                options={[
                {
                  value: 'mict',
                  label: 'MICT SETA'
                },
                {
                  value: 'services',
                  label: 'Services SETA'
                },
                {
                  value: 'merse',
                  label: 'merSETA'
                }]
                } />
              
              <Select
                label="Select Program Type"
                options={[
                {
                  value: 'learnership',
                  label: 'Learnership'
                },
                {
                  value: 'skills',
                  label: 'Skills Program'
                }]
                } />
              
              <Select
                label="Select Reporting Period"
                options={[
                {
                  value: 'q1',
                  label: 'Q1 (Jan - Mar)'
                },
                {
                  value: 'q2',
                  label: 'Q2 (Apr - Jun)'
                },
                {
                  value: 'q3',
                  label: 'Q3 (Jul - Sep)'
                },
                {
                  value: 'q4',
                  label: 'Q4 (Oct - Dec)'
                }]
                } />
              

              <div className="pt-4">
                <Button
                  className="w-full"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => toast.success('Generating SETA export...')}>
                  
                  Export Data
                </Button>
              </div>
            </div>
          </Card>

          <div className="mt-6 space-y-2">
            <button
              className="flex items-center text-sm text-gray-600 hover:text-brand-blue"
              onClick={() => navigate('/help')}>
              
              <FileText className="h-4 w-4 mr-2" />
              Help and Support
            </button>
            <button
              className="flex items-center text-sm text-gray-600 hover:text-brand-blue"
              onClick={() => navigate('/settings')}>
              
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-2">
          <Card title="Data Preview" noPadding>
            <DataTable data={previewData} columns={columns} keyField="id" />
            <div className="p-4 border-t border-gray-100 text-right">
              <span className="text-xs text-gray-500">
                Showing 5 of 128 records
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>);

}