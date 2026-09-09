import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bot,
  Calendar,
  Download,
  Search,
  Filter,
  MoreVertical,
  Plus,
  FileText,
  Video,
  Link as LinkIcon,
  Eye,
  Printer,
  Share2,
  LayoutGrid,
  List,
  Presentation,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { FileUpload } from '../components/ui/FileUpload';
import { useAuth } from '../contexts/AuthContext';
import type { Programme, TrainingMaterial } from '../types';
import { materialService, programmeService } from '../services/api';
import { openFileUrl, copySharePath } from '../utils/exportData';
import { LearnershipCurriculumPanel } from '../components/curriculum/LearnershipCurriculumPanel';
import { ModuleCompletenessPanel } from '../components/curriculum/ModuleCompletenessPanel';
import {
  ALL_CURRICULUM_ARTIFACTS,
  ARTIFACT_LABELS,
  artifactsForFamily,
  defaultPoeComponentForArtifact,
  moduleCodePlaceholder,
  titleExample,
  type ModuleFamily,
} from '../utils/learnershipCurriculum';

/** Row shape fed to Material Library columns (extends API model with UI fields). */
export type MaterialTableRow = TrainingMaterial & {
  program: string;
  component: string;
  size: string;
  downloads: number;
  icon: React.ReactNode;
  ai?: boolean;
};

function materialTableIcon(m: TrainingMaterial) {
  if (m.type === 'video') {
    return <Video className="h-5 w-5 text-blue-500" />;
  }
  const fmt = (m.format ?? '').toUpperCase();
  if (fmt.includes('PPT')) {
    return <Presentation className="h-5 w-5 text-orange-500" />;
  }
  switch (m.artifactSlug) {
    case 'facilitator-guide':
    case 'learner-guide':
      return <FileText className="h-5 w-5 text-brand-navy" />;
    case 'summative-memo':
      return <FileText className="h-5 w-5 text-amber-600" />;
    case 'learner-workbook':
      return <FileText className="h-5 w-5 text-blue-600" />;
    case 'summative':
      return <FileText className="h-5 w-5 text-purple-600" />;
    case 'practical-guide':
    case 'practical-workbook':
    case 'practical-assessment':
      return <FileText className="h-5 w-5 text-orange-600" />;
    case 'workplace-guide':
    case 'workplace-logbook':
    case 'workplace-assessment':
      return <FileText className="h-5 w-5 text-teal-600" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
}

export function MaterialsPage() {
  const { user } = useAuth();
  const isLearner = user?.role === 'Learner';
  const [showUploadMaterial, setShowUploadMaterial] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] =
    useState<MaterialTableRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [artifactFilter, setArtifactFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [programmeFilter, setProgrammeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [shareEmails, setShareEmails] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [materialsList, setMaterialsList] = useState<TrainingMaterial[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadModuleCode, setUploadModuleCode] = useState('');
  const [uploadModuleFamily, setUploadModuleFamily] = useState<ModuleFamily | 'other'>(
    'KM',
  );
  const [uploadArtifactSlug, setUploadArtifactSlug] = useState('learner-guide');
  const [uploadProgrammeId, setUploadProgrammeId] = useState('');
  const [uploadModule, setUploadModule] = useState('m1');
  const [uploadPoeComponent, setUploadPoeComponent] = useState('Knowledge');
  const [uploadFormat, setUploadFormat] = useState<
    'pdf' | 'video' | 'ppt' | 'doc'
  >('pdf');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialService.getAll({
        poeComponent:
          componentFilter !== 'all' ? componentFilter : undefined,
        artifact: artifactFilter !== 'all' ? artifactFilter : undefined,
        programme: programmeFilter !== 'all' ? programmeFilter : undefined,
      });
      setMaterialsList(res.data);
    } catch {
      toast.error('Could not load materials');
      setMaterialsList([]);
    } finally {
      setLoading(false);
    }
  }, [componentFilter, artifactFilter, programmeFilter]);

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await programmeService.getAll();
        const list = res.data ?? [];
        if (!cancelled) {
          setProgrammes(list);
          setUploadProgrammeId((prev) =>
            prev || (list[0]?.id ?? ''),
          );
        }
      } catch {
        if (!cancelled) setProgrammes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const uploadArtifactOptions = useMemo(() => {
    if (uploadModuleFamily === 'other') {
      return [{ value: 'other', label: 'Other material' }];
    }
    return artifactsForFamily(uploadModuleFamily).map((a) => ({
      value: a.slug,
      label: a.label,
    }));
  }, [uploadModuleFamily]);

  const openMaterial = async (material: MaterialTableRow | null) => {
    if (!material) return;
    try {
      const response = await materialService.downloadUrl(material.id);
      openFileUrl(response.data.downloadUrl, material.title);
    } catch {
      toast.error('Could not create a secure download link');
    }
  };

  useEffect(() => {
    if (uploadModuleFamily === 'other') {
      setUploadArtifactSlug('other');
      return;
    }
    const first = artifactsForFamily(uploadModuleFamily)[0]?.slug ?? 'other';
    setUploadArtifactSlug(first);
    setUploadModuleCode((prev) => {
      if (prev && detectFamilyFromCode(prev) === uploadModuleFamily) return prev;
      return moduleCodePlaceholder(uploadModuleFamily);
    });
  }, [uploadModuleFamily]);

  function detectFamilyFromCode(code: string): ModuleFamily | null {
    const c = code.trim().toUpperCase();
    if (c.startsWith('KM-')) return 'KM';
    if (c.startsWith('PM-')) return 'PM';
    if (c.startsWith('WM-')) return 'WM';
    return null;
  }

  useEffect(() => {
    if (uploadArtifactSlug === 'other' || uploadArtifactSlug === 'na') return;
    setUploadPoeComponent(
      defaultPoeComponentForArtifact(uploadArtifactSlug, uploadModuleCode),
    );
  }, [uploadArtifactSlug, uploadModuleCode]);

  const resetUploadForm = useCallback(() => {
    setUploadTitle('');
    setUploadModuleCode(moduleCodePlaceholder('KM'));
    setUploadModuleFamily('KM');
    setUploadArtifactSlug('learner-guide');
    setUploadProgrammeId(programmes[0]?.id ?? '');
    setUploadModule('m1');
    setUploadPoeComponent('Knowledge');
    setUploadFormat('pdf');
    setUploadDescription('');
    setUploadFiles([]);
  }, [programmes]);

  const programmeFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All programmes' },
      ...programmes.map((p) => ({ value: p.id, label: p.title })),
    ],
    [programmes],
  );

  const uploadProgrammeOptions = useMemo(
    () => programmes.map((p) => ({ value: p.id, label: p.title })),
    [programmes],
  );

  const stats = [
  {
    label: 'PoE Resources',
    value: loading ? '…' : String(materialsList.length),
    icon: <FileText className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'QCTO Updates',
    value: '28',
    icon: <Calendar className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'EISA Readiness Packs',
    value: '156',
    icon: <Download className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'AI Tagged',
    value: '89%',
    icon: <Bot className="h-5 w-5 text-gray-500" />,
    badge: true
  }];

  /** Search is client-side; programme / PoE / artefact filters reload from API (sorted by programme). */
  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return materialsList;
    return materialsList.filter((m) => {
      const hay = `${m.title} ${m.description ?? ''} ${m.programmeName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [materialsList, searchQuery]);

  const tableRows = useMemo<MaterialTableRow[]>(
    () =>
      filteredMaterials.map((m) => ({
        ...m,
        moduleCode: m.moduleCode ?? '—',
        artifactType: m.artifactType ?? '—',
        program: m.programmeName,
        component: m.poeComponent ?? 'Knowledge',
        size: m.fileSize,
        downloads: m.downloadCount,
        icon: materialTableIcon(m),
        ai: m.isAIEnhanced,
      })),
    [filteredMaterials],
  );

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, componentFilter, programmeFilter, artifactFilter]);

  const handleShareByEmail = () => {
    const emails = shareEmails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (!emails.length) {
      toast.error('Enter at least one email address');
      return;
    }
    if (!selectedMaterial) return;
    const link = `${window.location.origin}/materials?highlight=${selectedMaterial.id}`;
    const subject = encodeURIComponent(`Training material: ${selectedMaterial.title}`);
    const body = encodeURIComponent(
      `Please review this training material:\n\n${selectedMaterial.title}\n${link}`,
    );
    window.location.href = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
    setShowShareModal(false);
    setShareEmails('');
    toast.success('Opening your email client…');
  };

  const columns: Column<MaterialTableRow>[] = [
  {
    header: 'MATERIAL',
    accessorKey: 'title' as const,
    cell: (row: MaterialTableRow) =>
    <div
      className="flex items-start space-x-3 cursor-pointer hover:opacity-80"
      onClick={() => {
        setSelectedMaterial(row);
        setShowViewerModal(true);
      }}>
      
          <div className="p-2 bg-gray-100 rounded-lg">{row.icon}</div>
          <div>
            <div className="flex items-center">
              <span className="font-medium text-gray-900 mr-2">
                {row.title}
              </span>
              {row.ai &&
          <Badge
            variant="info"
            className="bg-brand-navy text-white text-[10px] py-0 px-1">
            
                  AI
                </Badge>
          }
            </div>
            <p className="text-xs text-gray-500">{row.description ?? '—'}</p>
          </div>
        </div>

  },
  {
    header: 'PROGRAM',
    accessorKey: 'program' as const,
    cell: (row: MaterialTableRow) =>
    <Badge variant="neutral" className="bg-gray-100 text-gray-600">
          {row.program}
        </Badge>

  },
  {
    header: 'MODULE',
    accessorKey: 'moduleCode' as const,
    cell: (row: MaterialTableRow) =>
    <span
      className={`text-sm font-mono ${row.moduleCode === '—' ? 'text-gray-400' : 'text-gray-900'}`}>
      
          {row.moduleCode}
        </span>

  },
  {
    header: 'ARTEFACT',
    accessorKey: 'artifactType' as const,
    cell: (row: MaterialTableRow) =>
    <span
      className={`text-sm ${row.artifactType === '—' ? 'text-gray-400' : 'text-gray-700'}`}>
      
          {row.artifactType}
        </span>

  },
  {
    header: 'POE COMPONENT',
    accessorKey: 'component' as const,
    cell: (row: MaterialTableRow) =>
    <Badge variant="neutral" className="bg-gray-100 text-gray-700">
          {row.component}
        </Badge>

  },
  {
    header: 'TYPE',
    accessorKey: 'type' as const
  },
  {
    header: 'SIZE',
    accessorKey: 'size' as const
  },
  {
    header: 'DOWNLOADS',
    accessorKey: 'downloads' as const
  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: (row: MaterialTableRow) =>
    <div className="text-right text-sm font-medium">
          <details className="relative">
            <summary
              aria-label={`Actions for ${row.title}`}
              className="list-none [&::-webkit-details-marker]:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer">
              <MoreVertical className="w-4 h-4" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-10">
              <div className="py-1">
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={() => {
                setSelectedMaterial(row);
                setShowViewerModal(true);
                document.querySelectorAll('details[open]').forEach((menu) => menu.removeAttribute('open'));
              }}>
              
                  <Eye className="w-4 h-4 mr-2" />
                  View Material
                </button>
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={(event) => {
                void openMaterial(row);
                event.currentTarget.closest('details')?.removeAttribute('open');
              }}>
              
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={() => {
                setSelectedMaterial(row);
                setShowShareModal(true);
                document.querySelectorAll('details[open]').forEach((menu) => menu.removeAttribute('open'));
              }}>
              
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={(event) => {
                window.print();
                event.currentTarget.closest('details')?.removeAttribute('open');
              }}>
              
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
              </div>
            </div>
          </details>
        </div>

  },
  ];

  const handleUpload = async () => {
    const slug =
      uploadArtifactSlug === 'na' ? 'other' : uploadArtifactSlug;
    const prog = programmes.find((p) => p.id === uploadProgrammeId);
    if (!prog) {
      toast.error('Select a programme for this material');
      return;
    }
    const meta: Partial<TrainingMaterial> = {
      title:
        uploadTitle.trim() ||
        (uploadModuleFamily !== 'other'
          ? titleExample(uploadModuleFamily, slug)
          : undefined),
      moduleCode: uploadModuleCode.trim() ? uploadModuleCode.trim() : '—',
      artifactSlug: slug,
      artifactType:
        slug === 'other' ? '—' : ARTIFACT_LABELS[slug] ?? '—',
      poeComponent: uploadPoeComponent,
      programmeId: prog.id,
      programmeName: prog.title,
      moduleId: uploadModule,
      moduleName:
        uploadModule === 'wl1'
          ? 'Workplace'
          : uploadModule === 'comp'
            ? 'Compliance'
            : `Module ${(/m(\d)/.exec(uploadModule)?.[1] ?? '1')}`,
      description: uploadDescription.trim() || undefined,
      format:
        uploadFormat === 'video'
          ? 'MP4'
          : uploadFormat === 'ppt'
            ? 'PPT'
            : uploadFormat === 'doc'
              ? 'DOC'
              : 'PDF',
      type:
        uploadFormat === 'video'
          ? 'video'
          : uploadFormat === 'ppt' || uploadFormat === 'doc'
            ? 'document'
            : 'pdf',
    };
    const file = uploadFiles[0] ?? null;
    try {
      if (file) {
        await materialService.upload(file, meta);
      } else {
        await materialService.createRecord(meta);
      }
      toast.success('Material saved to library');
      setShowUploadMaterial(false);
      resetUploadForm();
      await loadMaterials();
      } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save material');
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Learning Materials
          </h1>
          <p className="text-sm text-gray-500">
            {isLearner ? (
              <>
                Learnerships are built from <strong>Knowledge Modules (KM)</strong>,{' '}
                <strong>Practical Modules (PM)</strong>, and{' '}
                <strong>Workplace Modules (WM)</strong> where required. Each KM has five
                documents: Facilitator Guide, Summative Memo, Learner Guide, Learner
                Workbook, and Summative Assessment.
              </>
            ) : (
              <>
                Tie every upload to a <strong>programme</strong>. Use module codes{' '}
                <span className="font-mono text-xs">KM-XX</span>,{' '}
                <span className="font-mono text-xs">PM-XX</span>, or{' '}
                <span className="font-mono text-xs">WM-XX</span> and pick the matching
                document type — PoE component is set automatically.
              </>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}>
            
            Filter
          </Button>
          {!isLearner &&
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              resetUploadForm();
              setShowUploadMaterial(true);
            }}>
            
              Upload Material
            </Button>
          }
        </div>
      </div>

      <Card title="Learnership module structure">
        <LearnershipCurriculumPanel />
      </Card>

      {!isLearner && (
        <Card title="Module completeness checker">
          <ModuleCompletenessPanel
            programmes={programmes}
            programmeFilter={programmeFilter}
            onProgrammeFilterChange={setProgrammeFilter}
          />
        </Card>
      )}

      {showFilters &&
      <Card className="bg-gray-50 border-dashed">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Programme
              </label>
              <Select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              options={programmeFilterOptions}
              />
            
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <Select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              options={[
              {
                value: 'all',
                label: 'All Types'
              },
              {
                value: 'knowledge',
                label: 'Knowledge'
              },
              {
                value: 'assessment',
                label: 'Assessment'
              },
              {
                value: 'practical',
                label: 'Practical'
              },
              {
                value: 'workplace',
                label: 'Workplace'
              },
              {
                value: 'compliance',
                label: 'Compliance & EISA'
              }]
              } />
            
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module / document type
              </label>
              <Select
              value={artifactFilter}
              onChange={(e) => setArtifactFilter(e.target.value)}
              options={[
              { value: 'all', label: 'All files' },
              { value: 'km-only', label: 'All KM modules (KM-XX)' },
              { value: 'pm-only', label: 'All Practical modules (PM-XX)' },
              { value: 'wm-only', label: 'All Workplace modules (WM-XX)' },
              ...ALL_CURRICULUM_ARTIFACTS.map((a) => ({
                value: a.slug,
                label: a.label,
              })),
              { value: 'other', label: 'Other materials' },
              ]}
              />
            
            </div>
            <div className="flex items-end">
              <Button
              className="w-full"
              onClick={() => {
                toast.success('Filters applied');
                setShowFilters(false);
              }}>
              
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      }

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center flex-wrap">
        <div className="flex-1 w-full min-w-[200px]">
          <Input
            placeholder="Search materials..."
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
        </div>
        <div className="w-full sm:w-52">
          <Select
            aria-label="Programme filter"
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
            options={programmeFilterOptions}
          />
          
        </div>
        <div className="w-full sm:w-48">
          <Select
            aria-label="PoE component filter"
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            options={[
            {
              value: 'all',
              label: 'All PoE types'
            },
            {
              value: 'knowledge',
              label: 'Knowledge'
            },
            {
              value: 'assessment',
              label: 'Assessment'
            },
            {
              value: 'practical',
              label: 'Practical'
            },
            {
              value: 'workplace',
              label: 'Workplace'
            },
            {
              value: 'compliance',
              label: 'Compliance'
            }]
            } />
          
        </div>
        <div className="w-full sm:w-48">
          <Select
            aria-label="Knowledge module artefact filter"
            value={artifactFilter}
            onChange={(e) => setArtifactFilter(e.target.value)}
            options={[
            { value: 'all', label: 'All modules / files' },
            { value: 'km-only', label: 'KM modules' },
            { value: 'pm-only', label: 'PM modules' },
            { value: 'wm-only', label: 'WM modules' },
            { value: 'other', label: 'Other' },
            ]} />
          
        </div>
        <button
          className="text-sm text-gray-500 hover:text-gray-700 px-2"
          onClick={() => {
          setArtifactFilter('all');
          setComponentFilter('all');
          setProgrammeFilter('all');
          setSearchQuery('');
          toast.info('Filters cleared');
        }}>
          
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) =>
        <div
          key={i}
          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
          
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-md">{stat.icon}</div>
            </div>
            {stat.badge &&
          <div className="absolute top-2 right-12">
                <Badge
              variant="info"
              className="bg-brand-navy text-white text-xs">
              
                  AI
                </Badge>
              </div>
          }
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Material Library"
            noPadding
            action={
            <div className="flex space-x-2 text-gray-400">
                <LayoutGrid
                  className={`h-5 w-5 cursor-pointer hover:text-gray-600 ${viewMode === 'grid' ? 'text-brand-navy' : ''}`}
                  onClick={() => setViewMode('grid')}
                />
                <List
                  className={`h-5 w-5 cursor-pointer hover:text-gray-600 ${viewMode === 'list' ? 'text-brand-navy' : ''}`}
                  onClick={() => setViewMode('list')}
                />
              </div>
            }>
            
            {loading ?
            <p className="p-6 text-sm text-gray-500">Loading materials…</p> :
            viewMode === 'grid' ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paginatedRows.map((row) => (
                  <div
                    key={row.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-brand-navy cursor-pointer"
                    onClick={() => {
                      setSelectedMaterial(row);
                      setShowViewerModal(true);
                    }}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">{row.icon}</div>
                      <div>
                        <p className="font-medium text-gray-900">{row.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.program}</p>
                        <p className="text-xs text-gray-400 mt-1">{row.moduleCode}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <DataTable data={paginatedRows} columns={columns} keyField="id" />
            )}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {filteredMaterials.length} material
                {filteredMaterials.length !== 1 ? 's' : ''} match your filters (
                {materialsList.length} in library)
              </span>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button size="sm" className="bg-brand-navy text-white">
                  {page}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card title="AI Recommendations">
            <div className="absolute top-4 right-4">
              <Badge variant="info" className="bg-brand-navy text-white">
                AI
              </Badge>
            </div>
            <div className="text-center py-8 text-gray-500 text-sm">
              Select a material to see AI-generated recommendations for
              supplementary content.
            </div>
          </Card>
        </div>
      </div>

      {/* Upload Modal */}
      {!isLearner &&
      <Modal
        isOpen={showUploadMaterial}
        onClose={() => {
          setShowUploadMaterial(false);
          resetUploadForm();
        }}
        title="Upload Learning Material">
        
          <div className="space-y-4">
            <Input
              label="Title"
              placeholder={
                uploadModuleFamily !== 'other'
                  ? titleExample(uploadModuleFamily, uploadArtifactSlug)
                  : 'Document title'
              }
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
              label="Module family"
              value={uploadModuleFamily}
              onChange={(e) =>
                setUploadModuleFamily(e.target.value as ModuleFamily | 'other')
              }
              options={[
                { value: 'KM', label: 'Knowledge Module (KM)' },
                { value: 'PM', label: 'Practical Module (PM)' },
                { value: 'WM', label: 'Workplace Module (WM)' },
                { value: 'other', label: 'Other / not module-based' },
              ]}
            />
              <Select
              label="Document type"
              value={uploadArtifactSlug}
              onChange={(e) => setUploadArtifactSlug(e.target.value)}
              options={uploadArtifactOptions}
            />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
              label="Module code"
              placeholder={
                uploadModuleFamily !== 'other'
                  ? moduleCodePlaceholder(uploadModuleFamily)
                  : 'Optional'
              }
              value={uploadModuleCode}
              onChange={(e) => setUploadModuleCode(e.target.value)}
              disabled={uploadModuleFamily === 'other'}
            />
              <div className="flex items-end">
                <p className="text-xs text-gray-500 pb-2">
                  {uploadModuleFamily !== 'other'
                    ? `Use prefix ${uploadModuleFamily}-XX for ${uploadModuleFamily} modules`
                    : 'No module code required'}
                </p>
              </div>
            </div>
            <Select
              label="PoE component"
              value={uploadPoeComponent}
              onChange={(e) => setUploadPoeComponent(e.target.value)}
              options={[
                { value: 'Knowledge', label: 'Knowledge' },
                { value: 'Assessment', label: 'Assessment' },
                { value: 'Practical', label: 'Practical' },
                { value: 'Workplace', label: 'Workplace' },
                { value: 'Compliance', label: 'Compliance & EISA' },
              ]}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
              label="Programme"
              value={uploadProgrammeId}
              onChange={(e) => setUploadProgrammeId(e.target.value)}
              options={
              uploadProgrammeOptions.length ?
              uploadProgrammeOptions :
              [
              {
                value: '',
                label: 'Loading programmes…'
              }]
              } />
            
              <Select
              label="Module"
              value={uploadModule}
              onChange={(e) => setUploadModule(e.target.value)}
              options={[
              {
                value: 'm1',
                label: 'Module 1'
              },
              {
                value: 'm2',
                label: 'Module 2'
              },
              {
                value: 'm3',
                label: 'Module 3'
              },
              {
                value: 'wl1',
                label: 'Workplace'
              },
              {
                value: 'comp',
                label: 'Compliance'
              }]
              } />
            
            </div>
            <Select
            label="Unit Standard"
            options={[
            {
              value: '',
              label: 'Select Unit Standard'
            },
            {
              value: 'us1',
              label: 'US 115753 - Use a GUI-based word processor'
            },
            {
              value: 'us2',
              label: 'US 115790 - Use electronic mail'
            },
            {
              value: 'us3',
              label: 'US 116940 - Apply computing fundamentals'
            },
            {
              value: 'us4',
              label: 'US 117924 - Database design'
            }]
            } />
          
            <Select
            label="File format"
            value={uploadFormat}
            onChange={(e) =>
              setUploadFormat(e.target.value as typeof uploadFormat)
            }
            options={[
            {
              value: 'pdf',
              label: 'PDF Document'
            },
            {
              value: 'video',
              label: 'Video'
            },
            {
              value: 'ppt',
              label: 'Presentation'
            },
            {
              value: 'doc',
              label: 'Word Document'
            }]
            } />
          
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
              placeholder="Enter material description"
              rows={3}
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload file (optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                If you skip the file, a catalogue entry with metadata only is saved (ideal for KM placeholders).
              </p>
              <FileUpload
                multiple={false}
                selectionOnly
                onUpload={(files) => setUploadFiles(files)}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
              variant="ghost"
              onClick={() => {
                setShowUploadMaterial(false);
                resetUploadForm();
              }}>
              
                Cancel
              </Button>
              <Button
              disabled={!uploadProgrammeId || uploadProgrammeOptions.length === 0}
              onClick={() => void handleUpload()}>
              
                Upload
              </Button>
            </div>
          </div>
        </Modal>
      }

      {/* Material Viewer Modal */}
      <Modal
        isOpen={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        title={`Viewing: ${selectedMaterial?.title}`}
        size="lg">
        
        <div className="space-y-4">
          <div
            className="bg-slate-100 rounded-lg flex items-center justify-center"
            style={{
              height: '400px'
            }}>
            
            <div className="text-center">
              {selectedMaterial?.type === 'pdf' ?
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" /> :
              selectedMaterial?.type === 'video' ?
              <Video className="w-12 h-12 text-slate-400 mx-auto mb-2" /> :

              <LinkIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              }
              <p className="text-slate-600 font-medium">
                {selectedMaterial?.title}
              </p>
              <p className="text-sm text-slate-500">
                Preview would appear here
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowViewerModal(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                void openMaterial(selectedMaterial);
                setShowViewerModal(false);
              }}>
              
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Share: ${selectedMaterial?.title}`}>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Share Link
            </label>
            <div className="flex space-x-2">
              <Input
                readOnly
                value={`https://lms.skillforge.co.za/materials/${selectedMaterial?.id || '123'}`} />
              
              <Button
                variant="outline"
                onClick={() =>
                  void copySharePath(`/materials?highlight=${selectedMaterial?.id ?? ''}`)
                }>
                
                Copy
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Share via Email
            </label>
            <Input
              placeholder="Enter email addresses separated by commas"
              value={shareEmails}
              onChange={(e) => setShareEmails(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowShareModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleShareByEmail}>
              Send via Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}
