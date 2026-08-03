import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Bookings from './pages/Bookings';
import Invoices from './pages/Invoices';
import ClientPortal from './pages/ClientPortal';
import GalleryProofing from './pages/GalleryProofing';

import { 
  Camera, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  LogOut, 
  UserCircle 
} from 'lucide-react';

import './styles/theme.css';

// Guard for protected Studio Dashboard routes
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Loading Aperture...</div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Layout with sidebar navigation
const DashboardLayout: React.FC = () => {
  const { studioName, userName, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/dashboard/clients', label: 'Clients', icon: <Users size={20} /> },
    { path: '/dashboard/bookings', label: 'Calendar', icon: <Calendar size={20} /> },
    { path: '/dashboard/invoices', label: 'Invoicing', icon: <FileText size={20} /> },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <Camera size={26} color="var(--accent-purple)" />
            <span>APERTURE</span>
          </div>
          <nav>
            <ul className="sidebar-menu">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link 
                      to={item.path} 
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <UserCircle size={32} color="var(--text-secondary)" />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {userName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {studioName}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem' }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/invoices" element={<Invoices />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<Login />} />

          {/* Client-Facing Portals (Public sharing URLs) */}
          <Route path="/portal/:clientId" element={<ClientPortal />} />
          <Route path="/portal/:clientId/gallery/:galleryId" element={<GalleryProofing />} />

          {/* Private Studio CRM routes */}
          <Route 
            path="/dashboard/*" 
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            } 
          />

          {/* Fallbacks */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
