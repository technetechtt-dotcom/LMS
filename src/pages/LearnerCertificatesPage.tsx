import React, { useEffect, useState } from 'react';
import { Award, Download, ExternalLink } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { certificateService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type CertRow = {
  id: string;
  title: string;
  programme: string;
  issuedAt: string;
  status: string;
  verificationCode?: string;
};

export function LearnerCertificatesPage() {
  const { linkedLearnerId } = useAuth();
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    certificateService
      .getAll(linkedLearnerId ?? undefined)
      .then((res) => {
        if (cancelled) return;
        setCerts(
          (res.data ?? []).map((c) => ({
            id: String(c.id ?? ''),
            title: String(c.title ?? 'Certificate of Competency'),
            programme: String(c.programmeName ?? '—'),
            issuedAt: c.issuedAt
              ? new Date(String(c.issuedAt)).toLocaleDateString()
              : '—',
            status: String(c.status ?? 'ACTIVE'),
            verificationCode: c.verificationCode
              ? String(c.verificationCode)
              : undefined,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load certificates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkedLearnerId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My certificates</h1>
        <p className="text-sm text-gray-500">Download and share verified credentials</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : certs.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No certificates issued yet. Complete your programme assessments to earn credentials.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <Award className="h-8 w-8 text-brand-navy flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                    <p className="text-sm text-gray-500">{c.programme}</p>
                    <p className="text-xs text-gray-400 mt-1">Issued {c.issuedAt}</p>
                    <Badge variant="success" className="mt-2">
                      {c.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={async () => {
                    try {
                      const res = await certificateService.downloadUrl(c.id);
                      window.open(res.data.downloadUrl, '_blank', 'noopener');
                    } catch {
                      toast.error('Download failed');
                    }
                  }}>
                  Download PDF
                </Button>
                {c.verificationCode && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<ExternalLink className="h-4 w-4" />}
                    onClick={() => {
                      const url = `${window.location.origin}/certificates/verify/${c.verificationCode}`;
                      void navigator.clipboard.writeText(url);
                      toast.success('Verification link copied');
                    }}>
                    Share verify link
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
