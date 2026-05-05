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
import { assessmentService } from '../services/api';
import type { Assessment, Question } from '../types';

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
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(
    null,
  );
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

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
        const sid = a.enrollmentId ?? a.id;
        setSelectedLearnerId(sid);
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
  }, [assessment]);
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
  const selectedSubmission = submissions.find((s) => s.id === selectedLearnerId);
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
  const handleSubmitGrades = () => {
    toast.success(`Grades submitted as ${marker.label}`);
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
            <div className="text-2xl font-bold text-gray-900">67</div>
            <div className="text-xs text-gray-500">Submitted</div>
          </div>
          <div className="text-center px-4 border-l border-gray-200">
            <div className="text-2xl font-bold text-green-600">45</div>
            <div className="text-xs text-gray-500">Graded</div>
          </div>
          <div className="text-center px-4 border-l border-gray-200">
            <div className="text-2xl font-bold text-brand-navy">74%</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>
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
              onClick={() => setSelectedLearnerId(sub.id)}
              className={`w-full flex items-center p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedLearnerId === sub.id ? 'bg-blue-50 border-l-4 border-l-brand-navy' : ''}`}>
              
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
                  sub.status === 'Graded' ?
                  'success' :
                  sub.status === 'Submitted' ?
                  'info' :
                  'neutral'
                  }>
                  
                    {sub.status}
                  </Badge>
                  {sub.score &&
                <div className="text-xs font-bold mt-1">{sub.score}%</div>
                }
                </div>
              </button>
            )}
          </div>
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

                {/* Mock Answer Display */}
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Learner Answer:
                  </p>
                  {q.type === 'essay' ?
                <p className="text-gray-800">
                      Client-side rendering happens in the browser using
                      JavaScript, which can reduce server load but may have
                      slower initial load times. Server-side rendering generates
                      HTML on the server, improving SEO and initial load
                      performance.
                    </p> :
                q.type === 'file_upload' ?
                <div className="flex items-center gap-2 text-brand-blue underline cursor-pointer">
                      <Download className="h-4 w-4" /> project_portfolio.pdf
                    </div> :

                <p className="text-gray-800">Hyper Text Markup Language</p>
                }
                </div>

                {/* Grading Controls - Color coded by role */}
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
              </Card>
            )}

            {/* Bottom Actions */}
            <div className="sticky bottom-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-2 py-1 rounded ${marker.bgClass}`}>
                  
                  <PenTool className={`h-3.5 w-3.5 ${marker.textClass}`} />
                  <span className={`text-xs font-medium ${marker.textClass}`}>
                    Marking as {marker.label}
                  </span>
                </div>
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
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  leftIcon={<Save className="h-4 w-4" />}>
                  
                  Save Draft
                </Button>
                <Button
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={handleSubmitGrades}>
                  
                  Submit Grades
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}