import React from 'react';
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'brand' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}
export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  variant = 'brand',
  size = 'md',
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(value / max * 100, 0), 100);
  const variants = {
    brand: 'bg-brand-navy',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger'
  };
  const heights = {
    sm: 'h-2',
    md: 'h-4'
  };
  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) &&
      <div className="flex justify-between mb-1">
          {label &&
        <span className="text-sm font-medium text-gray-700">{label}</span>
        }
          {showValue &&
        <span className="text-sm font-medium text-gray-700">
              {Math.round(percentage)}%
            </span>
        }
        </div>
      }
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${heights[size]}`}>
        
        <div
          className={`${variants[variant]} ${heights[size]} rounded-full transition-all duration-500 ease-out`}
          style={{
            width: `${percentage}%`
          }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max} />
        
      </div>
    </div>);

}