import React from 'react';
interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
export function Avatar({
  src,
  alt,
  initials,
  name,
  size = 'md',
  className = ''
}: AvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };
  const displayInitials =
  initials || (
  name ?
  name.
  split(' ').
  map((n) => n[0]).
  join('').
  substring(0, 2).
  toUpperCase() :
  '??');
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-brand-navy text-white font-medium overflow-hidden ${sizeClasses[size]} ${className}`}>
      
      {src ?
      <img
        src={src}
        alt={alt || displayInitials}
        className="h-full w-full object-cover" /> :


      <span>{displayInitials}</span>
      }
    </div>);

}