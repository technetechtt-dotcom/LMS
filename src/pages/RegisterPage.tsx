import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { invitationService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultRouteForRole } from '../utils/routing';

export function RegisterPage() {
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') ?? '';
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(!!inviteToken);
  const [inviteMeta, setInviteMeta] = useState<{
    email: string;
    organisationName: string;
    roleName: string;
  } | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    invitationService
      .peek(inviteToken)
      .then((res) => {
        if (cancelled) return;
        setInviteMeta({
          email: res.data.email,
          organisationName: res.data.organisationName,
          roleName: res.data.roleName,
        });
        setEmail(res.data.email);
      })
      .catch(() => {
        if (!cancelled) toast.error('Invitation link is invalid or expired');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      toast.error('Sign out first to switch accounts.');
      return;
    }
    if (!inviteToken) {
      toast.error('A valid invitation is required to register');
      return;
    }
    setSubmitting(true);
    try {
      await invitationService.register({
        email,
        password,
        firstName,
        lastName,
        inviteToken,
      });
      const profile = await login({ email, password });
      toast.success('Account created — welcome to SkillForge');
      navigate(getDefaultRouteForRole(profile.role), { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Registration failed',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md text-center space-y-4">
          <GraduationCap className="h-12 w-12 mx-auto text-brand-navy" />
          <h1 className="text-xl font-bold">Invitation required</h1>
          <p className="text-gray-600">
            Registration is by invitation only. Check your email for an invite
            link from your organisation administrator.
          </p>
          <Link to="/login" className="text-brand-navy font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-brand-navy rounded-xl flex items-center justify-center shadow-lg">
          <GraduationCap className="h-10 w-10 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Accept invitation
        </h2>
        {inviteMeta && (
          <p className="mt-2 text-sm text-gray-600">
            Join {inviteMeta.organisationName} as {inviteMeta.roleName}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                icon={<User className="h-5 w-5" />}
                required
              />
              <Input
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={email}
              readOnly
              icon={<Mail className="h-5 w-5" />}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-5 w-5" />}
              required
              minLength={8}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-navy font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
