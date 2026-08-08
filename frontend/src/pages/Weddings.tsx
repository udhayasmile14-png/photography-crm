import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Heart, 
  Calendar, 
  QrCode, 
  Printer, 
  ExternalLink,
  Loader2,
  Search
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  client_id: string;
  session_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  price: number;
  notes: string | null;
  client?: Client;
}

const Weddings: React.FC = () => {
  const { token } = useAuth();
  
  const [weddings, setWeddings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWedding, setSelectedWedding] = useState<Booking | null>(null);
  
  // Filters
  const [monthFilter, setMonthFilter] = useState<'All' | 'September'>('September');
  const [search, setSearch] = useState('');

  const fetchWeddings = async () => {
    try {
      const response = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter only bookings of type "Wedding"
        const onlyWeddings = data.filter((b: Booking) => b.session_type.toLowerCase() === 'wedding');
        setWeddings(onlyWeddings);
        
        // Auto-select first September wedding if available
        const septOnly = onlyWeddings.filter((b: Booking) => {
          const date = new Date(b.scheduled_at);
          return date.getMonth() === 8 && date.getFullYear() === 2026;
        });
        if (septOnly.length > 0) {
          setSelectedWedding(septOnly[0]);
        } else if (onlyWeddings.length > 0) {
          setSelectedWedding(onlyWeddings[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWeddings();
    }
  }, [token]);

  // Apply filters
  const filteredWeddings = weddings.filter(w => {
    const date = new Date(w.scheduled_at);
    const matchesMonth = monthFilter === 'All' || (date.getMonth() === 8 && date.getFullYear() === 2026);
    const matchesSearch = w.client?.name.toLowerCase().includes(search.toLowerCase()) || 
                          w.notes?.toLowerCase().includes(search.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  const getGuestUrl = (bookingId: string) => {
    return `${window.location.origin}/public/wedding/${bookingId}/guest-register`;
  };

  const handlePrintCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedWedding) return;
    
    // Create printable card template (looks like a gorgeous table sign)
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Card - ${selectedWedding.client?.name}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              text-align: center;
              background: #fff;
              color: #1e1b4b;
              padding: 50px;
            }
            .card-container {
              border: 3px double #e9d5ff;
              border-radius: 12px;
              padding: 40px;
              max-width: 420px;
              margin: 0 auto;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }
            .header-text {
              font-size: 1.1rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #7c3aed;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .title {
              font-size: 1.8rem;
              font-weight: 800;
              margin: 10px 0;
            }
            .subtitle {
              font-size: 0.95rem;
              color: #4b5563;
              margin-bottom: 30px;
            }
            .qr-wrapper {
              margin: 20px auto;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              display: inline-block;
              background: #fff;
            }
            .instruction {
              font-size: 0.95rem;
              margin-top: 25px;
              font-weight: 500;
              color: #374151;
            }
            .footer {
              font-size: 0.75rem;
              color: #9ca3af;
              margin-top: 40px;
              border-top: 1px dashed #e5e7eb;
              padding-top: 15px;
            }
            @media print {
              body { padding: 0; }
              .card-container { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <div class="header-text">Capture the Memories</div>
            <div class="title">${selectedWedding.client?.name}'s Wedding</div>
            <div class="subtitle">Share your snapshots with the newlyweds!</div>
            
            <div class="qr-wrapper" id="qr-svg-holder"></div>
            
            <div class="instruction">Scan the QR code with your phone camera<br>to upload wedding photos directly to our guest album!</div>
            
            <div class="footer">
              Photography services powered by APERTURE CRM
            </div>
          </div>

          <script>
            // We draw the SVG directly inside the window
            window.onload = function() {
              const svgElement = window.opener.document.getElementById('hidden-qr-code').cloneNode(true);
              svgElement.removeAttribute('style');
              svgElement.setAttribute('width', '220');
              svgElement.setAttribute('height', '220');
              document.getElementById('qr-svg-holder').appendChild(svgElement);
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Wedding QR Guest Albums</h1>
          <p className="page-subtitle">Manage guest photo hubs, generate venue print signage, and monitor upload streams.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className={`btn ${monthFilter === 'September' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMonthFilter('September')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            September 2026 ({weddings.filter(w => new Date(w.scheduled_at).getMonth() === 8).length} Weddings)
          </button>
          <button 
            className={`btn ${monthFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMonthFilter('All')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            All Weddings ({weddings.length})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by client name..."
            style={{ paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.85rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedWedding ? '1.5fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Weddings Table List */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {filteredWeddings.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Newlyweds</th>
                      <th>Wedding Date</th>
                      <th>Status</th>
                      <th>Contract Price</th>
                      <th style={{ textAlign: 'right' }}>QR Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWeddings.map((w) => {
                      const isSelected = selectedWedding?.id === w.id;
                      return (
                        <tr 
                          key={w.id}
                          style={{ cursor: 'pointer', background: isSelected ? 'hsla(250, 60%, 60%, 0.1)' : 'transparent' }}
                          onClick={() => setSelectedWedding(w)}
                        >
                          <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Heart size={15} fill="var(--accent-purple)" color="var(--accent-purple)" />
                            <span>{w.client?.name || 'Wedding Event'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                              <Calendar size={14} color="var(--text-muted)" />
                              <span>{new Date(w.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${w.status.toLowerCase()}`}>
                              {w.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>${w.price.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => setSelectedWedding(w)}
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}
                            >
                              <QrCode size={13} />
                              <span>Configure QR</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No weddings scheduled match these filters.
              </div>
            )}
          </div>

          {/* QR Signage Sidebar Panel */}
          {selectedWedding && (
            <div className="glass-panel" style={{ padding: '1.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              <Heart size={28} fill="var(--accent-purple)" color="var(--accent-purple)" style={{ marginBottom: '0.5rem' }} />
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{selectedWedding.client?.name}'s Wedding</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                Event date: {new Date(selectedWedding.scheduled_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>

              {/* QR Display Frame */}
              <div style={{ 
                background: '#fff', 
                padding: '1.25rem', 
                borderRadius: 'var(--radius-md)', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                marginBottom: '1.5rem',
                display: 'inline-block'
              }}>
                <QRCodeSVG 
                  id="hidden-qr-code"
                  value={getGuestUrl(selectedWedding.id)} 
                  size={160} 
                  includeMargin={true}
                />
              </div>

              {/* Print Action Links */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handlePrintCard}
                  style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                >
                  <Printer size={16} />
                  <span>Print Venue Table Placard</span>
                </button>

                <a 
                  href={getGuestUrl(selectedWedding.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', textDecoration: 'none', fontSize: '0.9rem' }}
                >
                  <ExternalLink size={16} />
                  <span>View Public Upload Page</span>
                </a>
              </div>

              <div style={{ 
                borderTop: '1px dashed var(--border-color)', 
                marginTop: '1.5rem', 
                paddingTop: '1.25rem', 
                fontSize: '0.75rem', 
                color: 'var(--text-muted)',
                lineHeight: '1.5',
                textAlign: 'left',
                width: '100%'
              }}>
                💡 <strong>Photographer Instruction:</strong> Place this printed QR card on reception tables or entry signs. Scanning allows guests to upload snaps straight into the wedding photo album from their phone.
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Weddings;
