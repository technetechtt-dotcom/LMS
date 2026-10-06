import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultRouteForRole } from '../utils/routing';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const state = location.state as { attemptedPath?: string; reason?: string } | undefined;
  const attemptedPath = state?.attemptedPath || location.pathname;
  const customReason = state?.reason;

  const dashboardRoute = user ? getDefaultRouteForRole(user.role) : '/login';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center space-y-6 shadow-lg border-red-100">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Access Restricted</h1>
          <p className="text-sm text-gray-600">
            {customReason ||
              'You do not have the required permissions to access this resource or perform this action.'}
          </p>
        </div>

        {user && (
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-left text-gray-600 space-y-1 border border-gray-200">
            <p>
              <strong className="text-gray-900">Your Role:</strong> {user.role}
            </p>
            <p>
              <strong className="text-gray-900">Account:</strong> {user.name} ({user.email})
            </p>
            {attemptedPath && attemptedPath !== '/access-denied' && (
              <p className="truncate">
                <strong className="text-gray-900">Requested Path:</strong> {attemptedPath}
              </p>
            )}
            <p className="text-gray-500 pt-1">
              If you require access to this programme or module, please request an allocation from your system administrator.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            variant="outline"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button
            leftIcon={<Home className="w-4 h-4" />}
            onClick={() => navigate(dashboardRoute)}>
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
