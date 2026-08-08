import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Heart,
  ShieldCheck
} from 'lucide-react';

interface WeddingInfo {
  booking_id: string;
  session_type: string;
  scheduled_at: string;
  client_name: string;
  studio_name: string;
}

const GuestRegister: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [weddingInfo, setWeddingInfo] = useState<WeddingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; name: string } | null>(null);

  const fetchWeddingInfo = async () => {
    try {
      const response = await fetch(`/api/public/wedding/${bookingId}/info`);
      if (!response.ok) {
        throw new Error('This guest wedding portal link is invalid or has expired.');
      }
      const data = await response.json();
      setWeddingInfo(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve wedding details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchWeddingInfo();
    }
  }, [bookingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelfieFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !consent || !selfieFile || !bookingId) return;

    setSubmitting(true);
    setSuccessData(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('file', selfieFile);

    try {
      const response = await fetch(`/api/public/wedding/${bookingId}/register-guest`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to analyze selfie. Please upload a clear photo.');
      }

      const result = await response.json();
      setSuccessData({ id: result.guest_id, name: result.guest_name });
      
      // Reset Form fields
      setName('');
      setEmail('');
      setPhone('');
      setConsent(false);
      setSelfieFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Loader2 className="animate-spin" size={36} color="var(--accent-purple)" />
      </div>
    );
  }

  if (errorMsg && !weddingInfo) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '450px', textAlign: 'center' }}>
          <Camera size={32} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Portal Inactive</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-app)', 
      backgroundImage: 'var(--gradient-dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2.5rem 1.25rem'
    }}>
      
      <div className="glass-panel" style={{ 
        maxWidth: '480px', 
        width: '100%', 
        padding: '2.25rem', 
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)'
      }}>
        
        {/* Header branding */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'hsla(250, 60%, 60%, 0.15)', padding: '0.4rem 0.8rem', borderRadius: '20px', marginBottom: '1rem' }}>
          <Heart size={14} fill="var(--accent-purple)" color="var(--accent-purple)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {weddingInfo?.studio_name}
          </span>
        </div>

        {successData ? (
          <div style={{ padding: '1rem 0' }}>
            <CheckCircle size={48} color="var(--accent-emerald)" style={{ marginBottom: '1.25rem', display: 'inline-block' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>All Set, {successData.name}!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
              Your face profile has been registered. When the photographer uploads event photos, we will search for your face and instantly send your matched photos directly to your registered WhatsApp number and Gmail!
            </p>
            
            <div style={{ 
              background: 'hsla(230, 20%, 10%, 0.4)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '1.25rem', 
              textAlign: 'left',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)' 
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={16} color="var(--accent-purple)" />
                <span>Smart Match Status</span>
              </div>
              <div><strong>Profile ID:</strong> {successData.id.slice(0, 8)}...</div>
              <div><strong>Matching Scope:</strong> {weddingInfo?.client_name}'s Wedding</div>
              <div><strong>Delivery Channel:</strong> WhatsApp Auto-Push</div>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={() => setSuccessData(null)}
              style={{ marginTop: '1.5rem', width: '100%' }}
            >
              Register Another Guest
            </button>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Find Your Photos
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Register your face to search the wedding album. We will send all photos containing you straight to your WhatsApp and Email!
            </p>

            {errorMsg && (
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                backgroundColor: 'hsla(350, 80%, 60%, 0.15)',
                border: '1px solid hsla(350, 80%, 60%, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                color: 'var(--accent-red)',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ textAlign: 'left' }}>
              
              <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aunt Sarah or Cousin Jake"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                <label className="form-label">Email Address (Gmail) *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. sarah@gmail.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">WhatsApp Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +1 555-0199 or +91 9876543210"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Consent checkbox */}
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  style={{ marginTop: '0.15rem' }}
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  disabled={submitting}
                />
                <span>I consent to the matching of my facial traits. Selfie data is processed securely and is strictly restricted to this wedding event.</span>
              </label>

              {/* Selfie Camera uploader */}
              {consent && (
                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label className="form-label">Snap a Selfie Profile *</label>
                  <div style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    background: 'hsla(230, 20%, 10%, 0.3)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      capture="user" // Hint to open phone front camera directly
                      onChange={handleFileChange}
                      style={{
                        position: 'absolute',
                        left: 0, top: 0, width: '100%', height: '100%',
                        opacity: 0, cursor: 'pointer'
                      }}
                      required
                      disabled={submitting}
                    />
                    <Camera size={28} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                    {selfieFile ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {selfieFile.name} ({(selfieFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>Take a Selfie</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>JPEG or PNG (Max 5MB)</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.8rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}
                disabled={submitting || !selfieFile || !consent || !phone.trim() || !name.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Extracting Face Embeddings...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Register Face & Enable Alerts</span>
                  </>
                )}
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default GuestRegister;
