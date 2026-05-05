import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, FileX, ShieldX } from 'lucide-react';
import { Button } from './Button';
interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: 'generic' | 'network' | 'not_found' | 'permission' | 'empty';
  onRetry?: () => void;
  className?: string;
}
export function ErrorState({
  title,
  message,
  type = 'generic',
  onRetry,
  className = ''
}: ErrorStateProps) {
  const configs = {
    generic: {
      icon: <AlertTriangle className="h-12 w-12 text-amber-400" />,
      defaultTitle: 'Something went wrong',
      defaultMessage: 'An unexpected error occurred. Please try again.'
    },
    network: {
      icon: <WifiOff className="h-12 w-12 text-red-400" />,
      defaultTitle: 'Connection error',
      defaultMessage:
      'Unable to connect to the server. Check your internet connection and try again.'
    },
    not_found: {
      icon: <FileX className="h-12 w-12 text-gray-400" />,
      defaultTitle: 'Not found',
      defaultMessage:
      'The resource you are looking for does not exist or has been removed.'
    },
    permission: {
      icon: <ShieldX className="h-12 w-12 text-red-400" />,
      defaultTitle: 'Access denied',
      defaultMessage:
      'You do not have permission to view this content. Contact your administrator.'
    },
    empty: {
      icon: <FileX className="h-12 w-12 text-gray-300" />,
      defaultTitle: 'No data yet',
      defaultMessage: 'There is nothing to display here yet.'
    }
  };
  const config = configs[type];
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      
      <div className="mb-4">{config.icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        {message || config.defaultMessage}
      </p>
      {onRetry &&
      <Button
        variant="outline"
        leftIcon={<RefreshCw className="h-4 w-4" />}
        onClick={onRetry}>
        
          Try again
        </Button>
      }
    </div>);

}
export function EmptyState({
  title = 'No data yet',
  message = 'There is nothing to display here yet.',
  icon,
  action





}: {title?: string;message?: string;icon?: React.ReactNode;action?: React.ReactNode;}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon || <FileX className="h-12 w-12 text-gray-300 mb-4" />}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
      {action}
    </div>);

}