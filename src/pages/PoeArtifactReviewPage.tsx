import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, PenTool, Send, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import {
  poeArtifactService,
  directoryService,
  type PoeArtifact,
} from '../services/api';
import {
  canRoleActOnPoe,
  poeKindLabel,
  poeStageLabel,
  workflowStepForPoeRole,
} from '../utils/poeWorkflow';

export function PoeArtifactReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role ?? '';

  const [artifact, setArtifact] = useState<PoeArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [assessorId, setAssessorId] = useState('');
  const [moderatorId, setModeratorId] = useState('');
  const [moderationDecision, setModerationDecision] = useState<
    'approve' | 'reject'
  >('approve');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [staffOptions, setStaffOptions] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void poeArtifactService
      .getById(id)
      .then((res) => {
        if (cancelled) return;
        const a = res.data;
        setArtifact(a);
        setFeedback(
          a.moderatorFeedback ??
            a.assessorFeedback ??
            a.facilitatorFeedback ??
            '',
        );
        setAssessorId(a.assessorId ?? '');
        setModeratorId(a.moderatorId ?? '');
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load PoE item');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!userRole || userRole === 'Learner') return;
    void directoryService.staff({ roles: ['ASSESSOR', 'MODERATOR'], pageSize: 50 }).then((res) => {
      const list = (res.data?.items ?? []).map((u) => {
        const roleCode = u.role;
        const roleLabel =
          roleCode === 'ASSESSOR'
            ? 'Assessor'
            : roleCode === 'MODERATOR'
              ? 'Moderator'
              : roleCode === 'FACILITATOR'
                ? 'Facilitator'
                : roleCode;
        return {
          id: u.id,
          name: u.name,
          role: roleLabel,
        };
      });
      setStaffOptions(list);
    });
  }, [userRole]);

  const canAct = useMemo(
    () => (artifact ? canRoleActOnPoe(userRole, artifact.status) : false),
    [artifact, userRole],
  );

  const workflowStep = workflowStepForPoeRole(userRole);

  const assessors = staffOptions.filter((s) => s.role === 'Assessor');
  const moderators = staffOptions.filter((s) => s.role === 'Moderator');

  const marker = useMemo(() => {
    switch (userRole) {
      case 'Assessor':
        return {
          label: 'Assessor',
          textClass: 'text-red-700',
          borderClass: 'border-red-300',
          bgClass: 'bg-red-50',
        };
      case 'Moderator':
        return {
          label: 'Moderator',
          textClass: 'text-emerald-700',
          borderClass: 'border-emerald-300',
          bgClass: 'bg-emerald-50',
        };
      default:
        return {
          label: 'Facilitator',
          textClass: 'text-blue-700',
          borderClass: 'border-blue-300',
          bgClass: 'bg-blue-50',
        };
    }
  }, [userRole]);

  const handleSubmit = async () => {
    if (!id || !artifact) return;
    if (!canAct) {
      toast.error('This item is not at your workflow stage');
      return;
    }
    try {
      if (userRole === 'Learner') {
        if (evidenceFile) {
          setUploading(true);
          await poeArtifactService.uploadEvidence(artifact, evidenceFile);
        } else if (!artifact.evidenceVerified) {
          toast.error('Attach a verified evidence file before submitting');
          return;
        }
        await poeArtifactService.transition(id, 'submit');
        toast.success('Submitted for facilitator marking');
      } else if (userRole === 'Facilitator') {
        await poeArtifactService.transition(id, 'facilitator_mark', {
          feedback,
        });
        if (!assessorId) {
          toast.error('Select an assessor to allocate');
          return;
        }
        await poeArtifactService.transition(id, 'allocate_assessor', {
          assessorId,
        });
        toast.success('Marked and sent to assessor for review');
      } else if (userRole === 'Assessor') {
        await poeArtifactService.transition(id, 'assessor_mark', { feedback });
        if (!moderatorId) {
          toast.error('Select a moderator for sign-off');
          return;
        }
        await poeArtifactService.transition(id, 'submit_moderation', {
          moderatorId,
        });
        toast.success('Assessor review complete — awaiting moderation');
      } else if (userRole === 'Moderator') {
        await poeArtifactService.transition(
          id,
          moderationDecision === 'approve'
            ? 'moderate_approve'
            : 'moderate_reject',
          { feedback },
        );
        toast.success(
          moderationDecision === 'approve'
            ? 'Moderation approved'
            : 'Moderation rejected',
        );
      } else {
        toast.error('Your role cannot act at this stage');
        return;
      }
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-gray-500">Loading…</p>;
  }

  if (!artifact) {
    return <p className="p-6 text-red-600">PoE item not found.</p>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {artifact.title}
          </h1>
          <p className="text-sm text-gray-500">
            {poeKindLabel(artifact.kind)} · {artifact.learnerName} ·{' '}
            {artifact.programmeName}
          </p>
        </div>
        <Badge variant="info">{poeStageLabel(artifact.status)}</Badge>
      </div>

      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Knowledge module workflow
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
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Learner submission</h2>
          {artifact.url ? (
            <a
              href={artifact.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand-navy underline">
              Open submitted file
            </a>
          ) : (
            <p className="text-sm text-gray-600">
              Learner workbook or summative instrument — attach the completed PDF
              from the learner profile or learning library.
            </p>
          )}
          {userRole === 'Learner' && artifact.status === 'ISSUED_TO_LEARNER' && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-700">
              <Upload className="h-4 w-4" />
              <span>{evidenceFile?.name ?? 'Choose evidence file'}</span>
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mp3,.wav,.txt,.csv,.docx,.xlsx,.pptx"
                onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              />
            </label>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Verified evidence files: {artifact.evidenceCount ?? 0}
          </p>
        </Card>

        {(artifact.facilitatorFeedback || artifact.assessorFeedback) && (
          <Card className="p-4 space-y-3">
            {artifact.facilitatorFeedback && (
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase">
                  Facilitator remarks
                </p>
                <p className="text-sm text-gray-700">
                  {artifact.facilitatorFeedback}
                </p>
              </div>
            )}
            {artifact.assessorFeedback && (
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase">
                  Assessor remarks
                </p>
                <p className="text-sm text-gray-700">
                  {artifact.assessorFeedback}
                </p>
              </div>
            )}
          </Card>
        )}

        {canAct && userRole !== 'Learner' && (
          <Card className={`p-4 border-2 ${marker.borderClass}`}>
            <div className={`flex items-center gap-2 mb-3 ${marker.bgClass} p-2 rounded`}>
              <PenTool className={`h-4 w-4 ${marker.textClass}`} />
              <span className={`text-sm font-medium ${marker.textClass}`}>
                {marker.label} action
              </span>
            </div>

            {userRole === 'Facilitator' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Allocate assessor
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={assessorId}
                  onChange={(e) => setAssessorId(e.target.value)}>
                  <option value="">Select assessor…</option>
                  {assessors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {userRole === 'Assessor' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Allocate moderator
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={moderatorId}
                  onChange={(e) => setModeratorId(e.target.value)}>
                  <option value="">Select moderator…</option>
                  {moderators.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {userRole === 'Moderator' && (
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
            )}

            <label className="block text-xs font-medium text-gray-700 mb-1">
              {userRole === 'Moderator'
                ? 'Moderation comments'
                : userRole === 'Assessor'
                  ? 'Review remarks (marking quality, competency)'
                  : 'Marking feedback'}
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className={`w-full text-sm border rounded-md px-3 py-2 ${marker.borderClass}`}
              placeholder={
                userRole === 'Assessor'
                  ? 'Note any incorrect marking or competency concerns…'
                  : 'Enter remarks for this stage…'
              }
            />
          </Card>
        )}

        {!canAct && (
          <p className="text-sm text-amber-700">
            Read-only — {poeStageLabel(artifact.status)}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          {canAct && (
            <Button disabled={uploading} leftIcon={<Send className="h-4 w-4" />} onClick={() => void handleSubmit()}>
              {userRole === 'Learner'
                ? 'Submit to facilitator'
                : userRole === 'Facilitator'
                  ? 'Submit marks for assessor'
                  : userRole === 'Assessor'
                    ? 'Complete assessor review'
                    : moderationDecision === 'approve'
                      ? 'Approve moderation'
                      : 'Reject moderation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
