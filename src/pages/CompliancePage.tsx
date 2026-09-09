import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Download,
  CheckSquare } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ComplianceGauge } from '../components/dashboard/ComplianceGauge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { complianceService, reportsService } from '../services/api';
import { downloadJson, triggerDownload } from '../utils/downloadJson';
import { openFileUrl } from '../utils/exportData';

export function CompliancePage() {
  const [docCount, setDocCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [checklist, setChecklist] = useState([
  {
    id: 'learner-registration',
    label: 'Learner Registration Data (NLRD Format)',
    checked: false
  },
  {
    id: 'assessment-instruments',
    label: 'Assessment Guides & Instruments Approved',
    checked: false
  },
  {
    id: 'moderation-reports',
    label: 'Moderation Reports Signed',
    checked: false
  },
  {
    id: 'workplace-logbooks',
    label: 'Workplace Logbooks Up to Date',
    checked: false
  },
  {
    id: 'health-safety',
    label: 'Health & Safety Compliance Certificate',
    checked: false
  }]
  );
  const [alerts, setAlerts] = useState<
    Array<{ id: string; severity: string; message: string; programme: string }>
  >([]);

  useEffect(() => {
    Promise.all([
      complianceService.getDocuments(),
      complianceService.getSubmissions(),
      complianceService.getDecisions(),
    ])
      .then(([docs, subs, decisions]) => {
        const documents = docs.data ?? [];
        const submissions = subs.data ?? [];
        setDocCount(documents.length);
        const statusByControl = new Map(
          (decisions.data ?? []).map((decision) => [decision.controlKey, decision.status]),
        );
        setChecklist((prev) =>
          prev.map((item) => ({
            ...item,
            checked: statusByControl.get(item.id) === 'SATISFIED',
          })),
        );
        const nextAlerts = [
          ...documents
            .filter((d) => /pending|expired|missing/i.test(d.status))
            .map((d) => ({
              id: d.id,
              severity: /expired|missing/i.test(d.status) ? 'high' : 'medium',
              message: `${d.name} is ${d.status.replace(/_/g, ' ')}`,
              programme: d.category,
            })),
          ...submissions
            .filter((s) => /pending|rejected|overdue/i.test(s.status))
            .map((s) => ({
              id: s.id,
              severity: /rejected|overdue/i.test(s.status) ? 'high' : 'medium',
              message: `${s.type} ${s.reference} is ${s.status}`,
              programme: 'SETA submission',
            })),
        ];
        setAlerts(nextAlerts);
      })
      .catch(() => toast.error('Could not load compliance documents'));
  }, []);

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    toast.info('Alert hidden for this view; the source record was not changed');
  };

  const toggleChecklist = async (id: string) => {
    const current = checklist.find((item) => item.id === id);
    if (!current) return;
    const checked = !current.checked;
    try {
      await complianceService.recordDecision(
        id,
        checked ? 'SATISFIED' : 'NOT_REVIEWED',
      );
      setChecklist((items) =>
        items.map((item) => (item.id === id ? { ...item, checked } : item)),
      );
    } catch {
      toast.error('Could not save compliance decision');
    }
  };
  const allChecked = checklist.every((item) => item.checked);
  const complianceScore = Math.round(
    (checklist.filter((item) => item.checked).length / checklist.length) * 100,
  );
  const overallScore = complianceScore;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Compliance & Quality Assurance
          </h1>
          <p className="text-sm text-gray-500">
            Record internal review decisions. {docCount} compliance documents
            are on file; this view is not regulator certification.
          </p>
        </div>
        <Button
          leftIcon={<Download className="h-4 w-4" />}
          onClick={async () => {
            try {
              const [docs, snap, file] = await Promise.all([
                complianceService.getDocuments(),
                reportsService.getSetaSnapshot(),
                reportsService.downloadSnapshot('pdf'),
              ]);
              triggerDownload(file.blob, file.filename || 'compliance-report.pdf');
              downloadJson('compliance-report.json', {
                checklist,
                documents: docs.data ?? [],
                setaSnapshot: snap.data,
                exportedAt: new Date().toISOString(),
              });
              toast.success('Internal compliance evidence exported');
            } catch {
              toast.error('Export failed');
            }
          }}>
          
          Export Internal Evidence
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Score */}
        <Card className="lg:col-span-1 flex flex-col justify-center items-center p-8">
          <ComplianceGauge
            score={overallScore}
            label="Controls reviewed as satisfactory"
            size="lg" />
          
          <div className="mt-6 text-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${allChecked ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {allChecked ? 'All controls marked satisfactory' : 'Compliance review incomplete'}
            </span>
          </div>
        </Card>

        {/* Detailed Breakdown */}
        <Card title="Compliance Breakdown" className="lg:col-span-2">
          <div className="space-y-6">
            <ProgressBar
              value={complianceScore}
              label="Submission checklist"
              variant="success" />
            
            <ProgressBar
              value={docCount}
              max={Math.max(docCount, 1)}
              label={`${docCount} documents on file (count only, not a decision)`}
              showValue={false}
              variant="brand" />
            
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card title="Non-Compliance Alerts">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No open compliance alerts.
              </p>
            ) : (
            alerts.map((alert) =>
            <div
              key={alert.id}
              className={`p-4 rounded-md border-l-4 ${alert.severity === 'high' ? 'bg-red-50 border-red-500' : alert.severity === 'medium' ? 'bg-amber-50 border-amber-500' : 'bg-blue-50 border-blue-500'}`}>
              
                <div className="flex justify-between items-start">
                  <div className="flex">
                    <AlertTriangle
                    className={`h-5 w-5 mr-3 ${alert.severity === 'high' ? 'text-red-500' : alert.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'}`} />
                  
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.programme}
                      </p>
                    </div>
                  </div>
                  <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => resolveAlert(alert.id)}>
                  
                    Resolve
                  </Button>
                </div>
              </div>
            )
            )}
          </div>
        </Card>

        {/* Submission Readiness */}
        <Card title="Internal Submission Readiness Review">
          <div className="space-y-3">
            {checklist.map((item) =>
            <div
              key={item.id}
              className="flex items-center p-3 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
              onClick={() => void toggleChecklist(item.id)}>
              
                <div
                className={`flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center mr-3 ${item.checked ? 'bg-brand-navy border-brand-navy' : 'border-gray-300'}`}>
                
                  {item.checked &&
                <CheckSquare className="h-3.5 w-3.5 text-white" />
                }
                </div>
                <span
                className={`text-sm ${item.checked ? 'text-gray-900' : 'text-gray-500'}`}>
                
                  {item.label}
                </span>
              </div>
            )}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <Button
                className="w-full"
                disabled={!allChecked || exporting}
                onClick={async () => {
                  if (!allChecked) {
                    toast.info('Complete all checklist items first');
                    return;
                  }
                  setExporting(true);
                  try {
                    const res = await complianceService.exportSETA('seta', 'pdf');
                    if (res.data?.url) {
                      openFileUrl(res.data.url, 'internal submission package');
                      toast.success('Internal package generated');
                    } else {
                      toast.success('Internal package generated');
                    }
                  } catch {
                    toast.error('Could not generate submission package');
                  } finally {
                    setExporting(false);
                  }
                }}>
                
                {exporting ? 'Generating…' : 'Generate Internal Package'}
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2">
                Reviewer decisions are persisted, but do not constitute SETA/QCTO approval.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>);

}
