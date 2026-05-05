import React from 'react';
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="checkbox"
          className={`
            h-4 w-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded
            cursor-pointer transition-colors
            ${className}
          `}
          {...props}
        />

        {label && (
          <label
            htmlFor={props.id}
            className="ml-2 block text-sm text-gray-900 cursor-pointer">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';