import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };
  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
    window.location.reload();
  };
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center p-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-500 mb-6">
              We've encountered an unexpected error. Please try refreshing the
              page or contact support if the problem persists.
            </p>
            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                className="w-full"
                leftIcon={<RefreshCw className="h-4 w-4" />}>
                
                Reload Page
              </Button>
              <button
                className="text-sm text-gray-500 hover:text-gray-700 underline"
                onClick={() => { window.location.href = '/'; }}>
                
                Return to Dashboard
              </button>
            </div>
          </Card>
        </div>);

    }
    return this.props.children;
  }
}