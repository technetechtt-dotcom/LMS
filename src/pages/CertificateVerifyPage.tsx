import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { certificateService } from '../services/api';

export function CertificateVerifyPage() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    valid: boolean;
    credentialStatus: string;
    certificateNumber: string;
    title: string;
    programmeName: string;
    issuedAt: string;
    learnerInitials: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Missing verification code');
      setLoading(false);
      return;
    }
    let cancelled = false;
    certificateService
      .verify(code)
      .then((res) => {
        if (!cancelled) setResult(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Certificate not found or verification failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Award className="h-12 w-12 mx-auto text-brand-navy mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">
            Credential verification
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Public verification — learner identity is partially masked for privacy.
          </p>
        </div>

        <Card>
          {error || !result ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-700">{error ?? 'Not found'}</p>
              <Link to="/login" className="text-brand-navy text-sm mt-4 inline-block">
                Go to SkillForge
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {result.valid ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-green-700">
                      Valid credential
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-amber-600" />
                    <span className="font-semibold text-amber-700">
                      Status: {result.credentialStatus}
                    </span>
                  </>
                )}
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Certificate number</dt>
                  <dd className="font-medium">{result.certificateNumber}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Credential</dt>
                  <dd className="font-medium">{result.title}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Programme</dt>
                  <dd className="font-medium">{result.programmeName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Learner</dt>
                  <dd className="font-medium">{result.learnerInitials} (initials only)</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Issued</dt>
                  <dd className="font-medium">
                    {new Date(result.issuedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
