import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Play,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { learnerService, materialService } from '../services/api';
import type { TrainingMaterial } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { openFileUrl } from '../utils/exportData';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { linkedLearnerId } = useAuth();
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [programmeName, setProgrammeName] = useState('Your programme');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let programmeId: string | undefined;
        if (linkedLearnerId) {
          const learnerRes = await learnerService.getById(linkedLearnerId);
          programmeId = learnerRes.data?.programmeId;
          setProgrammeName(learnerRes.data?.programmeName ?? 'Your programme');
          setProgress(learnerRes.data?.progress ?? 0);
        }
        const matRes = await materialService.getAll(
          programmeId ? { programme: programmeId } : undefined,
        );
        if (!cancelled) setMaterials(matRes.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedLearnerId]);

  const moduleMaterials = useMemo(() => {
    if (!courseId) return [];
    const key = decodeURIComponent(courseId);
    return materials.filter(
      (m) => m.moduleId === key || m.moduleName === key || m.id === key,
    );
  }, [materials, courseId]);

  const moduleTitle =
    moduleMaterials[0]?.moduleName ??
    moduleMaterials[0]?.moduleId ??
    (courseId ? decodeURIComponent(courseId) : 'Module');

  const moduleProgress = Math.min(100, progress + moduleMaterials.length * 5);

  if (loading) {
    return <p className="text-gray-500 p-6">Loading module…</p>;
  }

  if (moduleMaterials.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-700">Module not found or no materials published yet.</p>
        <Link to="/learner-courses" className="text-brand-blue hover:underline">
          Back to My Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/learner-courses"
          className="inline-flex items-center text-sm text-brand-blue hover:underline mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          My courses
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{moduleTitle}</h1>
            <p className="text-sm text-gray-500 mt-1">{programmeName}</p>
          </div>
          <Badge variant="info">{moduleMaterials.length} materials</Badge>
        </div>
      </div>

      <Card title="Progress">
        <div className="flex justify-between text-sm mb-2">
          <span>Overall programme</span>
          <span>{moduleProgress}%</span>
        </div>
        <ProgressBar value={moduleProgress} size="sm" />
      </Card>

      <Card title="Module content">
        <div className="divide-y divide-gray-100">
          {moduleMaterials.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 text-left"
              onClick={() => openFileUrl(item.fileUrl, item.title)}>
              <div className="flex items-center gap-3 min-w-0">
                {item.type === 'video' ? (
                  <Play className="h-4 w-4 text-gray-400 shrink-0" />
                ) : item.type === 'document' ? (
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                </div>
              </div>
              <Badge variant="neutral">Open</Badge>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-6 gap-2">
          <Button variant="ghost" onClick={() => navigate('/learner-courses')}>
            Close
          </Button>
          <Button
            onClick={() => {
              const first = moduleMaterials[0];
              if (first) openFileUrl(first.fileUrl, first.title);
            }}>
            Resume learning
          </Button>
        </div>
      </Card>
    </div>
  );
}
