import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, FileText, Settings } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { learnerService, programmeService, reportsService } from '../services/api';
import { downloadJson } from '../utils/downloadJson';

type SetaExportPreviewRow = {
  id: string;
  name: string;
  idNo: string;
  program: string;
  status: string;
  date: string;
};

export function SETAExportsPage() {
  const navigate = useNavigate();
  const [previewData, setPreviewData] = useState<SetaExportPreviewRow[]>([]);
  const [programmes, setProgrammes] = useState<Array<{ id: string; title: string }>>([]);
  const [programmeId, setProgrammeId] = useState('all');
  const [asOf, setAsOf] = useState('');

  useEffect(() => {
    learnerService
      .getAll({
        programme: programmeId === 'all' ? undefined : programmeId,
        dateTo: asOf || undefined,
      })
      .then((res) =>
        setPreviewData(
          (res.data ?? []).map((learner) => ({
            id: learner.id,
            name: learner.name,
            idNo: learner.idNumber || 'Missing',
            program: learner.programmeName,
            status: learner.status === 'completed' ? 'Completed' : 'In Progress',
            date: learner.status === 'completed'
              ? learner.updatedAt.slice(0, 10)
              : learner.expectedCompletionDate,
          })),
        ),
      )
      .catch(() => toast.error('Could not load tenant learner preview'));
  }, [programmeId, asOf]);

  useEffect(() => {
    programmeService
      .getAll()
      .then((response) =>
        setProgrammes(
          (response.data ?? []).map((programme) => ({
            id: programme.id,
            title: programme.title,
          })),
        ),
      )
      .catch(() => setProgrammes([]));
  }, []);

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
            Generate a tenant-scoped internal data extract for regulator review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Options */}
        <div className="lg:col-span-1">
          <Card title="Export Options">
            <div className="space-y-4">
              <Select
                label="Programme"
                value={programmeId}
                onChange={(event) => setProgrammeId(event.target.value)}
                options={[
                {
                  value: 'all',
                  label: 'All programmes'
                },
                ...programmes.map((programme) => ({
                  value: programme.id,
                  label: programme.title,
                }))]
                } />

              <Input
                label="Data as at"
                type="date"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)} />
              

              <div className="pt-4">
                <Button
                  className="w-full"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={async () => {
                    try {
                      const filters = {
                        programmeId: programmeId === 'all' ? undefined : programmeId,
                        asOf: asOf || undefined,
                      };
                      const snap = await reportsService.getSetaSnapshot(filters);
                      downloadJson('internal-regulatory-export.json', {
                        snapshot: snap.data,
                        filters,
                        learners: previewData,
                        certification: 'internal-not-seta-certified',
                        exportedAt: new Date().toISOString(),
                      });
                      toast.success('Internal export downloaded');
                    } catch {
                      toast.error('Export failed');
                    }
                  }}>
                  
                  Export Internal Data
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
                Showing {previewData.length} tenant-scoped records. Internal export;
                regulator acceptance is not implied.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>);

}
