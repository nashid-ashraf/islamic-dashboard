import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuranReader = lazy(() => import('./pages/QuranReader'));
const Reminders = lazy(() => import('./pages/Reminders'));

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="tab-bar">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
            Dashboard
          </NavLink>
          <NavLink to="/quran" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
            Quran
          </NavLink>
          <NavLink to="/reminders" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
            Reminders
          </NavLink>
        </nav>
        <main className="content">
          <Suspense fallback={<div className="loading">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quran" element={<QuranReader />} />
              <Route path="/reminders" element={<Reminders />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
