import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  'aria-label'?: string;
  ariaLabel?: string;
  showValue?: boolean;
  variant?: 'brand' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  'aria-label': ariaLabelAttr,
  ariaLabel,
  showValue = true,
  variant = 'brand',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 1 : max;
  const percentage = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const roundedPercentage = Math.round(percentage);
  const accessibleName = ariaLabelAttr || ariaLabel || label || 'Progress';
  const variants = {
    brand: 'bg-brand-navy',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
  };
  const heights = {
    sm: 'h-2',
    md: 'h-4',
  };
  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between mb-1">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-medium text-gray-700">
              {roundedPercentage}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${heights[size]}`}
        role="progressbar"
        aria-label={accessibleName}
        aria-valuenow={roundedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${roundedPercentage} percent`}>
        <div
          className={`${variants[variant]} ${heights[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
