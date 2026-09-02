import React from 'react';
import { Card } from '../components/ui/Card';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Privacy Policy (POPIA)</h1>
      <Card className="p-6 prose prose-sm max-w-none text-gray-700">
        <p>
          SkillForge SDIO processes personal information of learners, staff and partners
          in accordance with the Protection of Personal Information Act (POPIA).
        </p>
        <p>
          We collect identity, contact, enrolment, assessment and attendance data solely
          to deliver accredited learning programmes, SETA reporting, and credential
          verification.
        </p>
        <p>
          Data is stored securely, access is role-restricted, and learners may request
          access or correction via their SDP administrator.
        </p>
      </Card>
    </div>
  );
}
