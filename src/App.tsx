import { useState } from 'react';
import { useDashboardStore } from './store/dashboardStore';
import FileUpload from './components/FileUpload';
import FilterSection from './components/FilterSection';
import DataTableFixed from './components/DataTableFixed';
import Rankings from './components/Rankings';
import MetricsCardsEnhanced from './components/MetricsCardsEnhanced';
import { FormatIntelligence } from './components/FormatIntelligence';
import WeeklyCalendar from './components/WeeklyCalendar';
import { LayoutDashboard, TrendingUp, Calendar } from 'lucide-react';

type ViewTab = 'dashboard' | 'formats' | 'calendar';

function App() {
  const { rawData } = useDashboardStore();
  const [showUpload, setShowUpload] = useState(true);
  const [activeView, setActiveView] = useState<ViewTab>('dashboard');

  // Hide upload once data is loaded
  const hasData = rawData.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pearl-50 via-white to-blue-50 px-8 md:px-16 lg:px-24 py-8 md:py-12">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 rounded-2xl glass-card gradient-blue">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 bg-clip-text text-transparent">
              Class Intelligence Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive analytics for your fitness studio operations
            </p>
          </div>
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
        <div className="glass-card rounded-2xl p-2 inline-flex gap-2 mb-8">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeView === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Main Dashboard
          </button>
          <button
            onClick={() => setActiveView('formats')}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeView === 'formats'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Format Intelligence
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeView === 'calendar'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Weekly Calendar
          </button>
        </div>
      )}

      {/* Main Dashboard */}
      {hasData && activeView === 'dashboard' && (
        <div className="space-y-8">
          {/* Metrics Cards */}
          <MetricsCardsEnhanced />

          {/* Filter Section */}
          <FilterSection />

          {/* Rankings */}
          <Rankings />

          {/* Data Table */}
          <DataTableFixed />
        </div>
      )}

      {/* Format Intelligence View */}
      {hasData && activeView === 'formats' && (
        <FormatIntelligence />
      )}

      {/* Weekly Calendar View */}
      {hasData && activeView === 'calendar' && (
        <WeeklyCalendar />
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
