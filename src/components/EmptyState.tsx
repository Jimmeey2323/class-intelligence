import React from 'react';
import { FileX, Filter, Calendar, Upload } from 'lucide-react';

interface EmptyStateProps {
  type?: 'no-data' | 'no-results' | 'no-upload' | 'error';
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  action,
  icon,
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'no-results':
        return {
          icon: <Filter className="w-16 h-16 text-slate-400" />,
          title: 'No results found',
          description: 'Try adjusting your filters or search terms to find what you\'re looking for.',
        };
      case 'no-upload':
        return {
          icon: <Upload className="w-16 h-16 text-slate-400" />,
          title: 'No data uploaded yet',
          description: 'Upload a CSV file to get started with your class analytics and insights.',
        };
      case 'error':
        return {
          icon: <FileX className="w-16 h-16 text-red-400" />,
          title: 'Unable to load data',
          description: 'There was an error loading your data. Please try refreshing the page.',
        };
      default:
        return {
          icon: <Calendar className="w-16 h-16 text-slate-400" />,
          title: 'No data available',
          description: 'There is no data to display at this time.',
        };
    }
  };

  const defaultContent = getDefaultContent();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="mb-6 opacity-60">
        {icon || defaultContent.icon}
      </div>
      
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {title || defaultContent.title}
      </h3>
      
      <p className="text-slate-600 max-w-md mb-6">
        {description || defaultContent.description}
      </p>
      
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
