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
import { jsPDF } from 'jspdf';
import { learnerService } from '../services/api';
import type { Learner } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { evaluateOfficialPoeReadiness } from '../utils/officialPoe';
import {
  compileOfficialPoePackageBlob,
  type OfficialPoeCompileMeta,
} from '../utils/officialPoeCompilePdf';

function initialsFromName(name: string): string {
  const p = name.split(/\s+/).filter(Boolean);
  if (p.length >= 2) {
    return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Placeholder until POE API is wired to documents + artifacts. */
function buildOfficialPoeModel(): {
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
        submission: 'verified',
      },
      {
        id: 'addr',
        title: 'Proof of address',
        category: 'admin',
        submission: 'submitted',
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
        submission: 'verified',
      },
      {
        id: 'lwb',
        title: 'Learner workbook',
        category: 'workbook',
        submission: 'submitted',
        facilitatorMarkedSigned: false,
      },
      {
        id: 'sum',
        title: 'Summative assessment',
        category: 'summative',
        submission: 'submitted',
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

  const officialPoe = useMemo(
    () => (id ? buildOfficialPoeModel() : { rows: [], moderatorAssigned: false }),
    [id],
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

  const poeAdministrativeDocs = [
    {
      id: '1',
      title: 'Learner Registration Form',
      status: 'verified' as const,
      type: 'Administrative',
      date: '2023-01-15',
    },
    {
      id: '2',
      title: 'Certified ID Copy',
      status: 'verified' as const,
      type: 'Administrative',
      date: '2023-01-15',
    },
    {
      id: '3',
      title: 'Matric Certificate',
      status: 'verified' as const,
      type: 'Administrative',
      date: '2023-01-15',
    },
  ];

  const poeKnowledgeModules = [
    {
      id: 'km-lg',
      title: 'Learner Guide',
      status: 'completed' as const,
      type: 'Knowledge • Textbook-style content',
      date: '2026-02-01',
    },
    {
      id: 'km-wb',
      title: 'Learner Workbook',
      status: 'pending' as const,
      type: 'Knowledge • Homework / activities (facilitator-marked)',
    },
    {
      id: 'km-sum',
      title: 'Summative Assessment',
      status: 'pending' as const,
      type: 'Knowledge • Formal summative instrument',
    },
  ];

  const poePracticalItems = [
    {
      id: '4',
      title: 'Module 1: Intro to Programming',
      status: 'completed' as const,
      type: 'Practical / simulated assessment',
      date: '2023-02-20',
    },
    {
      id: '5',
      title: 'Module 2: Database Design',
      status: 'completed' as const,
      type: 'Practical / simulated assessment',
      date: '2023-03-15',
    },
    {
      id: '6',
      title: 'Module 3: Web Development',
      status: 'pending' as const,
      type: 'Practical / simulated assessment',
    },
  ];

  const poeWorkplaceItems = [
    {
      id: '7',
      title: 'Workplace Logbook: Month 1',
      status: 'verified' as const,
      type: 'Workplace',
      date: '2023-02-28',
    },
    {
      id: '8',
      title: 'Workplace Logbook: Month 2',
      status: 'missing' as const,
      type: 'Workplace',
    },
  ];

  const poeTabCount =
    poeAdministrativeDocs.length +
    poeKnowledgeModules.length +
    poePracticalItems.length +
    poeWorkplaceItems.length;

  const assessments = [
    {
      id: 1,
      title: 'Module 1: Intro to Programming',
      date: '2023-02-20',
      score: 85,
      result: 'Competent',
      assessor: 'Jane Smith',
    },
    {
      id: 2,
      title: 'Module 2: Database Design',
      date: '2023-03-15',
      score: 72,
      result: 'Competent',
      assessor: 'Jane Smith',
    },
    {
      id: 3,
      title: 'Module 3: Web Development',
      date: '-',
      score: '-',
      result: 'Pending',
      assessor: '-',
    },
  ];

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

  const downloadQuickSummary = () => {
    if (!learnerRecord) return;
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
    assessments.forEach((a) => {
      doc.setFontSize(12);
      doc.text(`${a.title} - ${a.result} (${a.score}%)`, 20, y);
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
            />

            <Card title="QCTO PoE structure & requirements">
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Knowledge modules (KM) — three-part set
                  </h4>
                  <p className="mt-2">
                    Occupational programmes typically package each{' '}
                    <strong>knowledge module</strong> as{' '}
                    <strong>three PDFs per KM</strong>, for example KM-XX:
                  </p>
                  <ul className="mt-2 space-y-1 list-disc list-inside font-mono text-xs sm:text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                    <li>KM-XX-Learner Guide.pdf — textbook-style teaching content</li>
                    <li>
                      KM-XX-Learner Workbook.pdf — homework, tasks, self-study
                      prompts
                    </li>
                    <li>
                      KM-XX-Summative Assessment.pdf — formal KM summative
                      assessment
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
                    Components of a QCTO PoE
                  </h4>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>
                      <strong>Knowledge component:</strong> KM learner guides,
                      workbooks, and KM summatives, plus broader knowledge evidence
                      as required by the SDP.
                    </li>
                    <li>
                      <strong>Practical component:</strong> logbooks, observation
                      checklists, and practical assessments in simulated settings.
                    </li>
                    <li>
                      <strong>Workplace experience:</strong> validated workplace
                      evidence, supervisor feedback, and reports.
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
              data={assessments}
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
                onUpload={(files) =>
                  toast.success(
                    `${files.length} document(s) queued — your facilitator will verify.`,
                  )
                }
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
