import { useCallback, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { parseMultipleCSVFiles, validateCSVStructure } from '../utils/csvParser';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

interface FileStatus {
  file: File;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'processing' | 'complete';
  error?: string;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setRawData } = useDashboardStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.name.toLowerCase().includes('session') && file.name.endsWith('.csv')
    );

    if (droppedFiles.length === 0) {
      alert('Please drop CSV files containing "session" in the filename');
      return;
    }

    await processFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      await processFiles(selectedFiles);
    }
  }, []);

  const processFiles = async (uploadedFiles: File[]) => {
    // Initialize file statuses
    const fileStatuses: FileStatus[] = uploadedFiles.map((file) => ({
      file,
      status: 'validating',
    }));
    setFiles(fileStatuses);
    setIsProcessing(true);

    // Validate each file
    for (let i = 0; i < fileStatuses.length; i++) {
      const validation = await validateCSVStructure(fileStatuses[i].file);
      fileStatuses[i].status = validation.valid ? 'valid' : 'invalid';
      fileStatuses[i].error = validation.errors.join(', ');
      setFiles([...fileStatuses]);
    }

    // Process valid files
    const validFiles = fileStatuses.filter((f) => f.status === 'valid').map((f) => f.file);

    if (validFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Update status to processing
    fileStatuses.forEach((f) => {
      if (f.status === 'valid') f.status = 'processing';
    });
    setFiles([...fileStatuses]);

    try {
      const data = await parseMultipleCSVFiles(validFiles);

      // Update status to complete
      fileStatuses.forEach((f) => {
        if (f.status === 'processing') f.status = 'complete';
      });
      setFiles([...fileStatuses]);

      // Set data in store
      setRawData(data);

      // Notify completion
      setTimeout(() => {
        onUploadComplete?.();
      }, 1000);
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'validating':
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'valid':
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="glass-card rounded-3xl p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Session Data</h2>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-3 border-dashed rounded-2xl p-12 transition-all duration-300
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
          }
        `}
      >
        <input
          type="file"
          multiple
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
            <Upload className="w-12 h-12 text-blue-600" />
          </div>

          <div className="text-center">
            <p className="text-xl font-semibold text-gray-700 mb-2">
              Drop CSV files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Files must contain "Session" in the name and be in CSV format
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-700">Files</h3>
          {files.map((fileStatus, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(fileStatus.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{fileStatus.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(fileStatus.file.size / 1024).toFixed(1)} KB
                  </p>
                  {fileStatus.error && (
                    <p className="text-xs text-red-500 mt-1">{fileStatus.error}</p>
                  )}
                </div>
              </div>

              {fileStatus.status !== 'processing' && fileStatus.status !== 'validating' && (
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
