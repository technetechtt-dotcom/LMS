import React, { useEffect, useState } from 'react';
import { Award, Download, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { certificateService } from '../services/api';

type IssuedCertificateRow = {
  id: string;
  learner: string;
  programme: string;
  type: string;
  date: string;
  status: string;
};

export function CertificatesPage() {
  const [rows, setRows] = useState<IssuedCertificateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    certificateService
      .getAll()
      .then((res) => {
        if (cancelled) return;
        setRows(
          (res.data ?? []).map((c) => ({
            id: String(c.id ?? ''),
            learner: String(c.learnerName ?? '—'),
            programme: String(c.programmeName ?? '—'),
            type: String(c.title ?? 'Certificate'),
            date: c.issuedAt
              ? new Date(String(c.issuedAt)).toLocaleDateString()
              : '—',
            status: String(c.status ?? 'issued'),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load credentials');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { header: 'Learner', accessorKey: 'learner' as const },
    { header: 'Programme', accessorKey: 'programme' as const },
    { header: 'Type', accessorKey: 'type' as const },
    { header: 'Issue Date', accessorKey: 'date' as const },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (row: IssuedCertificateRow) => (
        <Badge variant="success">{row.status}</Badge>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id' as const,
      cell: (row: IssuedCertificateRow) => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={async () => {
            try {
              const res = await certificateService.downloadUrl(row.id);
              window.open(res.data.downloadUrl, '_blank', 'noopener');
            } catch {
              toast.error('Download failed');
            }
          }}>
          PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="h-7 w-7 text-brand-navy" />
            Credentials
          </h1>
          <p className="text-gray-600 mt-1">
            Issue and manage competency credentials with public verification.
          </p>
        </div>
      </div>

      <Card title="Issued credentials">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading…</div>
        ) : (
          <DataTable data={rows} columns={columns} keyField="id" />
        )}
      </Card>

      <Card>
        <div className="flex items-start gap-4">
          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg">Public verification</h3>
            <p className="text-gray-600 text-sm mt-1">
              Each PDF includes a QR code linking to{' '}
              <code>/certificates/verify/&lt;code&gt;</code>. Verifiers see
              programme and credential details with learner initials only.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
