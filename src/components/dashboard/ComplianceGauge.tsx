import React from 'react';
interface ComplianceGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}
export function ComplianceGauge({
  score,
  label,
  size = 'md'
}: ComplianceGaugeProps) {
  // Calculate circle properties
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score / 100 * circumference;
  // Determine color based on score
  let colorClass = 'text-status-success';
  if (score < 50) colorClass = 'text-status-danger';else
  if (score < 80) colorClass = 'text-status-warning';
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100">
          
          {/* Background circle */}
          <circle
            className="text-gray-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50" />
          
          {/* Progress circle */}
          <circle
            className={`${colorClass} transition-all duration-1000 ease-out`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50" />
          
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`font-bold text-gray-900 ${textSizes[size]}`}>
            {score}%
          </span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-500 text-center">
        {label}
      </span>
    </div>);

}