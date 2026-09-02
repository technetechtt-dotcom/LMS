import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Filter, Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import type { Programme, ProgrammeKind } from '../types';
import { programmeService } from '../services/api';
import { exportRecordsAsJson } from '../utils/exportData';
import { PROGRAMME_KIND_LABELS, PROGRAMME_POE_ARTIFACTS_NOTE } from '../utils/programmeKind';

type NewProgrammeForm = {
  title: string;
  code: string;
  credits: string;
  nqfLevel: string;
  programmeKind: ProgrammeKind;
  seta: string;
  description: string;
};

function emptyNewProgrammeForm(): NewProgrammeForm {
  return {
    title: '',
    code: '',
    credits: '120',
    nqfLevel: '4',
    programmeKind: 'OCCUPATIONAL_PROGRAMME',
    seta: 'MICT SETA',
    description: '',
  };
}

const SETA_SELECT_OPTIONS = [
  { value: 'MICT SETA', label: 'MICT SETA' },
  { value: 'Services SETA', label: 'Services SETA' },
  { value: 'merSETA', label: 'merSETA' },
];

export function ProgrammesPage() {
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [kindFilter, setKindFilter] = useState<'all' | ProgrammeKind>('all');
  const [showAddProgramme, setShowAddProgramme] = useState(false);
  const [newProgrammeForm, setNewProgrammeForm] = useState<NewProgrammeForm>(
    () => emptyNewProgrammeForm(),
  );
  const [creatingProgramme, setCreatingProgramme] = useState(false);
  const [modules, setModules] = useState([
  {
    id: 1,
    name: '',
    unitStandard: ''
  }]
  );
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
  },
  {
    value: 'us5',
    label: 'US 7468 - Use a spreadsheet application'
  },
  {
    value: 'us6',
    label: 'US 117925 - Install and configure a computer'
  },
  {
    value: 'us7',
    label: 'US 115789 - Use a presentation application'
  },
  {
    value: 'us8',
    label: 'US 116942 - Networking fundamentals'
  }];

  const addModule = () => {
    setModules([
    ...modules,
    {
      id: Date.now(),
      name: '',
      unitStandard: ''
    }]
    );
  };
  const removeModule = (id: number) => {
    if (modules.length > 1) {
      setModules(modules.filter((m) => m.id !== id));
    }
  };
  const updateModule = (id: number, field: string, value: string) => {
    setModules(
      modules.map((m) =>
      m.id === id ?
      {
        ...m,
        [field]: value
      } :
      m
      )
    );
  };
  useEffect(() => {
    programmeService.getAll().then((r) => {
      if (r.success && r.data) setProgrammes(r.data);
    });
  }, []);

  const filteredProgrammes = useMemo(() => {
    if (kindFilter === 'all') return programmes;
    return programmes.filter((p) => p.programmeKind === kindFilter);
  }, [programmes, kindFilter]);

  const openCreateProgrammeModal = () => {
    setNewProgrammeForm(emptyNewProgrammeForm());
    setModules([{ id: 1, name: '', unitStandard: '' }]);
    setShowAddProgramme(true);
  };

  const closeCreateProgrammeModal = () => {
    setShowAddProgramme(false);
    setNewProgrammeForm(emptyNewProgrammeForm());
    setModules([{ id: 1, name: '', unitStandard: '' }]);
  };

  const handleCreateProgramme = async () => {
    const title = newProgrammeForm.title.trim();
    const code = newProgrammeForm.code.trim();
    if (!title || !code) {
      toast.error('Programme name and programme code are required.');
      return;
    }
    const credits = Math.max(1, parseInt(newProgrammeForm.credits, 10) || 120);
    const nqfLevel = Math.min(
      10,
      Math.max(1, parseInt(newProgrammeForm.nqfLevel, 10) || 4),
    );
    setCreatingProgramme(true);
    try {
      const res = await programmeService.create({
        title,
        code,
        programmeKind: newProgrammeForm.programmeKind,
        nqfLevel,
        credits,
        seta: newProgrammeForm.seta,
        description: newProgrammeForm.description.trim(),
        status: 'draft',
      });
      if (res.success && res.data) {
        toast.success('Programme created');
        const list = await programmeService.getAll();
        if (list.success && list.data) setProgrammes(list.data);
        closeCreateProgrammeModal();
      }
    } catch (e) {
      console.error(e);
      toast.error(
        'Could not create the programme. If you use the Nest API, create programmes there with organisation and qualification IDs, or run the reference server (npm run dev:lms-api).',
      );
    } finally {
      setCreatingProgramme(false);
    }
  };
  const columns = [
  {
    header: 'Programme Name',
    accessorKey: 'title' as const,
    className: 'w-1/3'
  },
  {
    header: 'Code / SAQA',
    accessorKey: 'code' as const
  },
  {
    header: 'Type',
    accessorKey: 'programmeKind' as const,
    cell: (row: Programme) => (
      <Badge variant="info" className="font-normal">
        {PROGRAMME_KIND_LABELS[row.programmeKind]}
      </Badge>
    ),
  },
  {
    header: 'NQF Level',
    accessorKey: 'nqfLevel' as const,
    cell: (row: Programme) => <span>Level {row.nqfLevel}</span>
  },
  {
    header: 'Credits',
    accessorKey: 'credits' as const
  },
  {
    header: 'Enrolled',
    accessorKey: 'learnerCount' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: Programme) => {
      const variants: Record<Programme['status'], 'success' | 'warning' | 'neutral' | 'danger'> = {
        active: 'success',
        draft: 'neutral',
        archived: 'warning'
      };
      return (
        <Badge variant={variants[row.status]}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>);

    }
  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: (row: Programme) =>
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/programmes/${row.id}`);
      }}>
      
          View
        </Button>

  }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Programmes & Qualifications
          </h1>
          <p className="text-sm text-gray-500">
            Each programme is either a{' '}
            <strong>skills programme</strong> or an{' '}
            <strong>occupational programme</strong>. All are structured into Knowledge
            Modules (KM), Practical Modules (PM), and Workplace Modules (WM) where
            required.
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-3xl">
            {PROGRAMME_POE_ARTIFACTS_NOTE}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              exportRecordsAsJson('programmes.json', programmes, 'Programme export')
            }>
            
            Export
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreateProgrammeModal}>
            New Programme
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Input placeholder="Search programmes..." />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={kindFilter}
            onChange={(e) => {
              const v = e.target.value;
              setKindFilter(
                v === 'all' ? 'all' : (v as ProgrammeKind),
              );
            }}
            options={[
              { value: 'all', label: 'All types' },
              {
                value: 'SKILLS_PROGRAMME',
                label: PROGRAMME_KIND_LABELS.SKILLS_PROGRAMME,
              },
              {
                value: 'OCCUPATIONAL_PROGRAMME',
                label: PROGRAMME_KIND_LABELS.OCCUPATIONAL_PROGRAMME,
              },
            ]}
          />
          
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[
            {
              value: 'all',
              label: 'All Statuses'
            },
            {
              value: 'active',
              label: 'Active'
            },
            {
              value: 'pending',
              label: 'Pending'
            },
            {
              value: 'draft',
              label: 'Draft'
            }]
            } />
          
        </div>
        <Button
          variant="secondary"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() =>
            toast.info('Filters apply automatically when you change a dropdown')
          }>
          
          Filter
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={filteredProgrammes}
        columns={columns}
        keyField="id"
        onRowClick={(row) => navigate(`/programmes/${row.id}`)} />
      

      <Modal
        isOpen={showAddProgramme}
        onClose={closeCreateProgrammeModal}
        title="Create New Programme"
        size="lg">
        
        <div className="space-y-4">
          <Input
            label="Programme name"
            placeholder="e.g. Occupational Certificate: Welding"
            value={newProgrammeForm.title}
            onChange={(e) =>
              setNewProgrammeForm((f) => ({ ...f, title: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Programme code / SAQA ref"
              placeholder="e.g. 48872 or SP-002"
              value={newProgrammeForm.code}
              onChange={(e) =>
                setNewProgrammeForm((f) => ({ ...f, code: e.target.value }))
              }
            />
            <Input
              label="Credits"
              type="number"
              min={1}
              placeholder="e.g. 120"
              value={newProgrammeForm.credits}
              onChange={(e) =>
                setNewProgrammeForm((f) => ({ ...f, credits: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="NQF level"
              value={newProgrammeForm.nqfLevel}
              onChange={(e) =>
                setNewProgrammeForm((f) => ({
                  ...f,
                  nqfLevel: e.target.value,
                }))
              }
              options={[
                { value: '1', label: 'Level 1' },
                { value: '2', label: 'Level 2' },
                { value: '3', label: 'Level 3' },
                { value: '4', label: 'Level 4' },
                { value: '5', label: 'Level 5' },
                { value: '6', label: 'Level 6' },
              ]}
            />
            
            <Select
              label="Programme type"
              value={newProgrammeForm.programmeKind}
              onChange={(e) =>
                setNewProgrammeForm((f) => ({
                  ...f,
                  programmeKind: e.target.value as ProgrammeKind,
                }))
              }
              options={[
                {
                  value: 'SKILLS_PROGRAMME',
                  label: PROGRAMME_KIND_LABELS.SKILLS_PROGRAMME,
                },
                {
                  value: 'OCCUPATIONAL_PROGRAMME',
                  label: PROGRAMME_KIND_LABELS.OCCUPATIONAL_PROGRAMME,
                },
              ]}
            />
            
          </div>
          <p className="text-xs text-gray-600 -mt-2">
            {PROGRAMME_POE_ARTIFACTS_NOTE}
          </p>
          <Select
            label="SETA"
            value={newProgrammeForm.seta}
            onChange={(e) =>
              setNewProgrammeForm((f) => ({ ...f, seta: e.target.value }))
            }
            options={SETA_SELECT_OPTIONS}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter programme description"
              rows={3}
              value={newProgrammeForm.description}
              onChange={(e) =>
                setNewProgrammeForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y"
            />
            
          </div>

          {/* Modules & Unit Standards Section */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Programme Modules
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modules.length} module{modules.length !== 1 ? 's' : ''}{' '}
                  configured
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-3 w-3" />}
                onClick={addModule}>
                
                Add Module
              </Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {modules.map((mod, index) =>
              <div
                key={mod.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-brand-navy/10 text-brand-navy text-xs font-bold flex-shrink-0 mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                    placeholder={`Module ${index + 1} name`}
                    value={mod.name}
                    onChange={(e) =>
                    updateModule(mod.id, 'name', e.target.value)
                    } />
                  
                    <Select
                    value={mod.unitStandard}
                    onChange={(e) =>
                    updateModule(mod.id, 'unitStandard', e.target.value)
                    }
                    options={unitStandardOptions} />
                  
                  </div>
                  <button
                  onClick={() => removeModule(mod.id)}
                  className={`p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 mt-1 flex-shrink-0 ${modules.length <= 1 ? 'opacity-30 pointer-events-none' : ''}`}>
                  
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={closeCreateProgrammeModal}
              disabled={creatingProgramme}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProgramme}
              disabled={creatingProgramme}>
              {creatingProgramme ? 'Creating…' : 'Create programme'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}