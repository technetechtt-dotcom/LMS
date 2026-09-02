import React, { useEffect, useState } from 'react';
import { Award, Download, CheckCircle, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
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
  const [showIssue, setShowIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({
    enrollmentId: '',
    title: 'Certificate of Competency',
    programmeName: '',
    learnerName: '',
  });

  const loadRows = () => {
    setLoading(true);
    certificateService
      .getAll()
      .then((res) => {
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
      .catch(() => toast.error('Could not load credentials'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRows();
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
        <div className="flex gap-1 flex-wrap">
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
          {row.status !== 'REVOKED' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await certificateService.revoke(row.id, 'Administrative revoke');
                    toast.success('Credential revoked');
                    setRows((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, status: 'REVOKED' } : r,
                      ),
                    );
                  } catch {
                    toast.error('Revoke failed');
                  }
                }}>
                Revoke
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await certificateService.reissue(row.id);
                    toast.success('Credential reissued');
                  } catch {
                    toast.error('Reissue failed');
                  }
                }}>
                Reissue
              </Button>
            </>
          )}
        </div>
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
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowIssue(true)}>
          Issue credential
        </Button>
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

      <Modal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        title="Issue credential"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowIssue(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!issueForm.enrollmentId.trim()) {
                  toast.error('Enrollment ID is required');
                  return;
                }
                try {
                  await certificateService.issue({
                    enrollmentId: issueForm.enrollmentId.trim(),
                    title: issueForm.title || undefined,
                    programmeName: issueForm.programmeName || undefined,
                    learnerName: issueForm.learnerName || undefined,
                  });
                  toast.success('Credential issued');
                  setShowIssue(false);
                  loadRows();
                } catch {
                  toast.error('Issue failed');
                }
              }}>
              Issue
            </Button>
          </>
        }>
        <div className="space-y-3">
          <Input
            label="Enrollment ID"
            value={issueForm.enrollmentId}
            onChange={(e) =>
              setIssueForm((f) => ({ ...f, enrollmentId: e.target.value }))
            }
            placeholder="UUID from learner enrolment"
          />
          <Input
            label="Title"
            value={issueForm.title}
            onChange={(e) => setIssueForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            label="Programme name (optional)"
            value={issueForm.programmeName}
            onChange={(e) =>
              setIssueForm((f) => ({ ...f, programmeName: e.target.value }))
            }
          />
          <Input
            label="Learner name (optional)"
            value={issueForm.learnerName}
            onChange={(e) =>
              setIssueForm((f) => ({ ...f, learnerName: e.target.value }))
            }
          />
        </div>
      </Modal>
    </div>
  );
}
