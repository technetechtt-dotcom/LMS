import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  CheckCircle,
  Star,
  Bot,
  MessageSquare,
  CalendarCheck,
  Download,
  HelpCircle,
  Upload,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useAuth } from '../contexts/AuthContext';
import {
  assessmentService,
  learnerService,
  materialService,
} from '../services/api';
import type { AssessmentInstance, Learner } from '../types';

export function LearnerDashboardPage() {
  const navigate = useNavigate();
  const { user, linkedLearnerId } = useAuth();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [instances, setInstances] = useState<AssessmentInstance[]>([]);
  const [materialCount, setMaterialCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!linkedLearnerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [learnerRes, instRes, matRes] = await Promise.all([
          learnerService.getById(linkedLearnerId),
          assessmentService.listInstances(),
          materialService.getAll({ programme: undefined }),
        ]);
        if (cancelled) return;
        setLearner(learnerRes.data);
        setInstances(instRes.data ?? []);
        const programmeId = learnerRes.data?.programmeId;
        const mats = matRes.data ?? [];
        setMaterialCount(
          programmeId
            ? mats.filter((m) => m.programmeId === programmeId).length
            : mats.length,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedLearnerId]);

  const completedAssessments = useMemo(
    () =>
      instances.filter(
        (i) => i.status === 'completed' || i.status === 'moderation',
      ).length,
    [instances],
  );

  const firstName = user?.name?.split(/\s+/)[0] ?? 'Learner';
  const progress = learner?.progress ?? 0;
  const programmeLabel = learner?.programmeName ?? 'Your programme';

  if (loading) {
    return <p className="text-gray-500 p-6">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}!
        </h1>
        <p className="text-sm text-brand-blue">{programmeLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Overall Progress
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{progress}%</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-500" />
          </div>
          <ProgressBar value={progress} size="sm" />
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Assessments completed
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {completedAssessments}/{instances.length || '—'}
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-gray-500" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Learning materials
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{materialCount}</p>
            </div>
            <Star className="h-5 w-5 text-gray-500" />
          </div>
        </div>
      </div>

      <Card>
        <div className="flex items-center mb-4">
          <Bot className="h-5 w-5 text-brand-navy mr-2" />
          <h3 className="text-lg font-bold text-gray-900">Next steps</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">Continue learning</h4>
            <p className="text-sm text-gray-600 mb-4">
              Open your course modules and training materials.
            </p>
            <Button size="sm" onClick={() => navigate('/learner-courses')}>
              View courses
            </Button>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">Upcoming assessments</h4>
            <p className="text-sm text-gray-600 mb-4">
              {instances.filter((i) => i.status === 'in_progress').length > 0
                ? 'You have assessments in progress.'
                : 'No assessments in progress right now.'}
            </p>
            <Button size="sm" onClick={() => navigate('/learner-assessments')}>
              My assessments
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            type="button"
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy"
            onClick={() => navigate('/messages')}>
            <MessageSquare className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Messages</span>
          </button>
          <button
            type="button"
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy"
            onClick={() => navigate('/attendance')}>
            <CalendarCheck className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Attendance</span>
          </button>
          <button
            type="button"
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy"
            onClick={() => navigate('/materials')}>
            <Download className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Materials</span>
          </button>
          <button
            type="button"
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy"
            onClick={() => navigate('/help')}>
            <HelpCircle className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Get help</span>
          </button>
        </div>
      </div>

      {linkedLearnerId && (
        <Card title="Required documents">
          <p className="text-sm text-gray-600 mb-3">
            Upload PoE and compliance documents from your learner profile.
          </p>
          <Button
            variant="outline"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => navigate(`/learner/${linkedLearnerId}`)}>
            Open my profile & PoE
          </Button>
        </Card>
      )}
    </div>
  );
}
