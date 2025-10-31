import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-300 text-gray-700',
    destructive: 'bg-red-100 text-red-800'
  };

  return (
    <span
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};