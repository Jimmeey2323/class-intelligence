# Class Intelligence Dashboard

A comprehensive, modern analytics dashboard for fitness studio operations built with React, TypeScript, and Vite.

## Features

### 🎯 Core Functionality
- **Multi-CSV Upload**: Drag-and-drop support for multiple CSV files with validation
- **Advanced Filtering**: Collapsible filter panel with date range, trainers, locations, class types, and search
- **Grouped & Flat Views**: Toggle between grouped analytics and detailed flat table view
- **20+ Grouping Options**: Group by Class, Trainer, Location, Day, Time, and more
- **Rankings**: Top and bottom performers with customizable metrics

### 📊 Metrics & Analytics
- **Fill Rate**: Capacity utilization across classes
- **Cancellation Rate**: Track late cancellations and no-shows
- **Class Average**: Attendance metrics for all and non-empty classes
- **Revenue Analytics**: Per booking, per check-in, and lost revenue calculations
- **Consistency Score**: Variance-based performance stability
- **Weighted Average**: Capacity-weighted attendance metrics

### 🎨 Design
- **Pearl White Theme**: Clean, professional glassmorphic design
- **Gradient Blue Accents**: Beautiful blue gradients for headers and highlights
- **Responsive Layout**: Fully responsive from mobile to desktop
- **Smooth Animations**: Framer Motion powered transitions
- **Custom Scrollbars**: Styled to match the theme

### 🔧 Technical Features
- **TypeScript**: Full type safety
- **Zustand State Management**: Lightweight and efficient
- **TanStack Table**: Powerful table with sorting, pagination, and virtualization
- **Date-fns**: Efficient date handling
- **CSV Processing**: PapaParse for robust CSV parsing
- **Export Capabilities**: CSV and XLSX export support

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd "Planning & Schedulling"
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Usage

### 1. Upload Data
- Drag and drop CSV files containing "session" in the filename
- Files are automatically validated before processing
- Multiple files are merged into a single dataset

### 2. Apply Filters
- Click the "Filters" section to expand
- Set date range (defaults to previous month)
- Select trainers, locations, class types, and classes
- Use search for quick filtering
- Set minimum check-ins for grouped view

### 3. View Analytics
- **Metrics Cards**: High-level KPIs at the top
- **Rankings**: Top and bottom performers side by side
- **Data Table**: Detailed class-by-class breakdown

### 4. Explore Data
- **Toggle View**: Switch between grouped and flat views
- **Change Grouping**: Select from 20+ grouping options
- **Sort Columns**: Click column headers to sort
- **Expand Groups**: Click chevrons to see detailed rows
- **View Details**: Click eye icon for drilldown modals

### 5. Export Results
- Click "Export" to download filtered data
- Supports CSV and XLSX formats

## CSV File Format

Your CSV files should contain the following columns:

**Required:**
- `TrainerID`, `Trainer`, `SessionID`, `Capacity`, `CheckedIn`, `Date`, `Class`, `UniqueID1`

**Optional but recommended:**
- `FirstName`, `LastName`, `SessionName`, `LateCancelled`, `Booked`, `Complimentary`
- `Location`, `Day`, `Time`, `Revenue`, `NonPaid`, `UniqueID2`
- `Memberships`, `Packages`, `IntroOffers`, `SingleClasses`, `Type`, `Classes`

**Example Row:**
```csv
TrainerID,FirstName,LastName,Trainer,SessionID,SessionName,Capacity,CheckedIn,LateCancelled,Booked,Complimentary,Location,Date,Day,Time,Revenue,NonPaid,UniqueID1,UniqueID2,Memberships,Packages,IntroOffers,SingleClasses,Type,Class,Classes
53133,Anisha,Shah,Anisha Shah,99927036,Myriad Hosted Class at Physique 57,20,7,1,8,0,Kwality House Kemps Corner,2024-02-29,Thursday,11:30:00,0,8,IQ220GR,UJMO1FW,0,0,0,0,Barre 57,Studio Hosted Class,1
```

## Tech Stack

- **React 18**: UI library
- **TypeScript 5**: Type safety
- **Vite 5**: Build tool
- **Tailwind CSS 3**: Styling
- **Zustand 4**: State management
- **TanStack Table 8**: Advanced table functionality
- **Framer Motion 11**: Animations
- **Recharts 2**: Charts (ready for analytics expansion)
- **Fuse.js 7**: Fuzzy search
- **PapaParse 5**: CSV parsing
- **date-fns 3**: Date utilities
- **SheetJS (xlsx)**: Excel export
- **Lucide React**: Icons

## Project Structure

```
src/
├── components/
│   ├── DataTable.tsx       # Main data table with grouping
│   ├── FileUpload.tsx      # Drag-and-drop CSV upload
│   ├── FilterSection.tsx   # Collapsible filters
│   ├── MetricsCards.tsx    # KPI cards
│   └── Rankings.tsx        # Top/bottom performers
├── store/
│   └── dashboardStore.ts   # Zustand state management
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   ├── calculations.ts     # Metrics and calculations
│   └── csvParser.ts        # CSV processing
├── App.tsx                 # Main app component
├── main.tsx                # Entry point
└── index.css               # Global styles

```

## Roadmap

### Phase 1: Core Features ✅
- [x] CSV upload and parsing
- [x] Filtering system
- [x] Grouped and flat table views
- [x] Metrics calculations
- [x] Rankings lists
- [x] Glassmorphic UI

### Phase 2: Enhanced Analytics (Coming Soon)
- [ ] Interactive charts and graphs
- [ ] Historical trend analysis
- [ ] Comparative analytics
- [ ] Forecasting models
- [ ] Scheduling suggestions

### Phase 3: Advanced Features (Planned)
- [ ] Drilldown modals with sparklines
- [ ] PDF report generation
- [ ] Shareable snapshot links
- [ ] Auto-suggestions engine
- [ ] Email integration
- [ ] Multi-user support

## Performance

- **Virtualization**: Handles datasets with 10,000+ rows smoothly
- **Optimized Rendering**: React memoization and efficient re-renders
- **Lazy Loading**: Components load on demand
- **Code Splitting**: Automatic chunk splitting by Vite

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

This is a custom project for fitness studio operations. For feature requests or bug reports, please contact the development team.

## License

Proprietary - All rights reserved

## Support

For technical support or questions, please contact your development team.

---

**Built with ❤️ for better fitness studio operations**
