import React from 'react';
interface SelectOption {
  value: string;
  label: string;
}
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}
export function Select({
  label,
  options,
  error,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label &&
      <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      }
      <select
        className={`
          block w-full rounded-md border-gray-300 shadow-sm 
          focus:border-brand-navy focus:ring-brand-navy sm:text-sm
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}>
        
        {options.map((option) =>
        <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>);

}