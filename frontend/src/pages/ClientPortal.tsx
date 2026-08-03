import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Camera, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  Mail, 
  ExternalLink,
  Loader2,
  DollarSign
} from 'lucide-react';

interface Booking {
  id: string;
  session_type: string;
  scheduled_at: string;
  status: string;
  price: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  due_at: string;
}

interface Gallery {
  id: string;
  title: string;
  status: string;
  expires_at: string | null;
}

interface PortalData {
  client: {
    id: string;
    name: string;
    email: string;
  };
  studio_name: string;
  bookings: Booking[];
  invoices: Invoice[];
  galleries: Gallery[];
}

const ClientPortal: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const response = await fetch(`/api/public/clients/${clientId}/portal`);
        if (!response.ok) {
          throw new Error('This client portal links could not be loaded or has expired.');
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Error loading portal.');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchPortalData();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Loader2 className="animate-spin" size={36} color="var(--accent-purple)" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '480px', textAlign: 'center' }}>
          <Camera size={32} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Portal Error</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            {error || 'No active portal configuration found for this link.'}
          </p>
          <a href="/" className="btn btn-secondary">Return to home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--gradient-dark)' }}>
      {/* Portal Navbar Header */}
      <header style={{
        borderBottom: '1px solid var(--border-color)',
        padding: '1.25rem 2rem',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'hsla(230, 25%, 7%, 0.8)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={22} color="var(--accent-purple)" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.05em' }}>{data.studio_name.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Mail size={14} />
            <span>Logged in as <strong>{data.client.name}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Welcome to Your Client Portal</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Review contract files, pay outstanding invoices, and select your favorite proofing images.</p>
        </div>

        {/* Dynamic Proofing Galleries Grid */}
        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={22} color="var(--accent-purple)" />
            <span>Your Delivery Galleries</span>
          </h2>
          {data.galleries.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {data.galleries.map((gallery) => (
                <div key={gallery.id} className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{gallery.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                      <span className="badge badge-completed" style={{ fontSize: '0.7rem' }}>{gallery.status}</span>
                      {gallery.expires_at && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Expires: {new Date(gallery.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link 
                    to={`/portal/${data.client.id}/gallery/${gallery.id}`} 
                    className="btn btn-primary" 
                    style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                  >
                    <span>View & Select Photos</span>
                    <ExternalLink size={16} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No image galleries have been published for you yet. They will appear here once photoshoots are processed!
            </div>
          )}
        </section>

        {/* Splits: Bookings and Payments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Photoshoot Bookings */}
          <section className="glass-panel" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="var(--accent-blue)" />
              <span>Booked Sessions</span>
            </h2>
            {data.bookings.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.session_type}</td>
                        <td>{new Date(b.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <span className={`badge badge-${b.status.toLowerCase()}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active bookings recorded.
              </div>
            )}
          </section>

          {/* Billing & Receipts */}
          <section className="glass-panel" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--accent-emerald)" />
              <span>Billing & Payments</span>
            </h2>
            {data.invoices.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.invoices.map((inv) => (
                  <div key={inv.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'hsla(230, 20%, 10%, 0.4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center' }}>
                        <DollarSign size={16} color="var(--accent-emerald)" />
                        <span>{inv.amount.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Due by {new Date(inv.due_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`badge badge-${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No invoices issued.
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default ClientPortal;
