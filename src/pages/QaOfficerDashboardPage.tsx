import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck,
  FileSignature,
  Users,
  Briefcase,
  CheckCircle,
  Upload,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/dashboard/StatCard';
import {
  organisationService,
  programmeService,
  qaOfficerService,
  directoryService,
} from '../services/api';

type ContractRow = {
  id: string;
  name: string;
  contractType: string;
  counterparty?: string;
  status: string;
  expiryDate?: string;
};

type VettingRow = {
  enrollmentId: string;
  name: string;
  email: string;
  programme: string;
  idNumber?: string;
};

type PlacementRow = {
  enrollmentId: string;
  name: string;
  email: string;
  programme: string;
};

export function QaOfficerDashboardPage() {
  const [tab, setTab] = useState('contracts');
  const [overview, setOverview] = useState({
    unsignedContracts: 0,
    vettingPending: 0,
    placementPending: 0,
    totalLearners: 0,
  });
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [vetting, setVetting] = useState<VettingRow[]>([]);
  const [placement, setPlacement] = useState<PlacementRow[]>([]);
  const [programmes, setProgrammes] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [employers, setEmployers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [mentors, setMentors] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [placementModal, setPlacementModal] = useState<PlacementRow | null>(
    null,
  );
  const [vettingModal, setVettingModal] = useState<VettingRow | null>(null);
  const [checks, setChecks] = useState({
    idVerified: false,
    popiaConsent: false,
    qualificationMet: false,
    documentsComplete: false,
  });

  const reload = useCallback(async () => {
    const [ov, c, v, p, prog, orgs, users] = await Promise.all([
      qaOfficerService.overview(),
      qaOfficerService.listContracts(),
      qaOfficerService.vettingQueue(),
      qaOfficerService.placementQueue(),
      programmeService.getAll(),
      organisationService.list(),
      directoryService.mentors({ pageSize: 50 }),
    ]);
    setOverview(ov.data);
    setContracts((c.data ?? []) as ContractRow[]);
    setVetting((v.data ?? []) as VettingRow[]);
    setPlacement((p.data ?? []) as PlacementRow[]);
    setProgrammes((prog.data ?? []).map((x) => ({ id: x.id, title: x.title })));
    setEmployers(
      (orgs.data ?? [])
        .filter((o) => o.type === 'EMPLOYER')
        .map((o) => ({ id: o.id, name: o.name })),
    );
    setMentors(
      (users.data?.items ?? []).map((u) => ({ id: u.id, name: u.name })),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch(() => {
        if (!cancelled) toast.error('Could not load QA workspace');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleRegisterContract = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) {
      toast.error('A contract file is required');
      return;
    }
    try {
      await qaOfficerService.registerContract({
        contractType: fd.get('contractType') as 'SETA' | 'SDP' | 'IMPLEMENTATION',
        name: String(fd.get('name')),
        counterparty: String(fd.get('counterparty') || ''),
        effectiveDate: String(fd.get('effectiveDate') || '') || undefined,
        expiryDate: String(fd.get('expiryDate') || '') || undefined,
        notes: String(fd.get('notes') || '') || undefined,
      }, file);
      toast.success('Contract registered — ready for signature');
      setShowContractModal(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register contract');
    }
  };

  const handleBulkImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const csv = String(fd.get('csv') ?? '').trim();
    const programmeId = String(fd.get('programmeId'));
    if (!csv || !programmeId) {
      toast.error('CSV and programme are required');
      return;
    }
    const learners = csv
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [email, firstName, lastName, idNumber, phone] = line
          .split(',')
          .map((p) => p.trim());
        return { email, firstName, lastName, programmeId, idNumber, phone };
      });
    try {
      const res = await qaOfficerService.bulkImportLearners(learners);
      toast.success(`Imported ${(res.data as { imported: number }).imported} learners for vetting`);
      setShowImportModal(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const submitVetting = async (decision: 'qualified' | 'rejected') => {
    if (!vettingModal) return;
    try {
      await qaOfficerService.recordVetting(vettingModal.enrollmentId, {
        decision,
        checks,
        notes: decision === 'rejected' ? 'Does not meet compliance requirements' : undefined,
      });
      toast.success(decision === 'qualified' ? 'Learner qualified' : 'Learner rejected');
      setVettingModal(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vetting failed');
    }
  };

  const submitPlacement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!placementModal) return;
    const fd = new FormData(e.currentTarget);
    try {
      await qaOfficerService.arrangePlacement(placementModal.enrollmentId, {
        employerOrganisationId: String(fd.get('employerId')),
        workplaceMentorId: String(fd.get('mentorId') || '') || undefined,
        placementStartDate: String(fd.get('startDate') || '') || undefined,
        notes: String(fd.get('notes') || '') || undefined,
      });
      toast.success('Work placement arranged');
      setPlacementModal(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Placement failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-brand-navy" />
          QA Officer Workspace
        </h1>
        <p className="text-gray-600 mt-1">
          Contract signing, learner intake &amp; vetting, and workplace placement
          coordination.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Contracts to sign"
          value={String(overview.unsignedContracts)}
          icon={<FileSignature className="h-5 w-5" />}
        />
        <StatCard
          title="Awaiting vetting"
          value={String(overview.vettingPending)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Need placement"
          value={String(overview.placementPending)}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          title="Total learners"
          value={String(overview.totalLearners)}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      <Tabs
        tabs={[
          { id: 'contracts', label: 'Contracts' },
          { id: 'vetting', label: 'Learner vetting' },
          { id: 'placement', label: 'Work placement' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === 'contracts' && (
        <Card
          title="SETA & provider contracts"
          action={
            <Button size="sm" onClick={() => setShowContractModal(true)}>
              Register contract
            </Button>
          }>
          <p className="text-sm text-gray-600 mb-4">
            QA Officers sign contracts with SETA, the Skills Development Provider,
            and implementation/service providers before programmes go live.
          </p>
          <DataTable
            keyField="id"
            data={contracts}
            columns={[
              { header: 'Contract', accessorKey: 'name' as const },
              { header: 'Type', accessorKey: 'contractType' as const },
              { header: 'Counterparty', accessorKey: 'counterparty' as const },
              {
                header: 'Status',
                accessorKey: 'status' as const,
                cell: (row: ContractRow) => (
                  <Badge variant={row.status === 'signed' ? 'success' : 'warning'}>
                    {row.status}
                  </Badge>
                ),
              },
              {
                header: 'Actions',
                accessorKey: 'id' as const,
                cell: (row: ContractRow) =>
                  row.status !== 'signed' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await qaOfficerService.signContract(row.id);
                        toast.success('Contract signed');
                        await reload();
                      }}>
                      Sign
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-500">Signed</span>
                  ),
              },
            ]}
          />
        </Card>
      )}

      {tab === 'vetting' && (
        <Card
          title="Learner intake & vetting"
          action={
            <Button
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() => setShowImportModal(true)}>
              Bulk upload
            </Button>
          }>
          <p className="text-sm text-gray-600 mb-4">
            Upload learners to the LMS and verify ID, POPIA consent, programme
            eligibility, and document completeness before they proceed.
          </p>
          <DataTable
            keyField="enrollmentId"
            data={vetting}
            columns={[
              { header: 'Learner', accessorKey: 'name' as const },
              { header: 'Email', accessorKey: 'email' as const },
              { header: 'Programme', accessorKey: 'programme' as const },
              { header: 'ID', accessorKey: 'idNumber' as const },
              {
                header: 'Actions',
                accessorKey: 'enrollmentId' as const,
                cell: (row: VettingRow) => (
                  <Button
                    size="sm"
                    onClick={() => {
                      setVettingModal(row);
                      setChecks({
                        idVerified: false,
                        popiaConsent: false,
                        qualificationMet: false,
                        documentsComplete: false,
                      });
                    }}>
                    Vet
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {tab === 'placement' && (
        <Card title="Work placement coordination">
          <p className="text-sm text-gray-600 mb-4">
            Arrange employer host sites and workplace mentors for vetted learners.
          </p>
          <DataTable
            keyField="enrollmentId"
            data={placement}
            columns={[
              { header: 'Learner', accessorKey: 'name' as const },
              { header: 'Email', accessorKey: 'email' as const },
              { header: 'Programme', accessorKey: 'programme' as const },
              {
                header: 'Actions',
                accessorKey: 'enrollmentId' as const,
                cell: (row: PlacementRow) => (
                  <Button size="sm" onClick={() => setPlacementModal(row)}>
                    Arrange placement
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Modal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        title="Register contract">
        <form className="space-y-4" onSubmit={handleRegisterContract}>
          <Select
            name="contractType"
            label="Contract type"
            required
            options={[
              { value: 'SETA', label: 'SETA agreement' },
              { value: 'SDP', label: 'Skills Development Provider' },
              { value: 'IMPLEMENTATION', label: 'Implementation / service provider' },
            ]}
          />
          <Input name="name" label="Contract title" required />
          <Input name="counterparty" label="Counterparty organisation" />
          <Input name="effectiveDate" label="Effective date" type="date" />
          <Input name="expiryDate" label="Expiry date" type="date" />
          <Input name="notes" label="Notes" />
          <Input
            name="file"
            label="Signed or draft contract file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowContractModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Register</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Bulk upload learners"
        size="lg">
        <form className="space-y-4" onSubmit={handleBulkImport}>
          <Select
            name="programmeId"
            label="Programme"
            required
            options={programmes.map((p) => ({ value: p.id, label: p.title }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSV (email, firstName, lastName, idNumber, phone)
            </label>
            <textarea
              name="csv"
              className="w-full border rounded-md p-2 text-sm font-mono"
              rows={6}
              placeholder="learner@example.co.za,Lerato,Mokoena,9001015009087,+27820000000"
            />
          </div>
          <Button type="submit">Upload for vetting</Button>
        </form>
      </Modal>

      <Modal
        isOpen={!!vettingModal}
        onClose={() => setVettingModal(null)}
        title={`Vet ${vettingModal?.name ?? 'learner'}`}>
        <div className="space-y-3">
          {(
            [
              ['idVerified', 'ID document verified'],
              ['popiaConsent', 'POPIA consent on file'],
              ['qualificationMet', 'Meets programme entry requirements'],
              ['documentsComplete', 'Registration documents complete'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checks[key]}
                onChange={(e) =>
                  setChecks({ ...checks, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => submitVetting('rejected')}>
              Reject
            </Button>
            <Button onClick={() => submitVetting('qualified')}>Qualify</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!placementModal}
        onClose={() => setPlacementModal(null)}
        title={`Place ${placementModal?.name ?? 'learner'}`}>
        <form className="space-y-4" onSubmit={submitPlacement}>
          <Select
            name="employerId"
            label="Employer host site"
            required
            options={employers.map((e) => ({ value: e.id, label: e.name }))}
          />
          <Select
            name="mentorId"
            label="Workplace mentor"
            options={[
              { value: '', label: 'Select mentor (optional)' },
              ...mentors.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <Input name="startDate" label="Placement start date" type="date" />
          <Input name="notes" label="Notes" />
          <Button type="submit">Confirm placement</Button>
        </form>
      </Modal>
    </div>
  );
}
