import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { authService } from '../services/api';
import { ApiNetworkError } from '../services/httpClient';

export function ResetPasswordPage() {
  const [search] = useSearchParams();
  const token = search.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Invalid reset link. Request a new one from the sign-in page.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await authService.resetPassword(token.trim(), password);
      toast.success('Your password was updated. You can sign in now.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiNetworkError
          ? err.message
          : 'Could not reset password. The link may have expired.';
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
            <KeyRound className="h-10 w-10 text-brand-navy" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Set a new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a strong password you have not used on this site before.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          </form>
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
    </div>
  );
}
