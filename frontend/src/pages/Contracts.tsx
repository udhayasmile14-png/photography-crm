import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  FileText, 
  Clock, 
  X,
  Loader2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  session_type: string;
  client_id: string;
}

interface Contract {
  id: string;
  booking_id: string;
  client_id: string;
  title: string;
  content: string;
  status: string;
  signature_name: string | null;
  signed_at: string | null;
  client?: {
    name: string;
  };
}

const Contracts: React.FC = () => {
  const { token } = useAuth();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch Contracts
      const conRes = await fetch('/api/contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conData = await conRes.json();
      setContracts(conData);

      // Fetch Clients
      const cliRes = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const cliData = await cliRes.json();
      setClients(cliData);

      // Fetch Bookings
      const bookRes = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bookData = await bookRes.json();
      setBookings(bookData);

      if (cliData.length > 0) {
        setSelectedClientId(cliData[0].id);
      }
      if (bookData.length > 0) {
        setSelectedBookingId(bookData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedBookingId || !title || !content) return;
    setSubmitLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: selectedBookingId,
          client_id: selectedClientId,
          title: title,
          content: content
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to create contract.');
      }

      setTitle('');
      setContent('');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Agreements & Contracts</h1>
          <p className="page-subtitle">Draft custom contracts, request e-signatures, and monitor sign states.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)}
          disabled={clients.length === 0 || bookings.length === 0}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <Plus size={16} />
          <span>New Contract</span>
        </button>
      </div>

      {(clients.length === 0 || bookings.length === 0) && !loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          backgroundColor: 'hsla(40, 80%, 60%, 0.1)',
          border: '1px solid hsla(40, 80%, 60%, 0.2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <AlertTriangle size={32} color="var(--accent-yellow)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Prerequisites Missing</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '450px', marginBottom: '1.25rem' }}>
            To create a contract, you must first register at least one Client and book a Session to link it to.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a href="/dashboard/clients" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Register Client</a>
            <a href="/dashboard/bookings" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Book Session</a>
          </div>
        </div>
      )}

      {/* Contracts List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          {contracts.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Contract Name</th>
                    <th>Associated Client</th>
                    <th>Status</th>
                    <th>Signature Details</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((con) => (
                    <tr key={con.id}>
                      <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} color="var(--accent-purple)" />
                        <span>{con.title}</span>
                      </td>
                      <td>{con.client?.name || 'Unknown Client'}</td>
                      <td>
                        <span className={`badge badge-${con.status.toLowerCase() === 'signed' ? 'completed' : 'pending'}`}>
                          {con.status}
                        </span>
                      </td>
                      <td>
                        {con.status === "Signed" ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>
                            <UserCheck size={14} />
                            <span>Signed by {con.signature_name}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Clock size={14} />
                            <span>Awaiting client</span>
                          </div>
                        )}
                      </td>
                      <td>{new Date(con.signed_at || con.id.substring(0,8) /* fallback date parsing mock */ ? new Date() : new Date()).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No contract agreements generated. Click 'New Contract' to write one.
            </div>
          )}
        </div>
      )}

      {/* Create Contract Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '650px' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowModal(false)}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Draft New Agreement</h2>

            {errorMsg && (
              <div style={{
                backgroundColor: 'hsla(350, 80%, 60%, 0.15)',
                border: '1px solid hsla(350, 80%, 60%, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                color: 'var(--accent-red)',
                fontSize: '0.85rem'
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateContract}>
              <div className="form-group">
                <label className="form-label">Agreement Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Wedding Services NDA & Terms"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Select Client *</label>
                  <select
                    className="form-input"
                    style={{ background: 'var(--bg-input)' }}
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Link to Session *</label>
                  <select
                    className="form-input"
                    style={{ background: 'var(--bg-input)' }}
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    required
                  >
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.session_type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Agreement Terms & Content *</label>
                <textarea
                  className="form-input"
                  placeholder="Paste your legal terms here. The client will review this and sign in their portal..."
                  style={{ minHeight: '160px', resize: 'vertical', lineHeight: '1.5' }}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Drafting...' : 'Publish Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
