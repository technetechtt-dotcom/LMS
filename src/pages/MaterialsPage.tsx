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

const KM_ARTIFACT_LABELS: Record<string, string> = {
  'learner-guide': 'Learner Guide',
  'learner-workbook': 'Learner Workbook',
  summative: 'Summative Assessment',
};

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
    case 'learner-guide':
      return <FileText className="h-5 w-5 text-brand-navy" />;
    case 'learner-workbook':
      return <FileText className="h-5 w-5 text-blue-600" />;
    case 'summative':
      return <FileText className="h-5 w-5 text-purple-600" />;
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
  const [materialsList, setMaterialsList] = useState<TrainingMaterial[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadModuleCode, setUploadModuleCode] = useState('');
  const [uploadKmType, setUploadKmType] = useState('na');
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

  /** Workbook and summative KM files are assessment instruments; the guide is knowledge content. */
  useEffect(() => {
    if (uploadKmType === 'learner-workbook' || uploadKmType === 'summative') {
      setUploadPoeComponent('Assessment');
    } else if (uploadKmType === 'learner-guide') {
      setUploadPoeComponent('Knowledge');
    }
  }, [uploadKmType]);

  const resetUploadForm = useCallback(() => {
    setUploadTitle('');
    setUploadModuleCode('');
    setUploadKmType('na');
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
          <div className="relative group">
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 hidden group-hover:block z-10">
              <div className="py-1">
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={() => {
                setSelectedMaterial(row);
                setShowViewerModal(true);
              }}>
              
                  <Eye className="w-4 h-4 mr-2" />
                  View Material
                </button>
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={() => toast.success('Downloading material...')}>
              
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={() => {
                setSelectedMaterial(row);
                setShowShareModal(true);
              }}>
              
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>
                <button
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={() => window.print()}>
              
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>

  },
  ];

  const handleUpload = async () => {
    const slug = uploadKmType === 'na' ? 'other' : uploadKmType;
    const prog = programmes.find((p) => p.id === uploadProgrammeId);
    if (!prog) {
      toast.error('Select a programme for this material');
      return;
    }
    const meta: Partial<TrainingMaterial> = {
      title: uploadTitle.trim() || undefined,
      moduleCode: uploadModuleCode.trim() ? uploadModuleCode.trim() : '—',
      artifactSlug: slug,
      artifactType:
        slug === 'other' ? '—' : KM_ARTIFACT_LABELS[slug] ?? '—',
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
                Each <strong>Knowledge module (KM)</strong> typically includes a Learner Guide
                (study content) plus assessment instruments —{' '}
                <strong>Learner Workbook</strong> and <strong>Summative Assessment</strong>{' '}
                (e.g. KM-XX-….pdf) — alongside practical and workplace PoE evidence. Workbook
                and summative files are classified under <strong>Assessment</strong> in the
                library.
              </>
            ) : (
              <>
                Every upload must be tied to a <strong>programme</strong> from your SDP list.
                Upload the KM guide under <strong>Knowledge</strong>; workbook and summative
                PDFs under <strong>Assessment</strong> (set automatically when you pick those
                artefact types). Materials are listed in programme order. Naming:{' '}
                <span className="font-mono text-xs">KM-XX-Learner Guide|Workbook|Summative Assessment</span>.
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
                Knowledge module file
              </label>
              <Select
              value={artifactFilter}
              onChange={(e) => setArtifactFilter(e.target.value)}
              options={[
              {
                value: 'all',
                label: 'All files'
              },
              {
                value: 'km-only',
                label: 'KM triplet (KM-XX set)'
              },
              {
                value: 'learner-guide',
                label: 'Learner Guide only'
              },
              {
                value: 'learner-workbook',
                label: 'Learner Workbook only'
              },
              {
                value: 'summative',
                label: 'Summative Assessment only'
              },
              {
                value: 'other',
                label: 'Other materials'
              }]
              } />
            
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
            {
              value: 'all',
              label: 'All KM / files'
            },
            {
              value: 'km-only',
              label: 'KM-XX triplets'
            },
            {
              value: 'learner-guide',
              label: 'Learner Guide'
            },
            {
              value: 'learner-workbook',
              label: 'Learner Workbook'
            },
            {
              value: 'summative',
              label: 'Summative'
            },
            {
              value: 'other',
              label: 'Other'
            }]
            } />
          
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
                <LayoutGrid className="h-5 w-5 cursor-pointer hover:text-gray-600" />
                <List className="h-5 w-5 cursor-pointer text-gray-600" />
              </div>
            }>
            
            {loading ?
            <p className="p-6 text-sm text-gray-500">Loading materials…</p> :
            <DataTable data={tableRows} columns={columns} keyField="id" />
            }
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {filteredMaterials.length} material
                {filteredMaterials.length !== 1 ? 's' : ''} match your filters (
                {materialsList.length} in library)
              </span>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm">
                  Previous
                </Button>
                <Button size="sm" className="bg-brand-navy text-white">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
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
              placeholder="e.g. KM-XX-Learner Guide"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
              label="Knowledge module code"
              placeholder="KM-XX"
              value={uploadModuleCode}
              onChange={(e) => setUploadModuleCode(e.target.value)}
            />
              <Select
              label="KM artefact type"
              value={uploadKmType}
              onChange={(e) => setUploadKmType(e.target.value)}
              options={[
              {
                value: 'na',
                label: 'Not part of a KM triplet'
              },
              {
                value: 'learner-guide',
                label: 'Learner Guide (.pdf)'
              },
              {
                value: 'learner-workbook',
                label: 'Learner Workbook (.pdf)'
              },
              {
                value: 'summative',
                label: 'Summative Assessment (.pdf)'
              }]
              } />
            
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
                toast.success('Downloading material...');
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
                onClick={() => toast.success('Link copied to clipboard')}>
                
                Copy
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Share via Email
            </label>
            <Input placeholder="Enter email addresses separated by commas" />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowShareModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Material shared successfully');
                setShowShareModal(false);
              }}>
              
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}