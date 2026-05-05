import React from 'react';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}
export function Input({
  label,
  error,
  helperText,
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label &&
      <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      }
      <div className="relative">
        {icon &&
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        }
        <input
          className={`
            block w-full rounded-md border-gray-300 shadow-sm 
            focus:border-brand-navy focus:ring-brand-navy sm:text-sm
            disabled:bg-gray-50 disabled:text-gray-500
            ${icon ? 'pl-10' : 'pl-3'}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
            ${className}
          `}
          {...props} />
        
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error &&
      <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      }
    </div>);

}