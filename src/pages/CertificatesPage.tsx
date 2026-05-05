import React from 'react';
import { Award, Download, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

type IssuedCertificateRow = {
  id: number;
  learner: string;
  programme: string;
  type: string;
  date: string;
  status: string;
};

export function CertificatesPage() {
  const issuedCertificates = [
  {
    id: 1,
    learner: 'Thabo Mbeki',
    programme: 'NC: Systems Development',
    type: 'Certificate of Competence',
    date: '2023-06-15',
    status: 'Issued'
  },
  {
    id: 2,
    learner: 'Zanele Dlamini',
    programme: 'FETC: Project Management',
    type: 'Statement of Results',
    date: '2023-05-20',
    status: 'Issued'
  }];

  const columns = [
  {
    header: 'Learner',
    accessorKey: 'learner' as const
  },
  {
    header: 'Programme',
    accessorKey: 'programme' as const
  },
  {
    header: 'Type',
    accessorKey: 'type' as const
  },
  {
    header: 'Issue Date',
    accessorKey: 'date' as const
  },
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
    cell: () =>
    <Button
      variant="ghost"
      size="sm"
      leftIcon={<Download className="h-4 w-4" />}
      onClick={() => toast.success('Downloading certificate PDF...')}>
      
          PDF
        </Button>

  }];

  const generateCertificate = () => {
    const doc = new jsPDF({
      orientation: 'landscape'
    });
    // Simple certificate layout
    doc.setDrawColor(27, 58, 92); // Brand Navy
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    doc.setFontSize(30);
    doc.setTextColor(27, 58, 92);
    doc.text('CERTIFICATE OF COMPETENCE', 148.5, 40, {
      align: 'center'
    });
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text('This is to certify that', 148.5, 60, {
      align: 'center'
    });
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text('John Doe', 148.5, 80, {
      align: 'center'
    });
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text('Has successfully completed the programme', 148.5, 100, {
      align: 'center'
    });
    doc.setFontSize(20);
    doc.setTextColor(27, 58, 92);
    doc.text('National Certificate: Systems Development', 148.5, 120, {
      align: 'center'
    });
    doc.setFontSize(12);
    doc.text('NQF Level 5 | 131 Credits', 148.5, 130, {
      align: 'center'
    });
    doc.text('Date Issued: ' + new Date().toLocaleDateString(), 50, 160);
    doc.text('Authorised Signatory', 220, 160);
    doc.save('certificate.pdf');
    toast.success('Certificate generated successfully');
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Certificates & Results
        </h1>
        <p className="text-sm text-gray-500">
          Manage and issue learner certification documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Issued Certificates" noPadding>
            <DataTable
              data={issuedCertificates}
              columns={columns}
              keyField="id"
              pagination={false} />
            
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Generate New">
            <div className="space-y-4">
              <Select
                label="Select Learner"
                options={[
                {
                  value: '1',
                  label: 'Thabo Mbeki'
                },
                {
                  value: '2',
                  label: 'Lerato Kganyago'
                }]
                } />
              
              <Select
                label="Programme"
                options={[
                {
                  value: '1',
                  label: 'NC: Systems Development'
                },
                {
                  value: '2',
                  label: 'FETC: Project Management'
                }]
                } />
              
              <Select
                label="Document Type"
                options={[
                {
                  value: 'cert',
                  label: 'Certificate of Competence'
                },
                {
                  value: 'sor',
                  label: 'Statement of Results'
                }]
                } />
              
              <Button
                className="w-full"
                onClick={generateCertificate}
                leftIcon={<Award className="h-4 w-4" />}>
                
                Generate & Issue
              </Button>
            </div>
          </Card>

          <Card className="bg-brand-navy text-white">
            <div className="text-center py-4">
              <Award className="h-12 w-12 mx-auto text-brand-teal mb-3" />
              <h3 className="font-bold text-lg">QCTO Verification</h3>
              <p className="text-sm text-blue-200 mt-2">
                All certificates are digitally signed and verifiable via the
                QCTO database API.
              </p>
              <div className="mt-4 flex items-center justify-center text-xs text-brand-teal">
                <CheckCircle className="h-4 w-4 mr-1" /> System Connected
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>);

}