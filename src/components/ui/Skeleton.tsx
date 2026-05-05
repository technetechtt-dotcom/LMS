import React from 'react';
interface SkeletonProps {
  className?: string;
}
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}
export function SkeletonText({
  lines = 3,
  className = ''



}: {lines?: number;className?: string;}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({
        length: lines
      }).map((_, i) =>
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />

      )}
    </div>);

}
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>);

}
export function SkeletonTable({
  rows = 5,
  cols = 5



}: {rows?: number;cols?: number;}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-3 flex space-x-6">
        {Array.from({
          length: cols
        }).map((_, i) =>
        <Skeleton key={i} className="h-3 w-24" />
        )}
      </div>
      {/* Rows */}
      {Array.from({
        length: rows
      }).map((_, rowIdx) =>
      <div
        key={rowIdx}
        className="border-b border-gray-50 px-6 py-4 flex items-center space-x-6">
        
          {Array.from({
          length: cols
        }).map((_, colIdx) =>
        <div key={colIdx} className="flex-1">
              {colIdx === 0 ?
          <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div> :

          <Skeleton className="h-4 w-20" />
          }
            </div>
        )}
        </div>
      )}
    </div>);

}
export function SkeletonStats({ count = 4 }: {count?: number;}) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      
      {Array.from({
        length: count
      }).map((_, i) =>
      <SkeletonCard key={i} />
      )}
    </div>);

}
export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <SkeletonStats />
      <SkeletonTable />
    </div>);

}