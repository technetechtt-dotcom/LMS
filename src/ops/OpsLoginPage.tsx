import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Server } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { parseApiErrorMessage } from '../services/httpClient';
import { OPS_ROLES } from '../config/authPortal';
import { toast } from 'sonner';

export function OpsLoginPage() {
  const navigate = useNavigate();
  const { login, logout, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validate = () => {
    let isValid = true;
    const next = { email: '', password: '' };
    if (!email || !email.includes('@')) {
      next.email = 'Please enter a valid email address';
      isValid = false;
    }
    if (!password || password.length < 8) {
      next.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    setErrors(next);
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const profile = await login({ email, password });
      if (!OPS_ROLES.includes(profile.role as (typeof OPS_ROLES)[number])) {
        toast.error('Use the LMS login for learners and staff (port 5176).');
        await logout();
        return;
      }
      toast.success('Signed in to Ops Console');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Login failed. Please try again.'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg border border-slate-700">
          <Server className="h-10 w-10 text-slate-100" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-white">
          SkillForge Ops
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Platform administration console — separate from the learner LMS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            <Input
              label="Operator email"
              type="email"
              placeholder="operator@organisation.example"
              icon={<Mail className="h-5 w-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="username"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              Sign in to Ops Console
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
