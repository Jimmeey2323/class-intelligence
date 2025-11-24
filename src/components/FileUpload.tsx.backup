import { useCallback, useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Cloud } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { parseMultipleCSVFiles, validateCSVStructure } from '../utils/csvParser';
import { loadEnhancedSessionsFromGoogleSheets, loadActiveClassesFromGoogleSheets, loadCheckinsFromGoogleSheets } from '../services/googleSheetsService';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

interface FileStatus {
  file: File;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'processing' | 'complete';
  error?: string;
  progress?: number;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const { setRawData, setCheckinsData, rawData } = useDashboardStore();

  // Load data from Google Sheets on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Only load if no data is present
      if (rawData.length > 0) {
        return;
      }

      setIsLoadingFromSheets(true);
      setSheetsError(null);

      try {
        // Load sessions, active classes, and checkins in parallel
        const [sessionsData, activeClassesData, checkinsData] = await Promise.all([
          loadEnhancedSessionsFromGoogleSheets(),
          loadActiveClassesFromGoogleSheets(),
          loadCheckinsFromGoogleSheets()
        ]);
        
        if (sessionsData.length > 0) {
          setRawData(sessionsData);
          
          // Update active classes data in store
          if (activeClassesData && Object.keys(activeClassesData).length > 0) {
            useDashboardStore.setState({ activeClassesData });
            console.log('✅ Loaded active classes from Google Sheets:', {
              days: Object.keys(activeClassesData),
              totalClasses: Object.values(activeClassesData).reduce((sum, classes) => sum + classes.length, 0)
            });
          }
          
          // Update checkins data in store
          if (checkinsData && checkinsData.length > 0) {
            setCheckinsData(checkinsData);
            console.log('✅ Loaded checkins from Google Sheets:', {
              totalCheckins: checkinsData.length,
              uniqueMembers: new Set(checkinsData.map(c => c.MemberID)).size,
              uniqueSessions: new Set(checkinsData.map(c => c.UniqueID1)).size
            });
          }
          
          setTimeout(() => {
            onUploadComplete?.();
          }, 500);
        }
      } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        setSheetsError(error instanceof Error ? error.message : 'Failed to load data from Google Sheets');
      } finally {
        setIsLoadingFromSheets(false);
      }
    };

    loadInitialData();
  }, []); // Only run once on mount

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
      progress: 0,
    }));
    setFiles(fileStatuses);
    setIsProcessing(true);

    // Validate each file
    for (let i = 0; i < fileStatuses.length; i++) {
      fileStatuses[i].progress = 20;
      setFiles([...fileStatuses]);
      
      const validation = await validateCSVStructure(fileStatuses[i].file);
      fileStatuses[i].status = validation.valid ? 'valid' : 'invalid';
      fileStatuses[i].error = validation.errors.join(', ');
      fileStatuses[i].progress = validation.valid ? 40 : 100;
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
      if (f.status === 'valid') {
        f.status = 'processing';
        f.progress = 50;
      }
    });
    setFiles([...fileStatuses]);

    try {
      // Simulate progress during parsing
      const progressInterval = setInterval(() => {
        fileStatuses.forEach((f) => {
          if (f.status === 'processing' && f.progress && f.progress < 90) {
            f.progress += 5;
          }
        });
        setFiles([...fileStatuses]);
      }, 200);
      
      const data = await parseMultipleCSVFiles(validFiles);
      
      clearInterval(progressInterval);

      // Update status to complete
      fileStatuses.forEach((f) => {
        if (f.status === 'processing') {
          f.status = 'complete';
          f.progress = 100;
        }
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

      {/* Loading from Google Sheets indicator */}
      {isLoadingFromSheets && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                Loading data from Google Sheets...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sheets error display */}
      {sheetsError && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Could not load data from Google Sheets
              </p>
              <p className="text-xs text-amber-700 mt-1">{sheetsError}</p>
              <p className="text-xs text-amber-600 mt-2">
                You can still upload CSV files manually below.
              </p>
            </div>
          </div>
        </div>
      )}

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
          ${isLoadingFromSheets ? 'opacity-50 pointer-events-none' : ''}
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
              className="flex flex-col p-4 rounded-xl bg-white border border-gray-200 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
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
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              
              {/* Progress bar */}
              {(fileStatus.status === 'validating' || fileStatus.status === 'processing') && fileStatus.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {fileStatus.status === 'validating' ? 'Validating...' : 'Processing...'}
                    </span>
                    <span className="text-xs font-medium text-blue-600">{fileStatus.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${fileStatus.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
