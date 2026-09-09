import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Flag,
  Save,
  AlertTriangle } from
'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { FileUpload } from '../components/ui/FileUpload';
import { Modal } from '../components/ui/Modal';
import { assessmentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type {
  Question,
  MultipleChoiceQuestion,
  EssayQuestion,
  FileUploadQuestion,
  AssessmentInstance,
} from '../types';

function responseText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function AssessmentTakingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { linkedLearnerId } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [headerTitle, setHeaderTitle] = useState('Assessment');
  const [headerSubtitle, setHeaderSubtitle] = useState('');
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(true);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const buildResponsePayload = useCallback(
    () =>
      Object.entries(responses).map(([questionId, answer]) => ({
        questionId,
        answer,
      })),
    [responses],
  );

  useEffect(() => {
    if (!id) {
      setLoadingAssessment(false);
      setLoadError('Missing assessment id');
      return;
    }
    let cancelled = false;
    setLoadingAssessment(true);
    assessmentService
      .getById(id)
      .then(async (res) => {
        if (cancelled) return;
        const a = res.data;
        setHeaderTitle(a.title);
        setHeaderSubtitle(
          [a.moduleName, a.programmeName].filter(Boolean).join(' • ') ||
            '',
        );
        setQuestions(a.questions ?? []);
        setEnrollmentId(a.enrollmentId ?? linkedLearnerId ?? null);
        setLoadError(null);

        try {
          const attempt = await assessmentService.startAttempt(id);
          const sub = attempt.data as {
            id?: string;
            responses?: Array<{ questionId: string; answer: unknown }>;
            expiresAt?: string | null;
            timeLimitMinutes?: number | null;
            expired?: boolean;
          };
          if (sub.id) setSubmissionId(sub.id);
          if (sub.expiresAt) {
            const remaining = Math.floor(
              (new Date(sub.expiresAt).getTime() - Date.now()) / 1000,
            );
            setTimeLeft(Math.max(0, remaining));
          } else if (sub.timeLimitMinutes && sub.timeLimitMinutes > 0) {
            setTimeLeft(sub.timeLimitMinutes * 60);
          } else {
            setTimeLeft(null);
          }
          if (sub.expired) {
            setLoadError('Assessment time has expired');
          }
          if (Array.isArray(sub.responses) && sub.responses.length) {
            const restored: Record<string, unknown> = {};
            for (const r of sub.responses) {
              if (r.questionId) restored[r.questionId] = r.answer;
            }
            setResponses(restored);
          }
        } catch {
          /* start-attempt may fail for staff preview */
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load assessment');
      })
      .finally(() => {
        if (!cancelled) setLoadingAssessment(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, linkedLearnerId]);

  const handleSaveProgress = useCallback(async () => {
    if (!submissionId) {
      toast.error('No in-progress attempt to save');
      return;
    }
    try {
      await assessmentService.saveProgress(submissionId, buildResponsePayload());
      toast.success('Progress saved — you can resume later');
      navigate('/learner-assessments');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save progress',
      );
    }
  }, [submissionId, buildResponsePayload, navigate]);

  useEffect(() => {
    if (!submissionId || isSubmitted) return;
    const timer = setInterval(() => {
      void assessmentService
        .saveProgress(submissionId, buildResponsePayload())
        .catch(() => undefined);
    }, 30_000);
    return () => clearInterval(timer);
  }, [submissionId, isSubmitted, buildResponsePayload]);

  const handleSubmit = useCallback(async () => {
    if (!id || submitting) return;
    const enroll = enrollmentId ?? linkedLearnerId;
    if (!enroll) {
      toast.error('Missing enrolment — cannot submit assessment');
      return;
    }
    setSubmitting(true);
    try {
      const payload = Object.entries(responses).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      await assessmentService.submitInstance({
        learnerId: enroll,
        assessmentId: id,
        responses: payload as AssessmentInstance['responses'],
      });
      setIsSubmitted(true);
      setShowSubmitModal(false);
      toast.success('Assessment submitted');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit assessment',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    id,
    submitting,
    enrollmentId,
    linkedLearnerId,
    responses,
  ]);

  useEffect(() => {
    if (
      timeLeft === null ||
      isSubmitted ||
      !questions.length ||
      loadingAssessment ||
      loadError
    )
      return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 0) {
          clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    isSubmitted,
    questions.length,
    loadingAssessment,
    loadError,
    handleSubmit,
    timeLeft,
  ]);

  if (loadingAssessment) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (loadError || !id) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
        <p className="text-gray-700 mb-4">{loadError ?? 'Invalid assessment'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <p className="text-gray-700 mb-2 font-medium">
          No questions for this assessment yet
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Your facilitator or administrator still needs to attach question items
          to this unit standard assessment.
        </p>
        <Button variant="outline" onClick={() => navigate('/learner-assessments')}>
          Back to assessments
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress =
    questions.length > 0
      ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100)
      : 0;
  const answeredCount = Object.keys(responses).length;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const handleAnswer = (value: unknown) => {
    setResponses({
      ...responses,
      [currentQuestion.id]: value
    });
  };
  const toggleMarkForReview = () => {
    const newSet = new Set(markedForReview);
    if (newSet.has(currentQuestion.id)) {
      newSet.delete(currentQuestion.id);
    } else {
      newSet.add(currentQuestion.id);
    }
    setMarkedForReview(newSet);
  };
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Assessment Submitted!
          </h2>
          <p className="text-gray-600 mb-8">
            Your answers have been recorded successfully. You will receive
            feedback once grading is complete.
          </p>
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => navigate('/learner-assessments')}>
              
              Back to Assessments
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/learner-dashboard')}>
              
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>);

  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{headerTitle}</h1>
            <p className="text-xs text-gray-500">{headerSubtitle}</p>
          </div>
          <div className="flex items-center gap-6">
            <div
              className={`flex items-center font-mono font-medium text-lg ${timeLeft !== null && timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
              
              <Clock className="h-5 w-5 mr-2" />
              {timeLeft === null ? 'Untimed' : formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
        </div>
        <ProgressBar value={progress} size="sm" showValue={false} className="max-w-md" />
      </header>

      {/* Navigation Strip */}
      <div className="bg-white border-b border-gray-200 py-3 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-2 justify-center min-w-max">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIndex;
            const isAnswered = responses[q.id] !== undefined;
            const isMarked = markedForReview.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`
                  h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-all
                  ${isCurrent ? 'ring-2 ring-brand-navy ring-offset-2' : ''}
                  ${isMarked ? 'bg-amber-100 text-amber-700 border border-amber-300' : isAnswered ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-300 hover:bg-gray-50'}
                `}>
                
                {isMarked ? <Flag className="h-3 w-3" /> : idx + 1}
              </button>);

          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8">
        <Card className="min-h-[400px] flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Question {currentQuestionIndex + 1}
            </span>
            <span className="text-sm font-medium text-gray-500">
              {currentQuestion.points} Points
            </span>
          </div>

          <h2 className="text-xl font-medium text-gray-900 mb-8 leading-relaxed">
            {currentQuestion.content}
          </h2>

          <div className="flex-1">
            {currentQuestion.type === 'multiple_choice' &&
            <div className="space-y-3">
                {(currentQuestion as MultipleChoiceQuestion).options.map((opt) =>
              <label
                key={opt.id}
                className={`
                      flex items-center p-4 border rounded-lg cursor-pointer transition-all
                      ${responses[currentQuestion.id] === opt.id ? 'border-brand-navy bg-blue-50 ring-1 ring-brand-navy' : 'border-gray-200 hover:bg-gray-50'}
                    `}>
                
                    <input
                  type="radio"
                  name={currentQuestion.id}
                  className="h-4 w-4 text-brand-navy border-gray-300 focus:ring-brand-navy"
                  checked={responses[currentQuestion.id] === opt.id}
                  onChange={() => handleAnswer(opt.id)} />
                
                    <span className="ml-3 text-gray-700">{opt.text}</span>
                  </label>
              )}
              </div>
            }

            {currentQuestion.type === 'true_false' &&
            <div className="flex gap-4">
                {[true, false].map((val) =>
              <button
                key={String(val)}
                onClick={() => handleAnswer(val)}
                className={`
                      flex-1 py-6 rounded-lg border-2 text-lg font-medium transition-all
                      ${responses[currentQuestion.id] === val ? 'border-brand-navy bg-blue-50 text-brand-navy' : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                    `}>
                
                    {val ? 'True' : 'False'}
                  </button>
              )}
              </div>
            }

            {currentQuestion.type === 'essay' &&
            <div className="space-y-2">
                <textarea
                rows={8}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-brand-navy focus:border-brand-navy"
                placeholder="Type your answer here..."
                value={responseText(responses[currentQuestion.id])}
                onChange={(e) => handleAnswer(e.target.value)} />
              
                <div className="text-right text-xs text-gray-500">
                  {
                responseText(responses[currentQuestion.id]).
                split(/\s+/).
                filter(Boolean).length
                }{' '}
                  / {(currentQuestion as EssayQuestion).wordLimit ?? 500} words
                </div>
              </div>
            }

            {currentQuestion.type === 'file_upload' &&
            <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-2">
                  {(currentQuestion as FileUploadQuestion).instructions}
                </p>
                <FileUpload
                multiple={false}
                onUpload={async (files) => {
                  const f = files[0];
                  if (!f) return;
                  if (!submissionId) {
                    const error = new Error('Start the attempt before uploading a file');
                    toast.error(error.message);
                    throw error;
                  }
                  try {
                    const res = await assessmentService.uploadAnswerFile(
                      submissionId,
                      currentQuestion.id,
                      f,
                    );
                    const uploaded = res.data?.uploaded;
                    handleAnswer(uploaded ?? { fileName: f.name });
                    toast.success('File uploaded and verified');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Upload failed');
                    throw error;
                  }
                }}
                accept=".pdf,.doc,.docx,.zip" />
              
                {Boolean(
                  typeof responses[currentQuestion.id] === 'object' &&
                    responses[currentQuestion.id] &&
                    'fileName' in (responses[currentQuestion.id] as object)
                    ? (responses[currentQuestion.id] as { fileName?: string }).fileName
                    : responseText(responses[currentQuestion.id]),
                ) &&
              <div className="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    File uploaded:{' '}
                    {typeof responses[currentQuestion.id] === 'object' &&
                    responses[currentQuestion.id] &&
                    'fileName' in (responses[currentQuestion.id] as object)
                      ? String(
                          (responses[currentQuestion.id] as { fileName?: string })
                            .fileName,
                        )
                      : responseText(responses[currentQuestion.id])}
                  </div>
              }
              </div>
            }
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center">
            <label className="flex items-center cursor-pointer text-sm text-gray-600 hover:text-gray-900">
              <input
                type="checkbox"
                className="h-4 w-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 mr-2"
                checked={markedForReview.has(currentQuestion.id)}
                onChange={toggleMarkForReview} />
              
              Mark for review
            </label>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() =>
            setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
            }
            disabled={currentQuestionIndex === 0}
            leftIcon={<ChevronLeft className="h-4 w-4" />}>
            
            Previous
          </Button>

          <Button
            variant="ghost"
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => void handleSaveProgress()}>
            
            Save & Exit
          </Button>

          {currentQuestionIndex === questions.length - 1 ?
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setShowSubmitModal(true)}
            rightIcon={<CheckCircle className="h-4 w-4" />}>
            
              Review & Submit
            </Button> :

          <Button
            onClick={() =>
            setCurrentQuestionIndex((prev) =>
            Math.min(questions.length - 1, prev + 1)
            )
            }
            rightIcon={<ChevronRight className="h-4 w-4" />}>
            
              Next
            </Button>
          }
        </div>
      </footer>

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Assessment?">
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">
                {answeredCount}
              </div>
              <div className="text-xs text-blue-600">Answered</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {questions.length - answeredCount}
              </div>
              <div className="text-xs text-gray-600">Unanswered</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">
                {markedForReview.size}
              </div>
              <div className="text-xs text-amber-600">Marked</div>
            </div>
          </div>

          {questions.length - answeredCount > 0 &&
          <div className="flex items-start p-3 bg-red-50 text-red-700 rounded-md text-sm">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              You have unanswered questions. Are you sure you want to submit?
            </div>
          }

          <p className="text-sm text-gray-600">
            Once submitted, you will not be able to change your answers.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Go Back
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => void handleSubmit()}
              isLoading={submitting}>
              
              Submit Assessment
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}
