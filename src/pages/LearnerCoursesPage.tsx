import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Search,
  Play,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { learnerService, materialService } from '../services/api';
import type { TrainingMaterial } from '../types';
import { openFileUrl } from '../utils/exportData';

type ModuleCard = {
  id: string;
  title: string;
  programme: string;
  materialCount: number;
  status: 'In Progress' | 'Available';
  progress: number;
};

export function LearnerCoursesPage() {
  const navigate = useNavigate();
  const { linkedLearnerId } = useAuth();
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [programmeName, setProgrammeName] = useState('Your programme');
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState('');
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

  const modules = useMemo((): ModuleCard[] => {
    const byModule = new Map<string, TrainingMaterial[]>();
    for (const m of materials) {
      const key = m.moduleName || m.moduleId || 'General';
      const list = byModule.get(key) ?? [];
      list.push(m);
      byModule.set(key, list);
    }
    return Array.from(byModule.entries()).map(([title, items]) => ({
      id: items[0]?.moduleId ?? title,
      title,
      programme: items[0]?.programmeName ?? programmeName,
      materialCount: items.length,
      status: 'Available' as const,
      progress: Math.min(100, progress + items.length * 5),
    }));
  }, [materials, programmeName, progress]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.title.toLowerCase().includes(q));
  }, [modules, search]);

  const stats = [
    {
      label: 'Modules',
      value: String(modules.length),
      icon: <BookOpen className="h-5 w-5 text-gray-500" />,
    },
    {
      label: 'Materials',
      value: String(materials.length),
      icon: <CheckCircle className="h-5 w-5 text-gray-500" />,
    },
    {
      label: 'Programme progress',
      value: `${progress}%`,
      icon: <Clock className="h-5 w-5 text-gray-500" />,
    },
  ];

  if (loading) {
    return <p className="text-gray-500 p-6">Loading courses…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My courses</h1>
          <p className="text-sm text-brand-blue">{programmeName}</p>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search modules…"
          icon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 uppercase">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
            {s.icon}
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No course materials published for your programme yet.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((mod) => (
            <Card key={mod.id} className="overflow-hidden">
              <div className="h-24 bg-gray-100 flex items-center justify-center">
                <Play className="h-8 w-8 text-gray-400" />
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                  <Badge variant="neutral">{mod.materialCount} items</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-3">{mod.programme}</p>
                <ProgressBar value={mod.progress} size="sm" />
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      navigate(`/learner-courses/${encodeURIComponent(mod.id)}`)
                    }>
                    View module
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const first = materials.find(
                        (m) => (m.moduleName || m.moduleId) === mod.title,
                      );
                      if (first) openFileUrl(first.fileUrl, first.title);
                    }}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
