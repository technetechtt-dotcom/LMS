import React from 'react';
import { Card } from '../components/ui/Card';

export function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
      <Card className="p-6 prose prose-sm max-w-none text-gray-700">
        <p>
          By using this learning management system you agree to comply with SDP policies,
          SETA programme rules, and honest assessment conduct.
        </p>
        <p>
          Accounts are personal and must not be shared. Misrepresentation of attendance,
          assessment submissions, or credentials may result in withdrawal and reporting to
          the relevant SETA.
        </p>
      </Card>
    </div>
  );
}
