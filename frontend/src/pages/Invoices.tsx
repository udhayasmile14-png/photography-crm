import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Check, 
  X,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface Booking {
  id: string;
  session_type: string;
  client_id: string;
  client?: {
    name: string;
  };
}

interface Invoice {
  id: string;
  booking_id: string;
  client_id: string;
  amount: number;
  tax: number;
  status: string;
  due_at: string;
  client?: {
    name: string;
  };
  booking?: {
    session_type: string;
  };
}

const Invoices: React.FC = () => {
  const { token } = useAuth();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [dueAt, setDueAt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch Invoices
      const invRes = await fetch('/api/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const invData = await invRes.json();
      setInvoices(invData);

      // Fetch Bookings to link to new invoice
      const bookRes = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bookData = await bookRes.json();
      setBookings(bookData);

      if (bookData.length > 0) {
        setSelectedBookingId(bookData[0].id);
        setAmount(bookData[0].price || 350);
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

  // Update default rate when booking changes
  const handleBookingChange = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    const selected = bookings.find(b => b.id === bookingId);
    // Find matching booking rate
    if (selected) {
      // Note: for this demo we will just fetch price if we store it. Since we set rate in bookings page:
      // Let's assume standard pricing fallback
      setAmount(350); 
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId || !dueAt || amount <= 0) return;
    setSubmitLoading(true);
    setErrorMsg(null);

    const linkedBooking = bookings.find(b => b.id === selectedBookingId);
    if (!linkedBooking) return;

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: selectedBookingId,
          client_id: linkedBooking.client_id,
          amount: Number(amount),
          tax: Number(tax),
          status: 'Pending',
          due_at: new Date(dueAt).toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice.');
      }

      setAmount(0);
      setTax(0);
      setDueAt('');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const markInvoicePaid = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status?status=Paid`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoicing & Payments</h1>
          <p className="page-subtitle">Track outstanding client balances, process payments, and issue bills.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)}
          disabled={bookings.length === 0}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <Plus size={16} />
          <span>Issue Invoice</span>
        </button>
      </div>

      {bookings.length === 0 && !loading && (
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
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No sessions booked yet</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '1.25rem' }}>
            Before generating a client invoice, you must first book a session on the scheduling page.
          </p>
          <a href="/dashboard/bookings" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Schedule a Session</a>
        </div>
      )}

      {/* Invoices List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          {invoices.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Client</th>
                    <th>Linked Session</th>
                    <th>Amount Due</th>
                    <th>Tax</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        #{inv.id.substring(0, 8)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{inv.client?.name || 'Unknown Client'}</td>
                      <td>
                        <span className="badge badge-confirmed" style={{ fontSize: '0.7rem' }}>
                          {inv.booking?.session_type || 'Shoot Session'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${inv.amount.toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        ${inv.tax || 0}
                      </td>
                      <td>{new Date(inv.due_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${inv.status.toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {inv.status.toLowerCase() !== 'paid' ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}
                            onClick={() => markInvoicePaid(inv.id)}
                          >
                            <Check size={14} />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, justifyContent: 'flex-end', paddingRight: '0.5rem' }}>
                            <Check size={16} />
                            <span>Paid</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No invoice records found. Click 'Issue Invoice' to generate a payment.
            </div>
          )}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowModal(false)}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Issue Client Invoice</h2>

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

            <form onSubmit={handleCreateInvoice}>
              <div className="form-group">
                <label className="form-label">Link to Scheduled Shoot Session *</label>
                <select
                  className="form-input"
                  style={{ background: 'var(--bg-input)' }}
                  value={selectedBookingId}
                  onChange={(e) => handleBookingChange(e.target.value)}
                  required
                >
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.client?.name} — {b.session_type}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Base Invoice Amount ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sales Tax ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Payment Due Date *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Generating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
