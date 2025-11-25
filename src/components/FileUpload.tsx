import { useCallback, useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Cloud, UploadCloud, Loader, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue, animate } from 'framer-motion';
import { useDashboardStore } from '../store/dashboardStore';
import { parseMultipleCSVFiles, validateCSVStructure } from '../utils/csvParser';
import { loadEnhancedSessionsFromGoogleSheets, loadActiveClassesFromGoogleSheets, loadCheckinsFromGoogleSheets } from '../services/googleSheetsService';
import { TextShimmer, Particles } from './AnimationUtils';


const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface FileUploadProps {
  onUploadComplete?: () => void;
}

interface FileStatus {
  file: File;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'processing' | 'complete';
  error?: string;
  progress?: number;
  id?: string;
}

const COLORS_TOP = ['#13FFAA', '#1E67C6', '#CE84CF', '#DD335C'];

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const { setRawData, setCheckinsData, rawData } = useDashboardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasExistingData = rawData.length > 0;
  
  const color = useMotionValue(COLORS_TOP[0]);

  useEffect(() => {
    animate(color, COLORS_TOP, {
      ease: 'easeInOut',
      duration: 10,
      repeat: Infinity,
      repeatType: 'mirror',
    });
  }, []);

  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 0%, #020617 50%, ${color})`;

  // Load data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (rawData.length > 0) {
        return;
      }

      setIsLoadingFromSheets(true);
      setSheetsError(null);

      try {
        const [sessionsData, activeClassesData] = await Promise.all([
          loadEnhancedSessionsFromGoogleSheets(),
          loadActiveClassesFromGoogleSheets()
        ]);
        
        if (sessionsData.length > 0) {
          setRawData(sessionsData);
          
          if (activeClassesData && Object.keys(activeClassesData).length > 0) {
            useDashboardStore.setState({ activeClassesData });
            console.log('✅ Loaded active classes');
          }
          
          // Load checkins in background (not blocking initial render)
          loadCheckinsFromGoogleSheets().then(checkinsData => {
            if (checkinsData && checkinsData.length > 0) {
              setCheckinsData(checkinsData);
              console.log('✅ Loaded checkins (background)');
            }
          }).catch(err => console.warn('Checkins load failed:', err));
          
          setTimeout(() => {
            onUploadComplete?.();
          }, 500);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setSheetsError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoadingFromSheets(false);
      }
    };

    loadInitialData();
  }, []);

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
    const fileStatuses: FileStatus[] = uploadedFiles.map((file) => ({
      file,
      status: 'validating',
      progress: 0,
      id: `${URL.createObjectURL(file)}-${Date.now()}`,
    }));
    setFiles(fileStatuses);
    setIsProcessing(true);

    for (let i = 0; i < fileStatuses.length; i++) {
      fileStatuses[i].progress = 20;
      setFiles([...fileStatuses]);
      
      const validation = await validateCSVStructure(fileStatuses[i].file);
      fileStatuses[i].status = validation.valid ? 'valid' : 'invalid';
      fileStatuses[i].error = validation.errors.join(', ');
      fileStatuses[i].progress = validation.valid ? 40 : 100;
      setFiles([...fileStatuses]);
    }

    const validFiles = fileStatuses.filter((f) => f.status === 'valid').map((f) => f.file);

    if (validFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    fileStatuses.forEach((f) => {
      if (f.status === 'valid') {
        f.status = 'processing';
        f.progress = 50;
      }
    });
    setFiles([...fileStatuses]);

    try {
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

      fileStatuses.forEach((f) => {
        if (f.status === 'processing') {
          f.status = 'complete';
          f.progress = 100;
        }
      });
      setFiles([...fileStatuses]);

      setRawData(data);

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

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-auto z-50">
      {/* Close button - only show if there's existing data */}
      {hasExistingData && onUploadComplete && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onUploadComplete}
          className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-xl group"
        >
          <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </motion.button>
      )}
      
      <motion.section
        style={{
          backgroundImage,
        }}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-12 text-gray-200"
      >
        <Particles
          className="absolute inset-0"
          quantity={200}
          ease={80}
          color="#ffffff"
          refresh
        />

        {/* Simple CSS Star Field Alternative */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {[...Array(150)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 3 + 'px',
                height: Math.random() * 3 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random() * 0.5 + 0.2,
                animation: `twinkle ${Math.random() * 3 + 2}s infinite ${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center w-full px-4 max-w-6xl">
          {/* Hero Content */}
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-block rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-400/30 px-6 py-2.5 text-sm font-medium shadow-lg shadow-blue-500/20"
          >
            ✨ Real-time Processing • Advanced Analytics • Interactive Dashboards
          </motion.span>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <TextShimmer
              as="h1"
              className="max-w-4xl bg-gradient-to-br from-white to-gray-400 bg-clip-text text-center text-3xl font-bold leading-tight text-transparent sm:text-5xl sm:leading-tight md:text-6xl md:leading-tight"
              duration={3}
            >
              Attendance Analytics & Class Performance Index
            </TextShimmer>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-12 max-w-3xl text-center text-lg leading-relaxed text-gray-300 md:text-xl md:leading-relaxed"
          >
            Transform your fitness studio data into actionable insights with our powerful analytics engine. 
            Upload your class data and unlock comprehensive performance metrics, trainer comparisons, and growth opportunities.
          </motion.p>

          {/* Loading from Sheets Indicator */}
          {isLoadingFromSheets && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-6 rounded-2xl bg-blue-500/10 border border-blue-400/30 backdrop-blur-sm max-w-2xl w-full"
            >
              <div className="flex items-center gap-3 justify-center">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <Cloud className="w-6 h-6 text-blue-400" />
                <p className="text-base font-medium text-blue-200">
                  Loading data...
                </p>
              </div>
            </motion.div>
          )}

          {/* Sheets Error */}
          {sheetsError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-6 rounded-2xl bg-amber-500/10 border border-amber-400/30 backdrop-blur-sm max-w-2xl w-full"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-base font-medium text-amber-200">
                    Could not load data
                  </p>
                  <p className="text-sm text-amber-300/80 mt-2">{sheetsError}</p>
                  <p className="text-sm text-amber-400 mt-2">
                    You can still upload CSV files manually below.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* File Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-full max-w-4xl"
          >
            <motion.div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              initial={false}
              animate={{
                borderColor: isDragging ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                scale: isDragging ? 1.02 : 1,
              }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'relative rounded-3xl p-12 text-center cursor-pointer bg-white/5 border border-white/20 shadow-2xl hover:shadow-blue-500/20 backdrop-blur-xl transition-all duration-300',
                isDragging && 'ring-4 ring-blue-400/50 border-blue-400 shadow-blue-500/40 bg-white/10',
                isLoadingFromSheets && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="flex flex-col items-center gap-6">
                <motion.div
                  animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: isDragging ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                  className="relative"
                >
                  <motion.div
                    animate={{
                      opacity: isDragging ? [0.5, 1, 0.5] : 1,
                      scale: isDragging ? [0.95, 1.05, 0.95] : 1,
                    }}
                    transition={{
                      duration: 2,
                      repeat: isDragging ? Infinity : 0,
                      ease: 'easeInOut',
                    }}
                    className="absolute -inset-4 bg-blue-400/10 rounded-full blur-md"
                    style={{ display: isDragging ? 'block' : 'none' }}
                  />
                  <UploadCloud
                    className={cn(
                      'w-24 h-24 drop-shadow-2xl',
                      isDragging
                        ? 'text-blue-400 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]'
                        : 'text-gray-300 group-hover:text-blue-400 transition-all duration-300 hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]',
                    )}
                  />
                </motion.div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-white">
                    {isDragging
                      ? 'Drop CSV files here'
                      : files.length
                      ? 'Add more CSV files'
                      : 'Upload your CSV files'}
                  </h3>
                  <p className="text-gray-300 text-lg max-w-md mx-auto">
                    {isDragging ? (
                      <span className="font-medium text-blue-400">
                        Release to upload
                      </span>
                    ) : (
                      <>
                        Drag & drop CSV files here, or{' '}
                        <span className="text-blue-400 font-medium">browse</span>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-gray-400">
                    Files must contain 
                    <span className="font-mono bg-white/10 px-2 py-1 rounded text-blue-400 ml-1">
                      "Session"
                    </span>
                    {' '}in the filename
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </div>
            </motion.div>

            {/* File List */}
            <div className="mt-8 max-w-4xl mx-auto">
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-between items-center mb-4 px-2"
                  >
                    <h3 className="font-semibold text-xl text-white">
                      Uploaded files ({files.length})
                    </h3>
                    {files.length > 1 && (
                      <button
                        onClick={() => setFiles([])}
                        className="text-sm font-medium px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-gray-300 hover:text-red-400 transition-colors duration-200"
                      >
                        Clear all
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 overflow-y-auto pr-2 max-h-96">
                <AnimatePresence>
                  {files.map((fileStatus, index) => (
                    <motion.div
                      key={fileStatus.id || index}
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      className="px-4 py-4 flex items-start gap-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 shadow-lg hover:shadow-xl hover:bg-white/15 transition-all duration-300"
                    >
                      <div className="relative flex-shrink-0">
                        <FileText className="w-16 h-16 text-blue-400" />
                        {fileStatus.status === 'complete' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -right-2 -bottom-2 bg-gray-800 rounded-full shadow-sm"
                          >
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          </motion.div>
                        )}
                        {fileStatus.status === 'invalid' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -right-2 -bottom-2 bg-gray-800 rounded-full shadow-sm"
                          >
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          </motion.div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <h4
                              className="font-medium text-lg truncate text-white"
                              title={fileStatus.file.name}
                            >
                              {fileStatus.file.name}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-sm text-gray-400">
                            <span className="text-sm">
                              {formatFileSize(fileStatus.file.size)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              {fileStatus.progress !== undefined && (
                                <span className="font-medium">
                                  {Math.round(fileStatus.progress)}%
                                </span>
                              )}
                              {(fileStatus.status === 'validating' || fileStatus.status === 'processing') ? (
                                <Loader className="w-4 h-4 animate-spin text-blue-400" />
                              ) : fileStatus.status === 'complete' ? (
                                <Trash2
                                  className="w-4 h-4 cursor-pointer text-gray-400 hover:text-red-400 transition-colors duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(index);
                                  }}
                                  aria-label="Remove file"
                                />
                              ) : null}
                            </span>
                          </div>

                          {fileStatus.error && (
                            <p className="text-xs text-red-400 mt-1">{fileStatus.error}</p>
                          )}
                        </div>

                        {(fileStatus.status === 'validating' || fileStatus.status === 'processing') && fileStatus.progress !== undefined && (
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mt-3">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fileStatus.progress}%` }}
                              transition={{
                                duration: 0.4,
                                type: 'spring',
                                stiffness: 100,
                                ease: 'easeOut',
                              }}
                              className={cn(
                                'h-full rounded-full shadow-inner',
                                fileStatus.progress < 100 ? 'bg-blue-500' : 'bg-emerald-500',
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer Signature */}
      <footer className="relative py-12 bg-gradient-to-t from-gray-950 via-gray-900 to-transparent w-full border-t border-white/5">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-gray-400 text-xl tracking-wide" 
            style={{ fontFamily: 'Brush Script MT, cursive' }}
          >
            ✨ Crafted by Jimmeey
          </motion.p>
        </div>
      </footer>
    </div>
  );
}
