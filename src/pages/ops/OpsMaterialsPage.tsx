import React, { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { materialService, programmeService } from '../../services/api';
import type { TrainingMaterial } from '../../types';
import { useOpsOrganisation } from '../../hooks/useOpsOrganisation';

export function OpsMaterialsPage() {
  const { selectedOrgId } = useOpsOrganisation();
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [programmes, setProgrammes] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [matRes, progRes] = await Promise.all([
        materialService.getAll(),
        programmeService.getAll(),
      ]);
      setMaterials(matRes.data ?? []);
      setProgrammes(
        (progRes.data ?? []).map((p) => ({ id: p.id, title: p.title })),
      );
    } catch {
      toast.error('Could not load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedOrgId]);

  const columns = [
    { header: 'Title', accessorKey: 'title' as const },
    {
      header: 'Programme',
      accessorKey: 'programmeName' as const,
      className: 'hidden md:table-cell',
    },
    {
      header: 'Type',
      accessorKey: 'type' as const,
      cell: (row: TrainingMaterial) => (
        <Badge variant="neutral">{row.type}</Badge>
      ),
    },
    {
      header: 'Format',
      accessorKey: 'format' as const,
      className: 'hidden sm:table-cell',
    },
    {
      header: 'Approved',
      accessorKey: 'isApproved' as const,
      cell: (row: TrainingMaterial) => (
        <Badge variant={row.isApproved ? 'success' : 'warning'}>
          {row.isApproved ? 'Yes' : 'Pending'}
        </Badge>
      ),
    },
  ];

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const programmeId = String(fd.get('programmeId') ?? '');
    const title = String(fd.get('title') ?? '');
    if (!programmeId || !title) {
      toast.error('Title and programme are required');
      return;
    }
    try {
      await materialService.upload(file, {
        title,
        programmeId,
        type: 'document',
        format: file?.type ?? 'application/pdf',
      });
      toast.success('Material uploaded');
      setShowModal(false);
      setFile(null);
      await load();
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning materials</h1>
          <p className="text-gray-500 mt-1">
            Upload and manage programme content for the active organisation.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload material
        </Button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={materials} keyField="id" />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Upload material">
        <form onSubmit={handleUpload} className="space-y-4">
          <Input name="title" label="Title" required />
          <Select
            name="programmeId"
            label="Programme"
            required
            options={[
              { value: '', label: 'Select programme…' },
              ...programmes.map((p) => ({ value: p.id, label: p.title })),
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-brand-navy file:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Upload</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
