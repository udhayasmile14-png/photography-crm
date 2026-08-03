import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface BookingBrief {
  id: string;
  client_name: string;
  session_type: string;
  scheduled_at: string;
  status: string;
}

interface StatsData {
  total_clients: number;
  total_bookings: number;
  active_leads: number;
  revenue_paid: number;
  revenue_pending: number;
  upcoming_bookings: BookingBrief[];
}

const Dashboard: React.FC = () => {
  const { token, userName, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          logout();
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load dashboard statistics.');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token, logout]);

  // Demo client portal link (using a seed ID or warning)
  const copyDemoPortalLink = () => {
    // Generate a shareable client portal URL (we point it to a typical client route)
    // Since we seeded Alice Johnson, we can hardcode her ID if available, or just guide them.
    // The seed file creates Alice Johnson. We can provide a mock portal ID.
    // For demonstration, let's copy a path to a portal that is accessible
    const portalUrl = `${window.location.origin}/portal/demo-client-id`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
      </div>
    );
  }

  const statItems = [
    { label: 'Total Clients', value: stats?.total_clients || 0, desc: 'Registered clients', icon: <Users size={22} color="var(--accent-blue)" /> },
    { label: 'Total Bookings', value: stats?.total_bookings || 0, desc: 'Sessions scheduled', icon: <Calendar size={22} color="var(--accent-purple)" /> },
    { label: 'Active Leads', value: stats?.active_leads || 0, desc: 'Inquiries in pipeline', icon: <TrendingUp size={22} color="var(--accent-yellow)" /> },
    { label: 'Revenue (Paid)', value: `$${stats?.revenue_paid.toLocaleString() || '0'}`, desc: `Pending: $${stats?.revenue_pending.toLocaleString() || '0'}`, icon: <DollarSign size={22} color="var(--accent-emerald)" /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Workspace Overview</h1>
          <p className="page-subtitle">Welcome back, {userName}. Here is what's happening today.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={copyDemoPortalLink} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {copied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Link!' : 'Client Portal Link'}</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/bookings')} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Plus size={16} />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statItems.map((item, idx) => (
          <div key={idx} className="glass-panel stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{item.label}</div>
                <div className="stat-value">{item.value}</div>
                <div className="stat-desc">{item.desc}</div>
              </div>
              <div style={{ background: 'hsla(230, 20%, 20%, 0.5)', padding: '0.6rem', borderRadius: '50%', border: '1px solid var(--border-color)' }}>
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Upcoming Bookings panel */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Upcoming Shoot Schedule
          </h2>
          {stats && stats.upcoming_bookings.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Session</th>
                    <th>Scheduled Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcoming_bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td style={{ fontWeight: 600 }}>{booking.client_name}</td>
                      <td>{booking.session_type}</td>
                      <td>{new Date(booking.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span className={`badge badge-${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              No upcoming shoots scheduled. Click 'New Booking' to get started!
            </div>
          )}
        </div>

        {/* Studio Actions / Integrations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Studio Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/dashboard/clients" className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Manage Client Profiles</span>
                <Users size={16} />
              </Link>
              <Link to="/dashboard/invoices" className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Review Invoicing & Bills</span>
                <DollarSign size={16} />
              </Link>
              <Link to="/dashboard/bookings" className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Open Calendar View</span>
                <Calendar size={16} />
              </Link>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem', background: 'var(--gradient-glow)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--accent-purple)' }}>AI Retouch & Culling</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Upload your raw shoots. Let Aperture's AI automatically rate sharpness, cull blinks, auto-group faces, and apply your custom color preset.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Auto-Culling: Enabled</span>
              <span className="badge badge-completed">Online</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
