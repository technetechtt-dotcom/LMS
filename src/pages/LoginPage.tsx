import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultRouteForRole } from '../utils/routing';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const validate = () => {
    let isValid = true;
    const newErrors = {
      email: '',
      password: '',
    };
    if (!email || !email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const profile = await login({ email, password });
      toast.success('Welcome back!');
      navigate(getDefaultRouteForRole(profile.role), { replace: true });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Login failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-brand-navy rounded-xl flex items-center justify-center shadow-lg">
          <GraduationCap className="h-10 w-10 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Smart LMS
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          QCTO & SETA Compliant Skills Development Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            <Input
              label="Email Address"
              type="email"
              placeholder="name@organization.co.za"
              icon={<Mail className="h-5 w-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-brand-blue hover:text-blue-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/onboarding"
              className="text-sm font-medium text-brand-blue hover:text-blue-600"
            >
              New learner? Register here
            </Link>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Regulatory Access
                </span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500 leading-relaxed">
              Demo accounts (password 8+ characters; seed defaults use
              Password123!){' '}
              <code className="text-gray-700">admin@skillforge.co.za</code>,{' '}
              <code className="text-gray-700">seta@skillforge.co.za</code>,{' '}
              <code className="text-gray-700">thandi.mokoena@email.com</code>
              . See <code className="text-gray-700">.env.example</code> for API
              URL.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Protected by reCAPTCHA and subject to the Privacy Policy and Terms of
          Service.
          <br />
          POPIA Compliant System.
        </p>
      </div>
    </div>
  );
}
