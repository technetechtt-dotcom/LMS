import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
export function POPIAConsentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [consents, setConsents] = useState({
    processing: false,
    rights: false,
    sharing: false
  });
  const { logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const hasConsented = localStorage.getItem('popia_consent');
    if (hasConsented) return;
    if (import.meta.env.PROD) {
      setIsOpen(true);
      return;
    }
    localStorage.setItem('popia_consent', 'true');
  }, []);
  const handleAccept = () => {
    localStorage.setItem('popia_consent', 'true');
    setIsOpen(false);
  };
  const handleDecline = async () => {
    await logout();
    setIsOpen(false);
    navigate('/login', { replace: true });
  };
  const allChecked = consents.processing && consents.rights && consents.sharing;
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => undefined}
      title=""
      size="lg">
      
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
          <Shield className="h-8 w-8 text-brand-navy" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Data Protection Consent
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Compliance with the Protection of Personal Information Act (POPIA)
        </p>
      </div>

      <div className="space-y-6 text-left">
        <p className="text-sm text-gray-600">
          To provide you with our learning management services, we need to
          process your personal information. Please review and accept the
          following terms to continue accessing the Smart LMS platform.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex items-start">
            <Checkbox
              id="consent-processing"
              checked={consents.processing}
              onChange={(e) =>
              setConsents({
                ...consents,
                processing: e.target.checked
              })
              }
              className="mt-1" />
            
            <label
              htmlFor="consent-processing"
              className="ml-3 text-sm text-gray-700 cursor-pointer">
              
              <strong>Processing Consent:</strong> I consent to the processing
              of my personal information for the purpose of skills development,
              training administration, and assessment.
            </label>
          </div>

          <div className="flex items-start">
            <Checkbox
              id="consent-rights"
              checked={consents.rights}
              onChange={(e) =>
              setConsents({
                ...consents,
                rights: e.target.checked
              })
              }
              className="mt-1" />
            
            <label
              htmlFor="consent-rights"
              className="ml-3 text-sm text-gray-700 cursor-pointer">
              
              <strong>Your Rights:</strong> I understand that I have the right
              to access, correct, and request deletion of my personal data at
              any time, subject to regulatory retention requirements.
            </label>
          </div>

          <div className="flex items-start">
            <Checkbox
              id="consent-sharing"
              checked={consents.sharing}
              onChange={(e) =>
              setConsents({
                ...consents,
                sharing: e.target.checked
              })
              }
              className="mt-1" />
            
            <label
              htmlFor="consent-sharing"
              className="ml-3 text-sm text-gray-700 cursor-pointer">
              
              <strong>Third-Party Sharing:</strong> I consent to sharing my data
              with relevant regulatory bodies (SETAs, QCTO, DHET) for the
              purpose of learner registration and certification.
            </label>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            className="w-full py-3"
            disabled={!allChecked}
            onClick={handleAccept}>
            
            Accept & Continue
          </Button>
          <button
            onClick={handleDecline}
            className="text-sm text-gray-500 hover:text-gray-700 underline">
            
            Decline and Log Out
          </button>
        </div>
      </div>
    </Modal>);

}