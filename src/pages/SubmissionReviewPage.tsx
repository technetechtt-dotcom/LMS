import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Search,
  Download,
  Save,
  Send,
  PenTool,
  MessageSquare } from
'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { assessmentService, directoryService, moderationService } from '../services/api';
import type { Assessment, Question, QuestionResponse } from '../types';
import { competencyFromScore, formatAnswerDisplay } from '../utils/grading';
import {
  canRoleEditSubmission,
  submissionStageLabel,
  workflowStepForRole,
} from '../utils/assessmentWorkflow';

function initialsFromName(name: string): string {
  const p = name.split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function SubmissionReviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const context = useOutletContext<{
    userRole?: string;
  }>();
  const userRole = context?.userRole || 'Facilitator';
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    null,
  );
  const [instanceResponses, setInstanceResponses] = useState<QuestionResponse[]>(
    [],
  );
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [instances, setInstances] = useState<
    Array<{
      id: string;
      name: string;
      status: string;
      score: number | null;
      time: string;
      avatar: string;
    }>
  >([]);

  const [moderationHistory, setModerationHistory] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [moderatorOptions, setModeratorOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [allocateModeratorId, setAllocateModeratorId] = useState('');
  const [moderationDecision, setModerationDecision] = useState<'approve' | 'reject'>(
    'approve',
  );
  const [moderationComments, setModerationComments] = useState('');

  useEffect(() => {
    if (!id) return;
    moderationService
      .history(id)
      .then((res) => {
        const rows = res.data;
        setModerationHistory(
          Array.isArray(rows) ? rows : rows ? [rows as Record<string, unknown>] : [],
        );
      })
      .catch(() => setModerationHistory([]));
  }, [id]);

  useEffect(() => {
    if (userRole !== 'SDP Admin' && userRole !== 'Facilitator') return;
    directoryService
      .staff({ roles: ['MODERATOR'], pageSize: 50 })
      .then((res) => {
        setModeratorOptions(
          (res.data?.items ?? []).map((u) => ({
              value: u.id,
              label: u.name,
            })),
        );
      })
      .catch(() => setModeratorOptions([]));
  }, [userRole]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    assessmentService
      .listInstances()
      .then((res) => {
        if (cancelled) return;
        const forAssessment = (res.data ?? []).filter(
          (s) => s.assessmentId === id,
        );
        const mapped = forAssessment.map((s) => ({
          id: s.id,
          name: s.learnerName ?? 'Learner',
          status: s.status,
          score: s.percentage ?? s.score ?? null,
          time: s.submittedAt
            ? new Date(s.submittedAt).toLocaleString()
            : '—',
          avatar: initialsFromName(s.learnerName ?? 'L'),
        }));
        setInstances(mapped);
        if (mapped[0]?.id) setSelectedSubmissionId(mapped[0].id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!selectedSubmissionId) return;
    let cancelled = false;
    assessmentService
      .getInstance(selectedSubmissionId)
      .then((res) => {
        if (cancelled) return;
        const inst = res.data;
        const responses = Array.isArray(inst.responses)
          ? (inst.responses as QuestionResponse[])
          : [];
        setInstanceResponses(responses);
        const g: Record<string, number> = {};
        const f: Record<string, string> = {};
        for (const r of responses) {
          if (r.score != null) g[r.questionId] = r.score;
          if (r.feedback) f[r.questionId] = r.feedback;
        }
        setGrades(g);
        setFeedback(f);
        setComments({});
        if (!questions.length && responses.length) {
          setQuestions(
            responses.map((r, idx) => ({
              id: r.questionId,
              assessmentId: id ?? '',
              type: r.questionType,
              content: `Question ${idx + 1}`,
              points: r.maxScore,
              order: idx + 1,
              isRequired: true,
            })) as Question[],
          );
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load submission');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubmissionId, id, questions.length]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('Missing assessment id');
      return;
    }
    let cancelled = false;
    setLoading(true);
    assessmentService
      .getById(id)
      .then((res) => {
        if (cancelled) return;
        const a = res.data;
        setAssessment(a);
        setQuestions(a.questions ?? []);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load assessment');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const submissions = useMemo(() => {
    if (instances.length) return instances;
    if (!assessment?.learnerName) return [];
    const sid = assessment.enrollmentId ?? assessment.id;
    return [
      {
        id: sid,
        name: assessment.learnerName,
        status: 'Submitted',
        score: null as number | null,
        time: assessment.assessedAt
          ? new Date(assessment.assessedAt).toLocaleString()
          : '—',
        avatar: initialsFromName(assessment.learnerName),
      },
    ];
  }, [assessment, instances]);
  // Color-coded marking based on role
  const getMarkerConfig = () => {
    switch (userRole) {
      case 'Assessor':
        return {
          color: 'red',
          label: 'Assessor',
          bgClass: 'bg-red-50',
          borderClass: 'border-red-200',
          textClass: 'text-red-700',
          ringClass: 'ring-red-300',
          dotClass: 'bg-red-500',
          penLabel: 'Red Pen (Assessor)'
        };
      case 'Moderator':
        return {
          color: 'green',
          label: 'Moderator',
          bgClass: 'bg-green-50',
          borderClass: 'border-green-200',
          textClass: 'text-green-700',
          ringClass: 'ring-green-300',
          dotClass: 'bg-green-500',
          penLabel: 'Green Pen (Moderator)'
        };
      default:
        return {
          color: 'blue',
          label: 'Facilitator',
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-200',
          textClass: 'text-blue-700',
          ringClass: 'ring-blue-300',
          dotClass: 'bg-blue-500',
          penLabel: 'Blue Pen (Facilitator)'
        };
    }
  };
  const marker = getMarkerConfig();
  const selectedSubmission = submissions.find(
    (s) => s.id === selectedSubmissionId,
  );
  const canEdit =
    selectedSubmission != null &&
    canRoleEditSubmission(userRole, selectedSubmission.status);
  const workflowStep = workflowStepForRole(userRole);
  const headerStats = useMemo(() => {
    const submitted = submissions.filter((s) =>
      ['submitted', 'grading', 'completed'].includes(s.status),
    ).length;
    const graded = submissions.filter((s) => s.status === 'completed').length;
    const scores = submissions
      .map((s) => s.score)
      .filter((n): n is number => n != null);
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    return { submitted, graded, avg };
  }, [submissions]);

  const responseForQuestion = (questionId: string) =>
    instanceResponses.find((r) => r.questionId === questionId);
  const handleGradeChange = (qId: string, score: number) => {
    setGrades({
      ...grades,
      [qId]: score
    });
  };
  const handleFeedbackChange = (qId: string, text: string) => {
    setFeedback({
      ...feedback,
      [qId]: text
    });
  };
  const handleCommentChange = (qId: string, text: string) => {
    setComments({
      ...comments,
      [qId]: text
    });
  };
  const handleSubmitGrades = async () => {
    const submissionId = selectedSubmissionId;
    if (!submissionId || !id) {
      toast.error('No submission selected');
      return;
    }
    if (!canEdit) {
      toast.error('This submission is not at your workflow stage');
      return;
    }
    const gradePayload = Object.entries(grades).map(([questionId, score]) => ({
      questionId,
      score,
      feedback: [feedback[questionId], comments[questionId]]
        .filter(Boolean)
        .join(' — '),
    }));
    const totalMarks = questions.reduce((a, q) => a + q.points, 0);
    const earned = Object.values(grades).reduce((a, b) => a + b, 0);
    const passMark = assessment?.passMark ?? 50;
    const previewResult = competencyFromScore(earned, totalMarks, passMark);
    try {
      if (userRole === 'Moderator') {
        await assessmentService.moderate(
          submissionId,
          moderationDecision,
          moderationComments ||
            (moderationDecision === 'approve'
              ? 'Moderation approved'
              : 'Moderation rejected'),
        );
        toast.success(
          moderationDecision === 'approve'
            ? 'Moderation approved'
            : 'Moderation rejected',
        );
      } else if (userRole === 'Facilitator') {
        if (!gradePayload.length) {
          toast.error('Enter at least one score');
          return;
        }
        await assessmentService.humanGrade(submissionId, gradePayload);
        await assessmentService.completeFacilitatorGrading(submissionId);
        toast.success('Marks submitted for assessor review');
      } else if (userRole === 'Assessor') {
        if (!gradePayload.length) {
          toast.error('Enter at least one score');
          return;
        }
        await assessmentService.humanGrade(submissionId, gradePayload);
        await assessmentService.completeGrading(submissionId);
        const finalised = await assessmentService.finaliseResult(id, {
          result: previewResult,
          feedback:
            Object.values(feedback).filter(Boolean).join('\n') || undefined,
        });
        const serverResult =
          (finalised.data as { result?: string })?.result ?? previewResult;
        toast.success(
          `Assessor review complete — ${serverResult === 'C' ? 'Competent' : 'Not Yet Competent'}. Awaiting moderator sign-off.`,
        );
      } else {
        toast.error('Your role cannot submit at this workflow stage');
        return;
      }
      navigate(-1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit',
      );
    }
  };

  const handleSaveDraft = async () => {
    const submissionId = selectedSubmissionId;
    if (!submissionId || !canEdit) return;
    if (userRole === 'Moderator') return;
    const gradePayload = Object.entries(grades).map(([questionId, score]) => ({
      questionId,
      score,
      feedback: feedback[questionId],
    }));
    if (!gradePayload.length) {
      toast.error('Enter at least one score');
      return;
    }
    try {
      await assessmentService.humanGrade(submissionId, gradePayload);
      toast.success('Draft saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (loadError || !id) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-700 mb-4">{loadError ?? 'Invalid page'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700">
            
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {assessment?.title ?? 'Assessment review'}
            </h1>
            <p className="text-xs text-gray-500">
              {[assessment?.moduleName, assessment?.programmeName]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Marker Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${marker.bgClass} border ${marker.borderClass}`}>
            
            <PenTool className={`h-4 w-4 ${marker.textClass}`} />
            <span className={`text-sm font-medium ${marker.textClass}`}>
              {marker.penLabel}
            </span>
          </div>
          <div className="text-center px-4 border-l border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{headerStats.submitted}</div>
            <div className="text-xs text-gray-500">Submitted</div>
          </div>
          <div className="text-center px-4 border-l border-gray-200">
            <div className="text-2xl font-bold text-green-600">{headerStats.graded}</div>
            <div className="text-xs text-gray-500">Graded</div>
          </div>
          <div className="text-center px-4 border-l border-gray-200">
            <div className="text-2xl font-bold text-brand-navy">{headerStats.avg}%</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Assessment workflow
        </p>
        <ol className="flex flex-wrap gap-2 text-xs">
          {[
            'Learner submits',
            'Facilitator marks',
            'Assessor reviews',
            'Moderator approves',
          ].map((label, i) => (
            <li
              key={label}
              className={`px-3 py-1 rounded-full border ${
                i + 1 === workflowStep
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : i + 1 < workflowStep
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-white text-slate-500 border-slate-200'
              }`}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        {selectedSubmission && (
          <p className="text-sm text-slate-600 mt-2">
            Current stage:{' '}
            <strong>{submissionStageLabel(selectedSubmission.status)}</strong>
          </p>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <Input
              placeholder="Search learners..."
              icon={<Search className="h-4 w-4" />} />
            
          </div>
          <div className="flex-1 overflow-y-auto">
            {submissions.map((sub) =>
            <button
              key={sub.id}
              onClick={() => setSelectedSubmissionId(sub.id)}
              className={`w-full flex items-center p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedSubmissionId === sub.id ? 'bg-blue-50 border-l-4 border-l-brand-navy' : ''}`}>
              
                <Avatar initials={sub.avatar} className="mr-3 h-10 w-10" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">
                    {sub.name}
                  </div>
                  <div className="text-xs text-gray-500">{sub.time}</div>
                </div>
                <div className="text-right">
                  <Badge
                  variant={
                  sub.status === 'completed' ?
                  'success' :
                  sub.status === 'assessor_verified' ?
                  'warning' :
                  sub.status === 'facilitator_graded' ?
                  'info' :
                  'neutral'
                  }>
                  
                    {submissionStageLabel(sub.status)}
                  </Badge>
                  {sub.score &&
                <div className="text-xs font-bold mt-1">{sub.score}%</div>
                }
                </div>
              </button>
            )}
          </div>
          {(userRole === 'SDP Admin' || userRole === 'Facilitator') &&
            moderatorOptions.length > 0 && (
              <div className="p-4 border-t border-gray-200 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Allocate moderator
                </p>
                <select
                  className="w-full rounded-md border-gray-300 text-sm"
                  value={allocateModeratorId}
                  onChange={(e) => setAllocateModeratorId(e.target.value)}>
                  <option value="">Select moderator</option>
                  {moderatorOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!allocateModeratorId}
                  onClick={async () => {
                    if (!id || !allocateModeratorId) return;
                    try {
                      await moderationService.allocate(id, allocateModeratorId);
                      toast.success('Moderator allocated');
                      const hist = await moderationService.history(id);
                      const rows = hist.data;
                      setModerationHistory(
                        Array.isArray(rows)
                          ? rows
                          : rows
                            ? [rows as Record<string, unknown>]
                            : [],
                      );
                    } catch {
                      toast.error('Could not allocate moderator');
                    }
                  }}>
                  Allocate
                </Button>
              </div>
            )}
          {moderationHistory.length > 0 && (
            <div className="p-4 border-t border-gray-200 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Moderation history
              </p>
              <ul className="space-y-1 text-xs text-gray-600">
                {moderationHistory.map((row, i) => (
                  <li key={i}>
                    {String(row.action ?? row.decision ?? 'Record')} —{' '}
                    {String(row.at ?? row.createdAt ?? '')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Grading Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Learner Info Card */}
            <Card className="mb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Avatar
                    initials={selectedSubmission?.avatar || ''}
                    size="lg" />
                  
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedSubmission?.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Submitted {selectedSubmission?.time}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Score</div>
                  <div className="text-3xl font-bold text-brand-navy">
                    {Object.values(grades).reduce((a, b) => a + b, 0)} /{' '}
                    {questions.reduce((a, q) => a + q.points, 0)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Questions List */}
            {questions.map((q, idx) =>
            <Card key={q.id} className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs text-gray-500 uppercase font-medium">
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {q.points} Points
                  </span>
                </div>

                <p className="text-gray-900 font-medium mb-4">{q.content}</p>

                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Learner Answer:
                  </p>
                  {(() => {
                    const resp = responseForQuestion(q.id);
                    if (q.type === 'file_upload' && resp?.fileName) {
                      return (
                        <div className="flex items-center gap-2 text-brand-blue">
                          <Download className="h-4 w-4" />
                          {resp.fileName}
                        </div>
                      );
                    }
                    return (
                      <p className="text-gray-800">
                        {formatAnswerDisplay(resp?.answer ?? null)}
                      </p>
                    );
                  })()}
                </div>

                {/* Grading Controls - Color coded by role */}
                {userRole === 'Moderator' ? (
                <div className={`border-t-2 ${marker.borderClass} pt-4`}>
                  <p className="text-sm text-gray-600">
                    Score: {grades[q.id] ?? '—'} / {q.points}
                  </p>
                  {feedback[q.id] && (
                    <p className="text-xs text-gray-500 mt-1">
                      Feedback: {feedback[q.id]}
                    </p>
                  )}
                </div>
                ) : canEdit ? (
                <div
                className={`border-t-2 ${marker.borderClass} pt-4 space-y-3`}>
                
                  <div className="flex items-center gap-2 mb-2">
                    <div
                    className={`h-2.5 w-2.5 rounded-full ${marker.dotClass}`} />
                  
                    <span
                    className={`text-xs font-semibold uppercase tracking-wide ${marker.textClass}`}>
                    
                      {marker.label} Marking
                    </span>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-32">
                      <label
                      className={`block text-xs font-medium ${marker.textClass} mb-1`}>
                      
                        Score
                      </label>
                      <input
                      type="number"
                      max={q.points}
                      value={grades[q.id] || ''}
                      onChange={(e) =>
                      handleGradeChange(q.id, Number(e.target.value))
                      }
                      className={`w-full h-9 text-sm border rounded-md px-3 focus:outline-none focus:ring-2 ${marker.borderClass} ${marker.ringClass}`} />
                    
                    </div>
                    <div className="flex-1">
                      <label
                      className={`block text-xs font-medium ${marker.textClass} mb-1`}>
                      
                        Feedback
                      </label>
                      <input
                      type="text"
                      placeholder="Enter feedback for this answer..."
                      value={feedback[q.id] || ''}
                      onChange={(e) =>
                      handleFeedbackChange(q.id, e.target.value)
                      }
                      className={`w-full h-9 text-sm border rounded-md px-3 focus:outline-none focus:ring-2 ${marker.borderClass} ${marker.ringClass}`} />
                    
                    </div>
                  </div>

                  {/* Correction Comment */}
                  <div>
                    <label
                    className={`block text-xs font-medium ${marker.textClass} mb-1 flex items-center`}>
                    
                      <MessageSquare className="h-3 w-3 mr-1" /> Correction
                      Comment for Learner
                    </label>
                    <textarea
                    placeholder="Tell the learner where to make corrections..."
                    value={comments[q.id] || ''}
                    onChange={(e) =>
                    handleCommentChange(q.id, e.target.value)
                    }
                    rows={2}
                    className={`w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 resize-y ${marker.borderClass} ${marker.ringClass}`} />
                  
                  </div>
                </div>
                ) : null}
              </Card>
            )}

            {userRole === 'Moderator' && canEdit && (
              <Card className="p-4 border-green-200">
                <p className="text-sm text-gray-700 mb-3">
                  Review facilitator marking and assessor competency decision. Record your moderation outcome.
                </p>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={moderationDecision === 'approve'}
                      onChange={() => setModerationDecision('approve')}
                    />
                    Approve
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={moderationDecision === 'reject'}
                      onChange={() => setModerationDecision('reject')}
                    />
                    Reject / return
                  </label>
                </div>
                <textarea
                  placeholder="Moderation comments (sampling notes, marking quality, compliance)..."
                  value={moderationComments}
                  onChange={(e) => setModerationComments(e.target.value)}
                  rows={4}
                  className={`w-full text-sm border rounded-md px-3 py-2 ${marker.borderClass}`}
                />
              </Card>
            )}

            {/* Bottom Actions */}
            <div className="sticky bottom-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-2 py-1 rounded ${marker.bgClass}`}>
                  
                  <PenTool className={`h-3.5 w-3.5 ${marker.textClass}`} />
                  <span className={`text-xs font-medium ${marker.textClass}`}>
                    {userRole === 'Moderator'
                      ? 'Moderating as Moderator'
                      : `Marking as ${marker.label}`}
                  </span>
                </div>
                {userRole !== 'Moderator' && (
                <span className="text-sm text-gray-500">
                  <span className="font-medium text-gray-900">
                    {Object.keys(grades).length}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-gray-900">
                    {questions.length}
                  </span>{' '}
                  questions graded
                </span>
                )}
                {!canEdit && selectedSubmission && (
                  <span className="text-sm text-amber-700">
                    Read-only — {submissionStageLabel(selectedSubmission.status)}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {userRole !== 'Moderator' && (
                <Button
                  variant="outline"
                  leftIcon={<Save className="h-4 w-4" />}
                  disabled={!canEdit}
                  onClick={() => void handleSaveDraft()}>
                  Save Draft
                </Button>
                )}
                <Button
                  leftIcon={<Send className="h-4 w-4" />}
                  disabled={!canEdit}
                  onClick={() => void handleSubmitGrades()}>
                  
                  {userRole === 'Moderator'
                    ? moderationDecision === 'approve'
                      ? 'Approve moderation'
                      : 'Reject moderation'
                    : userRole === 'Facilitator'
                      ? 'Submit marks for assessor'
                      : userRole === 'Assessor'
                        ? 'Complete assessor review'
                        : 'Submit grades'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}
