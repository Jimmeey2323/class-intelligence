import { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from './store/dashboardStore';
import FileUpload from './components/FileUpload';
import FilterSection from './components/FilterSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutDashboard, Target, Users, Sparkles, BarChart3 } from 'lucide-react';
import LoadingSkeletons from './components/LoadingSkeletons';

// Lazy load all heavy components
const DataTableEnhanced = lazy(() => import('./components/DataTableEnhanced'));
const Rankings = lazy(() => import('./components/Rankings'));
const MetricsCardsEnhanced = lazy(() => import('./components/MetricsCardsEnhanced'));
const ProScheduler = lazy(() => import('./components/ProScheduler'));
const MemberBehaviorAnalytics = lazy(() => import('./components/MemberBehaviorAnalytics').then(module => ({ default: module.MemberBehaviorAnalytics })));
const ClassDeepDive = lazy(() => import('./components/ClassDeepDive'));

type ViewTab = 'dashboard' | 'pro-scheduler' | 'members' | 'class-dive';

function App() {
  const { rawData } = useDashboardStore();
  const [showUpload, setShowUpload] = useState(false);
  const [activeView, setActiveView] = useState<ViewTab>('dashboard');

  const hasData = rawData.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 px-4 sm:px-8 md:px-16 lg:px-24 py-6 sm:py-8 md:py-12 transition-all duration-300 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 sm:mb-10 glass-card rounded-3xl p-6 border border-white/20 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 6 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 shadow-lg relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse" />
              <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-white relative z-10" />
            </motion.div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 bg-clip-text text-transparent flex items-center gap-2">
                <span>Class Intelligence Dashboard</span>
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 animate-pulse" />
              </h1>
              <p className="text-slate-700 mt-1 text-sm sm:text-base font-semibold">
                Comprehensive analytics for your fitness studio operations
              </p>
            </div>
          </div>
          {hasData && !showUpload && (
            <motion.button
              onClick={() => setShowUpload(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 touch-manipulation min-h-[44px] relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10">Upload New Data</span>
            </motion.button>
          )}
        </div>
      </motion.header>

      {/* Upload Section */}
      {(showUpload || !hasData) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          <FileUpload onUploadComplete={() => setShowUpload(false)} />
        </motion.div>
      )}

      {/* Tab Navigation */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card rounded-2xl p-2 inline-flex flex-wrap gap-2 mb-6 sm:mb-8 shadow-2xl overflow-x-auto backdrop-blur-xl border border-white/20"
        >
          <motion.button
            onClick={() => setActiveView('dashboard')}
            whileHover={{ scale: activeView !== 'dashboard' ? 1.02 : 1 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 touch-manipulation min-h-[44px] whitespace-nowrap relative overflow-hidden ${
              activeView === 'dashboard'
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white shadow-xl scale-105 border border-blue-500/30'
                : 'text-slate-700 hover:bg-white/60 active:scale-95 backdrop-blur-sm border border-transparent hover:border-slate-300'
            }`}
          >
            {activeView === 'dashboard' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            <span className="hidden sm:inline relative z-10">Main Dashboard</span>
            <span className="sm:hidden relative z-10">Dashboard</span>
          </motion.button>
          <motion.button
            onClick={() => setActiveView('members')}
            whileHover={{ scale: activeView !== 'members' ? 1.02 : 1 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 touch-manipulation min-h-[44px] whitespace-nowrap relative overflow-hidden ${
              activeView === 'members'
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white shadow-xl scale-105 border border-blue-500/30'
                : 'text-slate-700 hover:bg-white/60 active:scale-95 border border-transparent hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            <span className="hidden sm:inline relative z-10">Member Analytics</span>
            <span className="sm:hidden relative z-10">Members</span>
          </motion.button>
          <motion.button
            onClick={() => setActiveView('pro-scheduler')}
            whileHover={{ scale: activeView !== 'pro-scheduler' ? 1.02 : 1 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 touch-manipulation min-h-[44px] whitespace-nowrap relative overflow-hidden ${
              activeView === 'pro-scheduler'
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white shadow-xl scale-105 border border-blue-500/30'
                : 'text-slate-700 hover:bg-white/60 active:scale-95 border border-transparent hover:border-slate-300'
            }`}
          >
            <Target className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            <span className="hidden sm:inline relative z-10">Pro Scheduler</span>
            <span className="sm:hidden relative z-10">Schedule</span>
          </motion.button>
          <motion.button
            onClick={() => setActiveView('class-dive')}
            whileHover={{ scale: activeView !== 'class-dive' ? 1.02 : 1 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 touch-manipulation min-h-[44px] whitespace-nowrap relative overflow-hidden ${
              activeView === 'class-dive'
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white shadow-xl scale-105 border border-blue-500/30'
                : 'text-slate-700 hover:bg-white/60 active:scale-95 border border-transparent hover:border-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            <span className="hidden sm:inline relative z-10">Class Deep Dive</span>
            <span className="sm:hidden relative z-10">Deep Dive</span>
          </motion.button>
        </motion.div>
      )}

      {/* Global Filter Section */}
      {hasData && <FilterSection />}

      {/* All Views wrapped in a single AnimatePresence */}
      <AnimatePresence mode="wait">
        {hasData && activeView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ErrorBoundary fallbackTitle="Dashboard Error">
              <Suspense fallback={<LoadingSkeletons />}>
                <div className="space-y-8">
                  <MetricsCardsEnhanced />
                  <Rankings />
                  <DataTableEnhanced />
                </div>
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}

        {hasData && activeView === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ErrorBoundary fallbackTitle="Member Analytics Error">
              <Suspense fallback={<LoadingSkeletons />}>
                <MemberBehaviorAnalytics />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}

        {hasData && activeView === 'pro-scheduler' && (
          <motion.div
            key="scheduler"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ErrorBoundary fallbackTitle="Pro Scheduler Error">
              <Suspense fallback={<LoadingSkeletons />}>
                <ProScheduler />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}

        {hasData && activeView === 'class-dive' && (
          <motion.div
            key="class-dive"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ErrorBoundary fallbackTitle="Class Deep Dive Error">
              <Suspense fallback={<LoadingSkeletons />}>
                <ClassDeepDive />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {hasData && (
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center text-sm text-gray-500 py-6"
        >
          <p className="font-medium">© 2025 Class Intelligence Dashboard. All rights reserved.</p>
          <p className="mt-2 text-xs" style={{ fontFamily: 'Brush Script MT, cursive' }}>
            Crafted with ✨ by Jimmeey
          </p>
        </motion.footer>
      )}
    </div>
  );
}

export default App;
