import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Bookings from './pages/Bookings';
import Invoices from './pages/Invoices';
import Contracts from './pages/Contracts';
import PhotoUpload from './pages/PhotoUpload';
import Weddings from './pages/Weddings';
import GuestPortal from './pages/GuestPortal';
import GuestRegister from './pages/GuestRegister';
import GuestPersonalGallery from './pages/GuestPersonalGallery';
import ClientPortal from './pages/ClientPortal';
import GalleryProofing from './pages/GalleryProofing';
import PhotoReview from './pages/PhotoReview';

import { 
  Camera, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  LogOut, 
  UserCircle,
  Heart,
  Sparkles,
  X
} from 'lucide-react';

import './styles/theme.css';

// Guard for protected Studio Dashboard routes
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Layout with sidebar navigation
const DashboardLayout: React.FC = () => {
  const { studioId, studioName, userName, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [toast, setToast] = React.useState<{ id: string; title: string; bookingId: string; rejected: number; total: number } | null>(null);

  React.useEffect(() => {
    if (!studioId) return;

    // Determine WS protocol based on page host
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/api/ws/${studioId}`;

    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'culling_complete') {
            setToast({
              id: payload.photo_id,
              title: payload.gallery_title,
              bookingId: payload.booking_id,
              rejected: payload.rejected_photos,
              total: payload.total_photos
            });
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [studioId]);

  React.useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => {
      setToast(null);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const menuItems = [
    { path: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/dashboard/clients', label: 'Clients', icon: <Users size={20} /> },
    { path: '/dashboard/bookings', label: 'Calendar', icon: <Calendar size={20} /> },
    { path: '/dashboard/weddings', label: 'Weddings', icon: <Heart size={20} /> },
    { path: '/dashboard/invoices', label: 'Invoicing', icon: <FileText size={20} /> },
    { path: '/dashboard/contracts', label: 'Contracts', icon: <FileText size={20} /> },
    { path: '/dashboard/upload', label: 'Uploads', icon: <Camera size={20} /> },
  ];

  return (
    <div className="app-container">
      {/* Slide-in Toast popup overlay */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          width: '320px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--accent-purple)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          color: '#fff',
          boxShadow: '0 10px 40px rgba(124, 58, 237, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-purple)' }}>
              <Sparkles size={14} />
              <span>AI APERTURE ALERT</span>
            </span>
            <button 
              onClick={() => setToast(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
            AI culling completely finished for <strong>{toast.title}</strong>!
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Processed: {toast.total} images | Flagged duplicates/blinks: {toast.rejected}
            </div>
          </div>
          <button
            onClick={() => {
              setToast(null);
              navigate(`/dashboard/jobs/${toast.bookingId}/review`);
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.75rem', padding: '0.45rem', width: '100%', justifyContent: 'center' }}
          >
            Open Review Workspace
          </button>
        </div>
      )}
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
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/upload" element={<PhotoUpload />} />
          <Route path="/jobs/:bookingId/review" element={<PhotoReview />} />
          <Route path="/weddings" element={<Weddings />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard/*" 
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            } 
          />
          {/* Public Portal Routes */}
          <Route path="/portal/:clientId" element={<ClientPortal />} />
          <Route path="/portal/:clientId/gallery/:galleryId" element={<GalleryProofing />} />
          
          {/* Public Guest QR Routes */}
          <Route path="/public/wedding/:bookingId/guest-upload" element={<GuestPortal />} />
          <Route path="/public/wedding/:bookingId/guest-register" element={<GuestRegister />} />
          <Route path="/public/guest/:guestId/gallery" element={<GuestPersonalGallery />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
