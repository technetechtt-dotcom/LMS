import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  FolderOpen,
  CheckCircle,
  Clock,
  FileText,
  Video,
  Download,
  Eye,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { materialService, programmeService } from '../services/api';
import type { Programme, TrainingMaterial } from '../types';
import { openFileUrl } from '../utils/exportData';

export function FacilitatorTrainingMaterialsPage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [matRes, progRes] = await Promise.all([
        materialService.getAll({
          programme: programmeFilter !== 'all' ? programmeFilter : undefined,
          search: search.trim() || undefined,
        }),
        programmeService.getAll(),
      ]);
      setMaterials(matRes.data ?? []);
      setProgrammes(progRes.data ?? []);
    } catch {
      toast.error('Could not load training materials');
    } finally {
      setLoading(false);
    }
  }, [programmeFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter(
      (m) =>
        !q ||
        m.title.toLowerCase().includes(q) ||
        (m.moduleName ?? '').toLowerCase().includes(q),
    );
  }, [materials, search]);

  const stats = useMemo(
    () => [
      {
        label: 'Total Materials',
        value: String(materials.length),
        icon: <FolderOpen className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'Approved',
        value: String(materials.filter((m) => m.isApproved).length),
        icon: <CheckCircle className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'Pending review',
        value: String(materials.filter((m) => !m.isApproved).length),
        icon: <Clock className="h-5 w-5 text-gray-500" />,
      },
      {
        label: 'Video',
        value: String(materials.filter((m) => m.type === 'video').length),
        icon: <Video className="h-5 w-5 text-gray-500" />,
      },
    ],
    [materials],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Materials</h1>
          <p className="text-sm text-gray-500">
            Programme artefacts from the materials library
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/materials')}>
            Open library
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/materials')}>
            Upload material
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          className="max-w-md"
          placeholder="Search materials…"
          icon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={programmeFilter}
          onChange={(e) => setProgrammeFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All programmes' },
            ...programmes.map((p) => ({ value: p.id, label: p.title })),
          ]}
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No materials found. Upload via the{' '}
          <button
            type="button"
            className="text-brand-blue underline"
            onClick={() => navigate('/materials')}>
            material library
          </button>
          .
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.id} className="p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <FileText className="h-8 w-8 text-brand-navy flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{m.title}</h3>
                  <p className="text-sm text-gray-500">{m.programmeName}</p>
                  <p className="text-xs text-gray-400">{m.moduleName ?? m.moduleCode}</p>
                </div>
              </div>
              <Badge variant="neutral" className="w-fit mb-4">
                {m.artifactType ?? m.type}
              </Badge>
              <div className="flex gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Eye className="h-4 w-4" />}
                  onClick={() => openFileUrl(m.fileUrl, m.title)}>
                  View
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => openFileUrl(m.fileUrl, m.title)}>
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
