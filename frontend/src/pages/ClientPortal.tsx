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
  DollarSign,
  PenTool,
  CheckCircle,
  MessageSquare
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

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  signed_at: string | null;
  signature_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  document_hash: string | null;
}

interface MessageLog {
  id: string;
  subject: string;
  body: string;
  channel: string;
  created_at: string;
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
  contracts: Contract[];
  message_logs: MessageLog[];
}

const ClientPortal: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  
  // Extract signed JWT token from URL query parameters
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Signature Form state
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [signLoading, setSignLoading] = useState(false);

  const fetchPortalData = async () => {
    try {
      const response = await fetch(`/api/public/clients/portal?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error('This client portal link is invalid, unauthorized, or has expired.');
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error loading portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPortalData();
    } else {
      setError("Unauthorized access. Portal requires a secure share token.");
      setLoading(false);
    }
  }, [clientId, token]);

  const handleSignContract = async (contractId: string) => {
    if (!signatureName.trim()) return;
    setSignLoading(true);

    try {
      const response = await fetch(
        `/api/public/contracts/${contractId}/sign?signature_name=${encodeURIComponent(signatureName)}&token=${encodeURIComponent(token)}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Signing contract failed.');
      }

      setSignatureName('');
      setSigningContractId(null);
      fetchPortalData(); // Refresh data
    } catch (err: any) {
      alert(err.message || 'Error signing contract.');
    } finally {
      setSignLoading(false);
    }
  };

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
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Access Denied</h2>
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
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Review contracts, pay outstanding invoices, and access your photo culling galleries.</p>
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
                  {/* Append secure token to the gallery proofing page URL */}
                  <Link 
                    to={`/portal/${data.client.id}/gallery/${gallery.id}?token=${encodeURIComponent(token)}`} 
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

        {/* Studio Contracts Section */}
        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PenTool size={22} color="var(--accent-purple)" />
            <span>Agreements & Contracts</span>
          </h2>
          {data.contracts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {data.contracts.map((contract) => (
                <div key={contract.id} className="glass-panel" style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>{contract.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem', whiteSpace: 'pre-line' }}>{contract.content}</p>
                      
                      {contract.status === "Signed" ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-emerald)', fontSize: '0.9rem', fontWeight: 600 }}>
                            <CheckCircle size={16} />
                            <span>Digitally Signed by {contract.signature_name} on {new Date(contract.signed_at!).toLocaleString()}</span>
                          </div>
                          
                          {/* Cryptographic Audit Trail Box */}
                          <div style={{ 
                            background: 'hsla(230, 20%, 10%, 0.5)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: 'var(--radius-sm)', 
                            padding: '1rem',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            maxWidth: '600px'
                          }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                              🛡️ E-Signature Audit Trail Snapshot
                            </div>
                            <div><strong>IP Address:</strong> {contract.ip_address || 'N/A'}</div>
                            <div style={{ wordBreak: 'break-all' }}><strong>User Agent:</strong> {contract.user_agent || 'N/A'}</div>
                            <div style={{ fontFamily: 'Courier', wordBreak: 'break-all' }}><strong>SHA-256 Document Hash:</strong> {contract.document_hash || 'N/A'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              This document represents a legally frozen record snapshotted at signing under the ESIGN Act.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {signingContractId === contract.id ? (
                            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '650px' }}>
                              
                              {/* Consent Checkbox */}
                              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                <input 
                                  type="checkbox" 
                                  style={{ marginTop: '0.2rem' }}
                                  checked={consentChecked}
                                  onChange={(e) => setConsentChecked(e.target.checked)}
                                  disabled={signLoading}
                                />
                                <span>I agree that typing my name below and checking this box constitutes my legally binding signature under the ESIGN Act, and that the text content of this contract is snapshotted and frozen at this exact moment in time.</span>
                              </label>

                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  placeholder="Type your Full Name to sign" 
                                  style={{ maxWidth: '300px' }}
                                  value={signatureName}
                                  onChange={(e) => setSignatureName(e.target.value)}
                                  disabled={signLoading}
                                />
                                <button 
                                  className="btn btn-primary" 
                                  onClick={() => handleSignContract(contract.id)}
                                  disabled={signLoading || !signatureName.trim() || !consentChecked}
                                >
                                  {signLoading ? 'Signing...' : 'Sign Agreement'}
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  onClick={() => { setSigningContractId(null); setSignatureName(''); setConsentChecked(false); }}
                                  disabled={signLoading}
                                >
                                  Cancel
                                </button>
                              </div>

                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                                💡 <em>Note: Custom rolling of signatures is intended for small business operational consent. For legally binding enterprise audits, integration of third-party APIs (like DocuSign or HelloSign) is recommended.</em>
                              </div>
                            </div>
                          ) : (
                            <button className="btn btn-primary" onClick={() => setSigningContractId(contract.id)}>
                              Sign Contract
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`badge badge-${contract.status.toLowerCase() === 'signed' ? 'completed' : 'pending'}`}>
                      {contract.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No contracts pending signature.
            </div>
          )}
        </section>

        {/* Splits: Bookings and Payments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '3.5rem' }}>
          
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

        {/* Message Log Timeline */}
        <section className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={20} color="var(--accent-purple)" />
            <span>Studio Message Timeline Logs</span>
          </h2>
          {data.message_logs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
              {data.message_logs.map((log) => (
                <div key={log.id} style={{ position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-1.45rem',
                    top: '0.25rem',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-purple)',
                    border: '2px solid var(--bg-app)'
                  }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>
                    {new Date(log.created_at).toLocaleString()} via {log.channel}
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{log.subject}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No messages logged.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ClientPortal;
