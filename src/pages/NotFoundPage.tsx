import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-600 mt-2 mb-6">This page could not be found.</p>
      <Link
        to="/"
        className="inline-flex h-10 items-center justify-center rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-opacity-90">
        Return home
      </Link>
    </div>
  );
}
