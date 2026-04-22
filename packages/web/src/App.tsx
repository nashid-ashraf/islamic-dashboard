import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { NotificationOrchestrator } from './NotificationOrchestrator';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuranReader = lazy(() => import('./pages/QuranReader'));
const Reminders = lazy(() => import('./pages/Reminders'));
const AdhkarRoutine = lazy(() => import('./pages/AdhkarRoutine'));

function App() {
  return (
    <BrowserRouter>
      <NotificationOrchestrator />
      <div className="app">
        <a href="#main" className="skip-link">Skip to main content</a>
        <nav className="tab-bar" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
            Dashboard
          </NavLink>
          <NavLink to="/quran" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
            Quran
          </NavLink>
          <NavLink to="/adhkar/morning" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
            Adhkar
          </NavLink>
          <NavLink to="/reminders" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
            Reminders
          </NavLink>
        </nav>
        <main id="main" className="content">
          <Suspense fallback={<div className="loading" role="status" aria-live="polite">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quran" element={<QuranReader />} />
              <Route path="/adhkar/:routine" element={<AdhkarRoutine />} />
              <Route path="/reminders" element={<Reminders />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
