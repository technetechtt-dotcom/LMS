import React from 'react';
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}
export function Card({
  children,
  className = '',
  title,
  action,
  noPadding = false
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      
      {(title || action) &&
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          {title &&
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        }
          {action && <div>{action}</div>}
        </div>
      }
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>);

}