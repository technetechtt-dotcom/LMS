import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck,
  AlertTriangle,
  Download,
  CheckSquare } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ComplianceGauge } from '../components/dashboard/ComplianceGauge';
import { ProgressBar } from '../components/ui/ProgressBar';
export function CompliancePage() {
  const [checklist, setChecklist] = useState([
  {
    id: 1,
    label: 'Learner Registration Data (NLRD Format)',
    checked: true
  },
  {
    id: 2,
    label: 'Assessment Guides & Instruments Approved',
    checked: true
  },
  {
    id: 3,
    label: 'Moderation Reports Signed',
    checked: false
  },
  {
    id: 4,
    label: 'Workplace Logbooks Up to Date',
    checked: false
  },
  {
    id: 5,
    label: 'Health & Safety Compliance Certificate',
    checked: true
  }]
  );
  const alerts = [
  {
    id: 1,
    severity: 'high',
    message: '3 Learners in Cohort 2023-A missing certified ID copies',
    programme: 'NC: Systems Dev'
  },
  {
    id: 2,
    severity: 'medium',
    message: 'Moderation report overdue for Batch B assessments',
    programme: 'FETC: Project Mgmt'
  },
  {
    id: 3,
    severity: 'low',
    message: 'Facilitator logbook signature missing for 12 May session',
    programme: 'NC: Systems Dev'
  }];

  const toggleChecklist = (id: number) => {
    setChecklist(
      checklist.map((item) =>
      item.id === id ?
      {
        ...item,
        checked: !item.checked
      } :
      item
      )
    );
  };
  const allChecked = checklist.every((item) => item.checked);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Compliance & Quality Assurance
          </h1>
          <p className="text-sm text-gray-500">
            Monitor adherence to QCTO & SETA regulations.
          </p>
        </div>
        <Button
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => toast.success('Exporting compliance report...')}>
          
          Export Compliance Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Score */}
        <Card className="lg:col-span-1 flex flex-col justify-center items-center p-8">
          <ComplianceGauge
            score={82}
            label="Overall Compliance Health"
            size="lg" />
          
          <div className="mt-6 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <ShieldCheck className="h-4 w-4 mr-1" /> Audit Ready
            </span>
          </div>
        </Card>

        {/* Detailed Breakdown */}
        <Card title="Compliance Breakdown" className="lg:col-span-2">
          <div className="space-y-6">
            <ProgressBar
              value={95}
              label="Learner Documentation"
              variant="success" />
            
            <ProgressBar
              value={88}
              label="Assessment Records"
              variant="success" />
            
            <ProgressBar
              value={72}
              label="Moderation Reports"
              variant="warning" />
            
            <ProgressBar
              value={65}
              label="Workplace Experience Logs"
              variant="warning" />
            
            <ProgressBar
              value={100}
              label="Facilitator Qualifications"
              variant="success" />
            
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card title="Non-Compliance Alerts">
          <div className="space-y-4">
            {alerts.map((alert) =>
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
                  onClick={() => toast.info('Opening resolution workflow...')}>
                  
                    Resolve
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Submission Readiness */}
        <Card title="SETA/QCTO Submission Readiness">
          <div className="space-y-3">
            {checklist.map((item) =>
            <div
              key={item.id}
              className="flex items-center p-3 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
              onClick={() => toggleChecklist(item.id)}>
              
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
                disabled={!allChecked}
                onClick={() =>
                allChecked ?
                toast.success('Generating submission package...') :
                toast.info('Complete all checklist items first')
                }>
                
                Generate Submission Package
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2">
                Complete all items to enable submission.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>);

}