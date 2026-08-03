import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  X,
  Loader2,
  CalendarRange
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
  client?: {
    name: string;
  };
}

const Bookings: React.FC = () => {
  const { token } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sessionType, setSessionType] = useState('Portrait');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState(350);
  const [statusVal, setStatusVal] = useState('Lead');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch Bookings
      const bookRes = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bookData = await bookRes.json();
      setBookings(bookData);

      // Fetch Clients for dropdown selection
      const clientRes = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clientData = await clientRes.json();
      setClients(clientData);
      
      if (clientData.length > 0) {
        setSelectedClientId(clientData[0].id);
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

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !scheduledAt) return;
    setSubmitLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: selectedClientId,
          session_type: sessionType,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: Number(durationMinutes),
          price: Number(price),
          status: statusVal,
          notes: notes || null
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Could not schedule booking.');
      }

      // Reset
      setSessionType('Portrait');
      setScheduledAt('');
      setDurationMinutes(60);
      setPrice(350);
      setStatusVal('Lead');
      setNotes('');
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
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Session Scheduling</h1>
          <p className="page-subtitle">Coordinate bookings, buffer buffers, and avoid scheduling conflicts.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)}
          disabled={clients.length === 0}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <Plus size={16} />
          <span>New Session</span>
        </button>
      </div>

      {clients.length === 0 && !loading && (
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
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No clients registered yet</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '1.25rem' }}>
            You need to create a client record first before you can schedule a photoshoot session.
          </p>
          <a href="/dashboard/clients" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Register a Client</a>
        </div>
      )}

      {/* Bookings View */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          {bookings.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Session Type</th>
                    <th>Client Name</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Details / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const hasConflict = booking.notes && booking.notes.includes('Conflict Warning');
                    return (
                      <tr 
                        key={booking.id}
                        style={{
                          borderLeft: hasConflict ? '3px solid var(--accent-yellow)' : 'none'
                        }}
                      >
                        <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CalendarRange size={16} color="var(--accent-purple)" />
                          <span>{booking.session_type}</span>
                        </td>
                        <td>{booking.client?.name || 'Unknown Client'}</td>
                        <td>{new Date(booking.scheduled_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                            <Clock size={12} color="var(--text-muted)" />
                            <span>{booking.duration_minutes} min</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                            <DollarSign size={14} color="var(--accent-emerald)" />
                            <span>{booking.price.toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${booking.status.toLowerCase()}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {hasConflict ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-yellow)', fontSize: '0.85rem', fontWeight: 500 }}>
                              <AlertTriangle size={14} />
                              <span>{booking.notes}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{booking.notes || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No sessions scheduled. Click 'New Session' to book a shoot.
            </div>
          )}
        </div>
      )}

      {/* Create Booking Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowModal(false)}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Schedule Photoshoot Session</h2>

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

            <form onSubmit={handleCreateBooking}>
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
                <label className="form-label">Session Type</label>
                <select
                  className="form-input"
                  style={{ background: 'var(--bg-input)' }}
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                >
                  <option value="Portrait">Portrait Shoot</option>
                  <option value="Wedding">Wedding Session</option>
                  <option value="Engagement">Engagement / Couple</option>
                  <option value="Corporate">Corporate Headshots</option>
                  <option value="Family">Family Shoot</option>
                  <option value="Event">Event Photography</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date & Start Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (Mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="15"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Rate / Session Price ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select
                    className="form-input"
                    style={{ background: 'var(--bg-input)' }}
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    disabled={submitLoading}
                  >
                    <option value="Lead">Lead Inquiry</option>
                    <option value="Confirmed">Confirmed Shoot</option>
                    <option value="Completed">Completed Shoot</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Shoot Outline & Notes</label>
                <textarea
                  className="form-input"
                  placeholder="e.g. 2 location changes, bring macro lens, outdoor backdrop..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Scheduling...' : 'Confirm Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
