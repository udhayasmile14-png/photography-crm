import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  preferences: {
    style?: string;
    notes?: string;
  } | null;
  created_at: string;
}

const Clients: React.FC = () => {
  const { token } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSource, setNewSource] = useState('Website');
  const [newStyle, setNewStyle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchClients = async (query = '') => {
    try {
      const url = query ? `/api/clients?search=${encodeURIComponent(query)}` : '/api/clients';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchClients(search);
    }
  }, [token, search]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;
    setSubmitLoading(true);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone || null,
          source: newSource,
          preferences: {
            style: newStyle || undefined,
            notes: newNotes || undefined
          }
        })
      });

      if (response.ok) {
        // Reset and refresh
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewSource('Website');
        setNewStyle('');
        setNewNotes('');
        setShowModal(false);
        fetchClients(search);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const copyPortalLink = (clientId: string) => {
    const link = `${window.location.origin}/portal/${clientId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Records</h1>
          <p className="page-subtitle">Manage client profiles, shoot preferences, and client portal links.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Plus size={16} />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '2rem', maxWidth: '400px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by name or email..."
          style={{ paddingLeft: '2.5rem' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {/* Main Grid: list & details */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '1.5fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* List panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {clients.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr 
                        key={client.id} 
                        style={{ cursor: 'pointer', background: selectedClient?.id === client.id ? 'hsla(250, 60%, 60%, 0.1)' : 'transparent' }}
                        onClick={() => setSelectedClient(client)}
                      >
                        <td style={{ fontWeight: 600 }}>{client.name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={14} color="var(--text-muted)" />
                            <span>{client.email}</span>
                          </div>
                        </td>
                        <td>
                          {client.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Phone size={14} color="var(--text-muted)" />
                              <span>{client.phone}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          {client.source ? (
                            <span className="badge badge-confirmed" style={{ fontSize: '0.7rem' }}>
                              {client.source}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => copyPortalLink(client.id)}
                          >
                            {copiedId === client.id ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                            <span style={{ marginLeft: '0.25rem' }}>{copiedId === client.id ? 'Copied' : 'Portal Link'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No clients found. Click 'Add Client' to create your first client card.
              </div>
            )}
          </div>

          {/* Details Sidebar Panel */}
          {selectedClient && (
            <div className="glass-panel" style={{ padding: '1.75rem', position: 'relative' }}>
              <button 
                style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setSelectedClient(null)}
              >
                <X size={20} />
              </button>

              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{selectedClient.name}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Registered {new Date(selectedClient.created_at).toLocaleDateString()}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Contact Info</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={16} color="var(--text-secondary)" />
                      <a href={`mailto:${selectedClient.email}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{selectedClient.email}</a>
                    </div>
                    {selectedClient.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={16} color="var(--text-secondary)" />
                        <span>{selectedClient.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Lead Source</div>
                  <span className="badge badge-confirmed">{selectedClient.source || 'Direct Referral'}</span>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Aesthetic Preferences</div>
                  <div style={{ padding: '0.75rem', background: 'hsla(230, 20%, 10%, 0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-purple)', marginBottom: '0.25rem' }}>Style Profile:</div>
                    <div style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{selectedClient.preferences?.style || 'No custom style selected.'}</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-purple)', marginBottom: '0.25rem' }}>Additional Notes:</div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{selectedClient.preferences?.notes || 'No extra notes.'}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <a 
                    href={`/portal/${selectedClient.id}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary" 
                    style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                  >
                    <span>View Client Portal</span>
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Add Client Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowModal(false)}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create Client Record</h2>

            <form onSubmit={handleCreateClient}>
              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alice Johnson"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="alice@gmail.com"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. +1 (555) 012-3456"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Marketing Source</label>
                <select 
                  className="form-input" 
                  style={{ background: 'var(--bg-input)' }}
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  disabled={submitLoading}
                >
                  <option value="Website">Studio Website</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Referral">Word of Mouth / Referral</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Photography Style Preference</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Golden hour outdoors, moody overlays"
                  value={newStyle}
                  onChange={(e) => setNewStyle(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Studio Notes</label>
                <textarea
                  className="form-input"
                  placeholder="Any details to keep track of..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  disabled={submitLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
