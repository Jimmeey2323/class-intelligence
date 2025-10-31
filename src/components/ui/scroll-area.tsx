import React from 'react';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div
      className={`overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};