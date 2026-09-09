import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Calendar, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { POESection } from '../components/poe/POESection';
import {
  OfficialPOEPanel,
  type OfficialPoeRequirementRow,
} from '../components/poe/OfficialPOEPanel';
import { DataTable } from '../components/ui/DataTable';
import { AttendanceView } from '../components/learner/AttendanceView';
import { FileUpload } from '../components/ui/FileUpload';
import { toast } from 'sonner';
import { learnerService, poeService, assessmentService } from '../services/api';
import type { Learner } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { evaluateOfficialPoeReadiness } from '../utils/officialPoe';
import type { OfficialPoeCompileMeta } from '../utils/officialPoeCompilePdf';

function initialsFromName(name: string): string {
  const p = name.split(/\s+/).filter(Boolean);
  if (p.length >= 2) {
    return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Conservative fallback: missing API data must never look regulator-verified. */
function buildOfficialPoeFallback(): {
  rows: OfficialPoeRequirementRow[];
  moderatorAssigned: boolean;
  compileMeta?: OfficialPoeCompileMeta;
} {
  return {
    moderatorAssigned: false,
    rows: [
      {
        id: 'cv',
        title: 'Learner CV',
        category: 'admin',
        submission: 'missing',
      },
      {
        id: 'addr',
        title: 'Proof of address',
        category: 'admin',
        submission: 'missing',
      },
      {
        id: 'aff',
        title: 'Affidavit for unemployment',
        category: 'admin',
        submission: 'missing',
      },
      {
        id: 'g12',
        title: 'Grade 12 certificate',
        category: 'admin',
        submission: 'missing',
      },
      {
        id: 'lwb',
        title: 'Learner workbook',
        category: 'workbook',
        submission: 'missing',
        facilitatorMarkedSigned: false,
      },
      {
        id: 'sum',
        title: 'Summative assessment',
        category: 'summative',
        submission: 'missing',
        assessorMarkedSigned: false,
        moderatorMarkedSigned: 'na',
      },
    ],
  };
}

export function LearnerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, linkedLearnerId } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [learnerRecord, setLearnerRecord] = useState<Learner | null>(null);
  const [loadingLearner, setLoadingLearner] = useState(true);
  const [officialPoeRows, setOfficialPoeRows] = useState<OfficialPoeRequirementRow[]>(
    [],
  );
  const [moderatorAssigned, setModeratorAssigned] = useState(false);
  const [poeDocuments, setPoeDocuments] = useState<
    Array<{
      id: string;
      title: string;
      status: 'verified' | 'pending' | 'completed';
      type: string;
      date?: string;
      downloadId?: string;
    }>
  >([]);
  const [assessmentRows, setAssessmentRows] = useState<
    Array<{
      id: number;
      title: string;
      date: string;
      score: number | string;
      result: string;
      assessor: string;
    }>
  >([]);

  const officialPoe = useMemo(
    () => ({
      rows: officialPoeRows.length
        ? officialPoeRows
        : buildOfficialPoeFallback().rows,
      moderatorAssigned,
      compileMeta: undefined as OfficialPoeCompileMeta | undefined,
    }),
    [officialPoeRows, moderatorAssigned],
  );

  const { canCompile, blockingReasons } = useMemo(
    () =>
      evaluateOfficialPoeReadiness(
        officialPoe.rows,
        officialPoe.moderatorAssigned,
      ),
    [officialPoe.rows, officialPoe.moderatorAssigned],
  );

  useEffect(() => {
    if (!id) {
      navigate('/learner-dashboard', { replace: true });
      return;
    }
    if (user?.role === 'Learner') {
      const mine = linkedLearnerId ?? user?.linkedLearnerId ?? null;
      if (!mine || mine !== id) {
        toast.error('You can only access your own learner profile.');
        navigate('/learner-dashboard', { replace: true });
      }
    }
  }, [id, user, linkedLearnerId, navigate]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const notFound = () => {
      toast.error('Learner not found');
      navigate(user?.role === 'Learner' ? '/learner-dashboard' : '/learners', {
        replace: true,
      });
    };

    setLoadingLearner(true);
    setLearnerRecord(null);

    void learnerService
      .getById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.data) setLearnerRecord(res.data);
        else notFound();
      })
      .catch(() => {
        if (!cancelled) notFound();
      })
      .finally(() => {
        if (!cancelled) setLoadingLearner(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate, user?.role]);

  useEffect(() => {
    if (!id || !learnerRecord) return;
    let cancelled = false;
    void assessmentService
      .listInstances()
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data ?? [])
          .filter(
            (inst) =>
              inst.learnerId === id || inst.learnerId === learnerRecord.userId,
          )
          .map((inst, idx) => ({
            id: idx + 1,
            title: inst.assessmentTitle,
            date: inst.submittedAt
              ? inst.submittedAt.slice(0, 10)
              : '-',
            score:
              inst.percentage != null
                ? Math.round(inst.percentage)
                : inst.score != null
                  ? inst.score
                  : '-',
            result:
              inst.isPassed === true
                ? 'Competent'
                : inst.isPassed === false
                  ? 'Not Yet Competent'
                  : 'Pending',
            assessor: inst.gradedBy ?? '-',
          }));
        setAssessmentRows(rows);
      })
      .catch(() => {
        if (!cancelled) setAssessmentRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, learnerRecord]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void poeService.getOverview(id).then((res) => {
      if (cancelled || !res.data) return;
      setOfficialPoeRows(
        res.data.rows as unknown as OfficialPoeRequirementRow[],
      );
      setModeratorAssigned(res.data.moderatorAssigned);
        setPoeDocuments(
        (res.data.documents ?? []).map((d) => ({
          id: d.id,
          title: d.fileName || d.type,
          status: d.status === 'verified' ? 'verified' : 'pending',
          type: d.category,
          date: d.createdAt?.slice(0, 10),
          downloadId: d.id,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const poeAdministrativeDocs = poeDocuments.filter(
    (d) => !/knowledge|practical|workplace/i.test(d.type ?? ''),
  );

  const poeKnowledgeModules = poeDocuments.filter((d) =>
    /knowledge/i.test(d.type ?? ''),
  );

  const poePracticalItems = poeDocuments.filter((d) =>
    /practical/i.test(d.type ?? ''),
  );

  const poeWorkplaceItems = poeDocuments.filter((d) =>
    /workplace/i.test(d.type ?? ''),
  );

  const poeTabCount =
    poeAdministrativeDocs.length +
    poeKnowledgeModules.length +
    poePracticalItems.length +
    poeWorkplaceItems.length;

  const assessmentColumns = [
    {
      header: 'Assessment Title',
      accessorKey: 'title' as const,
    },
    {
      header: 'Date Submitted',
      accessorKey: 'date' as const,
    },
    {
      header: 'Score',
      accessorKey: 'score' as const,
      cell: (row: { score: number | string }) =>
        row.score === '-' ? '-' : `${row.score}%`,
    },
    {
      header: 'Result',
      accessorKey: 'result' as const,
      cell: (row: { result: string }) => (
        <Badge
          variant={
            row.result === 'Competent'
              ? 'success'
              : row.result === 'Pending'
                ? 'warning'
                : 'danger'
          }>
          {row.result}
        </Badge>
      ),
    },
    {
      header: 'Assessor',
      accessorKey: 'assessor' as const,
    },
  ];

  const downloadQuickSummary = async () => {
    if (!learnerRecord) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Portfolio of Evidence — Assessment summary', 105, 20, {
      align: 'center',
    });
    doc.setFontSize(12);
    doc.text(`Learner: ${learnerRecord.name}`, 20, 40);
    doc.text(`ID: ${learnerRecord.idNumber}`, 20, 50);
    doc.text(`Programme: ${learnerRecord.programmeName}`, 20, 60);
    doc.setFontSize(16);
    doc.text('Assessment Summary', 20, 80);
    let y = 90;
    assessmentRows.forEach((a) => {
      const scoreLabel = a.score === '-' ? '—' : `${a.score}%`;
      doc.text(`${a.title} - ${a.result} (${scoreLabel})`, 20, y);
      y += 10;
    });
    doc.save('lms_assessment_summary.pdf');
    toast.success('Summary PDF exported');
  };

  const downloadOfficialPoe = async () => {
    if (!learnerRecord || !canCompile) {
      toast.error('Official POE is not ready to compile yet.');
      return;
    }
    const marking = officialPoe.compileMeta;
    if (!marking) {
      toast.error('POE marking data is not available for this learner yet.');
      return;
    }
    try {
      const { compileOfficialPoePackageBlob } = await import(
        '../utils/officialPoeCompilePdf'
      );
      const blob = await compileOfficialPoePackageBlob({
        learnerName: learnerRecord.name,
        idNumber: learnerRecord.idNumber,
        programmeName: learnerRecord.programmeName,
        marking,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'official_poe_km01_package.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Official POE package downloaded');
    } catch (e) {
      console.error(e);
      toast.error(
        'Could not build the POE PDF. Try again or contact support.',
      );
    }
  };

  if (!id || loadingLearner) {
    return (
      <div className="flex items-center justify-center min-h-[30vh] text-gray-500 text-sm">
        Loading profile…
      </div>
    );
  }

  if (!learnerRecord) {
    return (
      <div className="flex items-center justify-center min-h-[30vh] text-gray-500 text-sm">
        Redirecting…
      </div>
    );
  }

  const statusLabel = learnerRecord.status.replace('_', ' ');
  const statusVariant =
    learnerRecord.status === 'active'
      ? 'success'
      : learnerRecord.status === 'completed'
        ? 'info'
        : learnerRecord.status === 'at_risk'
          ? 'warning'
          : 'neutral';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <Avatar
              initials={initialsFromName(learnerRecord.name)}
              size="lg"
              className="h-20 w-20 text-2xl"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {learnerRecord.name}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={statusVariant} className="capitalize">
                  {statusLabel}
                </Badge>
                <span className="text-sm text-gray-500">
                  ID: {learnerRecord.idNumber}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" /> {learnerRecord.email}
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />{' '}
                  {learnerRecord.phone ?? 'On file'}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" /> Physical & postal
                  address on file
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-3 min-w-[200px]">
            <div className="w-full">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Programme progress</span>
                <span className="font-bold text-brand-navy">
                  {learnerRecord.progress}%
                </span>
              </div>
              <ProgressBar
                value={learnerRecord.progress}
                showValue={false}
                size="sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQuickSummary}
              leftIcon={<Download className="h-4 w-4" />}>
              Quick assessment summary (PDF)
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          {
            id: 'poe',
            label: 'Portfolio of Evidence',
            count: poeTabCount,
          },
          { id: 'assessments', label: 'Assessments', count: 3 },
          { id: 'attendance', label: 'Attendance' },
          { id: 'documents', label: 'Documents' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Programme details" className="md:col-span-2">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Enrolled programme
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {learnerRecord.programmeName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">NQF</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {learnerRecord.nqfLevel}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Enrolment date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {learnerRecord.enrollmentDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Expected completion
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {learnerRecord.expectedCompletionDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    SETA status
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">
                    {learnerRecord.setaStatus}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last activity
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {learnerRecord.lastActivity} —{' '}
                    {learnerRecord.lastActivityDescription}
                  </dd>
                </div>
              </dl>
            </Card>
            <Card title="Key dates">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-brand-blue mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Next assessment due
                    </p>
                    <p className="text-xs text-gray-500">
                      Module 3: Web Dev — per facilitator schedule
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-brand-teal mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      SETA / audit window
                    </p>
                    <p className="text-xs text-gray-500">
                      Coordinated by QA — notifications will appear here
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'poe' && (
          <div className="space-y-6">
            <OfficialPOEPanel
              rows={officialPoe.rows}
              canCompile={canCompile}
              blockingReasons={blockingReasons}
              onCompileDownload={downloadOfficialPoe}
              allowReview
            />

            <Card title="QCTO PoE structure & requirements">
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Knowledge modules (KM) — five-part set
                  </h4>
                  <p className="mt-2">
                    Each <strong>knowledge module</strong> (
                    <span className="font-mono">KM-XX</span>) includes five standard
                    documents:
                  </p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                    <li>Facilitator Guide</li>
                    <li>Summative Assessment Memo</li>
                    <li>Learner Guide</li>
                    <li>
                      Learner Workbook — facilitator → assessor → moderator
                      workflow
                    </li>
                    <li>
                      Summative Assessment — same workflow
                    </li>
                  </ul>
                  <p className="mt-2">
                    The <strong>official downloadable POE</strong> above bundles
                    your CV, address proof, unemployment affidavit, Grade 12
                    certificate, signed learner workbook, and signed summative —
                    once submissions and facilitator / assessor (and moderator when
                    assigned) sign-offs are complete.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    Practical (PM) &amp; workplace (WM) modules
                  </h4>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                    <li>
                      <strong>PM-XX</strong> — practical skills, logbooks, and
                      centre-based assessments.
                    </li>
                    <li>
                      <strong>WM-XX</strong> — workplace placement evidence and
                      mentor-validated workplace assessments (where required).
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    Components of a QCTO PoE
                  </h4>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>
                      <strong>Knowledge component:</strong> KM guides, memos,
                      workbooks, and summatives per module.
                    </li>
                    <li>
                      <strong>Practical component:</strong> PM modules — logbooks,
                      observation checklists, and practical assessments.
                    </li>
                    <li>
                      <strong>Workplace experience:</strong> WM modules — validated
                      workplace evidence and mentor sign-off.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">Key process rules</h4>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>
                      PoE evidence must be continuously updated and internally
                      moderated by an accredited SDP.
                    </li>
                    <li>
                      Mandatory records include attendance registers, assessment
                      instruments, and moderation reports.
                    </li>
                    <li>
                      A complete moderated PoE is required for EISA entry and
                      certification readiness.
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <POESection
              title="Knowledge component — guide, workbook & summative"
              items={poeKnowledgeModules}
            />

            <POESection title="Administrative documents" items={poeAdministrativeDocs} />

            <POESection title="Practical component" items={poePracticalItems} />

            <POESection title="Workplace experience" items={poeWorkplaceItems} />
          </div>
        )}

        {activeTab === 'assessments' && (
          <Card noPadding>
            <DataTable
              data={assessmentRows}
              columns={assessmentColumns}
              keyField="id"
              pagination={false}
            />
          </Card>
        )}

        {activeTab === 'attendance' && <AttendanceView />}

        {activeTab === 'documents' && (
          <Card title="Upload documents">
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Upload certified copies of ID, qualifications, CV, proof of
                address, and other administrative documents. Files are tracked toward
                your official POE checklist.
              </p>
              <FileUpload
                onUpload={async (files) => {
                  if (!id) return;
                  try {
                    for (const file of files) {
                      await poeService.upload(id, file, {
                        category: 'administrative',
                        type: 'Administrative',
                      });
                    }
                    const overview = await poeService.getByLearner(id);
                    setPoeDocuments(
                      (overview.data ?? []).map((d) => ({
                        id: d.id,
                        title: d.fileName || d.type,
                        status: d.status === 'verified' ? 'verified' : 'pending',
                        type: d.category,
                        date: d.createdAt?.slice(0, 10),
                        downloadId: d.id,
                      })),
                    );
                    toast.success(`${files.length} document(s) uploaded and verified`);
                  } catch (error) {
                    toast.error('Could not upload documents');
                    throw error;
                  }
                }}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
