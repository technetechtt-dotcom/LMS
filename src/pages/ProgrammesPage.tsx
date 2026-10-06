import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  qualificationId: string;
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
    qualificationId: '',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [kindFilter, setKindFilter] = useState<'all' | ProgrammeKind>(
    () => (searchParams.get('type') as ProgrammeKind) || 'all',
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    () => searchParams.get('status') || 'all',
  );
  const [setaFilter, setSetaFilter] = useState<string>(
    () => searchParams.get('seta') || 'all',
  );
  const [showAddProgramme, setShowAddProgramme] = useState(
    () => searchParams.get('action') === 'new',
  );
  const [newProgrammeForm, setNewProgrammeForm] = useState<NewProgrammeForm>(
    () => emptyNewProgrammeForm(),
  );
  const [creatingProgramme, setCreatingProgramme] = useState(false);
  const [modules, setModules] = useState([
    {
      id: 1,
      name: '',
      code: 'KM-01',
      moduleType: 'KNOWLEDGE' as const,
      credits: '15',
      unitStandardId: '',
    },
  ]);

  const unitStandardOptions = useMemo(() => {
    const selectedQ = qualifications.find((q) => q.id === newProgrammeForm.qualificationId);
    if (!selectedQ || !selectedQ.unitStandards?.length) {
      return [{ value: '', label: 'Select Unit Standard (Optional)' }];
    }
    return [
      { value: '', label: 'Select Unit Standard (Optional)' },
      ...selectedQ.unitStandards.map((us: any) => ({
        value: us.id,
        label: `${us.code} - ${us.title} (${us.credits} cr)`,
      })),
    ];
  }, [qualifications, newProgrammeForm.qualificationId]);

  const addModule = () => {
    const nextIdx = modules.length + 1;
    const defaultType = nextIdx === 2 ? 'PRACTICAL' : nextIdx === 3 ? 'WORKPLACE' : 'KNOWLEDGE';
    const defaultCode = nextIdx === 2 ? 'PM-01' : nextIdx === 3 ? 'WM-01' : `KM-0${nextIdx}`;
    setModules([
      ...modules,
      {
        id: Date.now(),
        name: '',
        code: defaultCode,
        moduleType: defaultType as any,
        credits: '10',
        unitStandardId: '',
      },
    ]);
  };
  const removeModule = (id: number) => {
    if (modules.length > 1) {
      setModules(modules.filter((m) => m.id !== id));
    }
  };
  const updateModule = (id: number, field: string, value: string) => {
    setModules(
      modules.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: value,
            }
          : m,
      ),
    );
  };
  useEffect(() => {
    programmeService.getAll().then((r) => {
      if (r.success && r.data) setProgrammes(r.data);
    });
    programmeService.getQualifications().then((r) => {
      if (r.success && r.data) setQualifications(r.data);
    });
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (searchTerm) p.set('q', searchTerm);
    else p.delete('q');

    if (kindFilter !== 'all') p.set('type', kindFilter);
    else p.delete('type');

    if (statusFilter !== 'all') p.set('status', statusFilter);
    else p.delete('status');

    if (setaFilter !== 'all') p.set('seta', setaFilter);
    else p.delete('seta');

    setSearchParams(p, { replace: true });
  }, [searchTerm, kindFilter, statusFilter, setaFilter]);

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      if (kindFilter !== 'all' && p.programmeKind !== kindFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (setaFilter !== 'all' && p.seta !== setaFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const blob = `${p.title} ${p.code} ${p.seta} ${p.description}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [programmes, kindFilter, statusFilter, setaFilter, searchTerm]);

  const openCreateProgrammeModal = () => {
    setNewProgrammeForm(emptyNewProgrammeForm());
    setModules([
      {
        id: 1,
        name: '',
        code: 'KM-01',
        moduleType: 'KNOWLEDGE',
        credits: '15',
        unitStandardId: '',
      },
    ]);
    setShowAddProgramme(true);
  };

  const closeCreateProgrammeModal = () => {
    setShowAddProgramme(false);
    setNewProgrammeForm(emptyNewProgrammeForm());
    setModules([
      {
        id: 1,
        name: '',
        code: 'KM-01',
        moduleType: 'KNOWLEDGE',
        credits: '15',
        unitStandardId: '',
      },
    ]);
  };

  const handleCreateProgramme = async () => {
    const title = newProgrammeForm.title.trim();
    const code = newProgrammeForm.code.trim();
    if (!newProgrammeForm.qualificationId) {
      toast.error('SAQA Qualification is required.');
      return;
    }
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
        qualificationId: newProgrammeForm.qualificationId,
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
        const createdProg = res.data;
        for (const m of modules) {
          if (m.name.trim()) {
            await programmeService.addModule(createdProg.id, {
              title: m.name.trim(),
              code: m.code.trim() || 'KM-01',
              moduleType: m.moduleType,
              credits: parseInt(m.credits, 10) || 10,
              unitStandardId: m.unitStandardId || undefined,
            });
          }
        }
        toast.success('Programme and modules created successfully');
        const list = await programmeService.getAll();
        if (list.success && list.data) setProgrammes(list.data);
        closeCreateProgrammeModal();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Could not create the programme.');
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
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by title, code, SETA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
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
        <div className="w-full sm:w-40">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={setaFilter}
            onChange={(e) => setSetaFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All SETAs' },
              ...SETA_SELECT_OPTIONS,
            ]}
          />
        </div>
        <Button
          variant="secondary"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => {
            setSearchTerm('');
            setKindFilter('all');
            setStatusFilter('all');
            setSetaFilter('all');
          }}>
          Reset
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
          <Select
            label="SAQA Qualification *"
            value={newProgrammeForm.qualificationId}
            onChange={(e) => {
              const qId = e.target.value;
              const q = qualifications.find((item) => item.id === qId);
              setNewProgrammeForm((f) => ({
                ...f,
                qualificationId: qId,
                title: f.title || (q ? q.title : ''),
                code: f.code || (q ? q.saqaId : ''),
                nqfLevel: q ? String(q.nqfLevel) : f.nqfLevel,
                credits: q ? String(q.totalCredits) : f.credits,
                seta: q?.seta || f.seta,
              }));
            }}
            options={[
              { value: '', label: 'Select SAQA Qualification...' },
              ...qualifications.map((q) => ({
                value: q.id,
                label: `SAQA ${q.saqaId} - ${q.title} (Level ${q.nqfLevel}, ${q.totalCredits} cr)`,
              })),
            ]}
          />

          <Input
            label="Programme name *"
            placeholder="e.g. Occupational Certificate: Welding"
            value={newProgrammeForm.title}
            onChange={(e) =>
              setNewProgrammeForm((f) => ({ ...f, title: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Programme code / SAQA ref *"
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
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder={`Module ${index + 1} name`}
                      value={mod.name}
                      onChange={(e) =>
                        updateModule(mod.id, 'name', e.target.value)
                      }
                    />
                    <Select
                      value={mod.moduleType}
                      onChange={(e) =>
                        updateModule(mod.id, 'moduleType', e.target.value)
                      }
                      options={[
                        { value: 'KNOWLEDGE', label: 'Knowledge (KM)' },
                        { value: 'PRACTICAL', label: 'Practical (PM)' },
                        { value: 'WORKPLACE', label: 'Workplace (WM)' },
                      ]}
                    />
                    <Select
                      value={mod.unitStandardId}
                      onChange={(e) =>
                        updateModule(mod.id, 'unitStandardId', e.target.value)
                      }
                      options={unitStandardOptions}
                    />
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