import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-600 mt-2 mb-6">This page could not be found.</p>
      <Link to="/">
        <Button>Return home</Button>
      </Link>
    </div>
  );
}
