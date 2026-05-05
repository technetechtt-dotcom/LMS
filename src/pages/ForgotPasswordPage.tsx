import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { authService } from '../services/api';
import { ApiNetworkError } from '../services/httpClient';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter the email address for your account.');
      return;
    }
    setBusy(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      toast.success(
        'If an account exists for that email, you will receive reset instructions shortly.',
      );
      setSent(true);
    } catch (err) {
      const msg =
        err instanceof ApiNetworkError
          ? err.message
          : 'Could not process the request. Try again later.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-page flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-brand-navy/10 p-3">
            <ShieldCheck className="h-10 w-10 text-brand-navy" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your work email and we will send you a link to choose a new
          password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {sent ?
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-700">
              Check your inbox for an email from SkillForge SA. The link expires
              in one hour.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-brand-blue hover:text-blue-700">
              
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </div> :

          <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@organization.co.za"
              icon={<Mail className="h-5 w-5" />} />

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          }
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link
            to="/login"
            className="font-medium text-brand-blue hover:text-blue-700 inline-flex items-center">
            
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>);

}
