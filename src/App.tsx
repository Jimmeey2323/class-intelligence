import { useState } from 'react';
import { useDashboardStore } from './store/dashboardStore';
import FileUpload from './components/FileUpload';
import FilterSection from './components/FilterSection';
import DataTableEnhanced from './components/DataTableEnhanced';
import Rankings from './components/Rankings';
import MetricsCardsEnhanced from './components/MetricsCardsEnhanced';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutDashboard, Target, Users } from 'lucide-react';
import ProScheduler from './components/ProScheduler';
import { MemberBehaviorAnalytics } from './components/MemberBehaviorAnalytics';

type ViewTab = 'dashboard' | 'pro-scheduler' | 'members';

function App() {
  const { rawData } = useDashboardStore();
  const [showUpload, setShowUpload] = useState(false);
  const [activeView, setActiveView] = useState<ViewTab>('dashboard');

  const hasData = rawData.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pearl-50 via-white to-blue-50 px-4 sm:px-8 md:px-16 lg:px-24 py-6 sm:py-8 md:py-12 transition-all duration-300">
      {/* Header */}
      <header className="mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-2xl glass-card gradient-blue shadow-lg transition-transform duration-300 hover:scale-110 hover:rotate-6">
              <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 bg-clip-text text-transparent">
                Class Intelligence Dashboard
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Comprehensive analytics for your fitness studio operations
              </p>
            </div>
          </div>
          {hasData && !showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 touch-manipulation min-h-[44px]"
            >
              Upload New Data
            </button>
          )}
        </div>
      </header>

      {/* Upload Section */}
      {(showUpload || !hasData) && (
        <div className="mb-8">
          <FileUpload onUploadComplete={() => setShowUpload(false)} />
        </div>
      )}

      {/* Tab Navigation */}
      {hasData && (
        <div className="glass-card rounded-2xl p-1.5 sm:p-2 inline-flex flex-wrap gap-1.5 sm:gap-2 mb-6 sm:mb-8 shadow-lg">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 touch-manipulation min-h-[44px] ${
              activeView === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                : 'text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Main Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveView('members')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 touch-manipulation min-h-[44px] ${
              activeView === 'members'
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg scale-105'
                : 'text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Member Analytics</span>
            <span className="sm:hidden">Members</span>
          </button>
          <button
            onClick={() => setActiveView('pro-scheduler')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 touch-manipulation min-h-[44px] ${
              activeView === 'pro-scheduler'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
                : 'text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Target className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Pro Scheduler</span>
            <span className="sm:hidden">Schedule</span>
          </button>
        </div>
      )}

      {/* Global Filter Section */}
      {hasData && <FilterSection />}

      {/* Main Dashboard View */}
      {hasData && activeView === 'dashboard' && (
        <ErrorBoundary fallbackTitle="Dashboard Error">
          <div className="space-y-8">
            <MetricsCardsEnhanced />
            <Rankings />
            <DataTableEnhanced />
          </div>
        </ErrorBoundary>
      )}

      {/* Member Analytics View */}
      {hasData && activeView === 'members' && (
        <ErrorBoundary fallbackTitle="Member Analytics Error">
          <MemberBehaviorAnalytics />
        </ErrorBoundary>
      )}

      {/* Pro Scheduler View */}
      {hasData && activeView === 'pro-scheduler' && (
        <ErrorBoundary fallbackTitle="Pro Scheduler Error">
          <ProScheduler />
        </ErrorBoundary>
      )}

      {/* Footer */}
      {hasData && (
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>© 2025 Class Intelligence Dashboard. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}

export default App;
