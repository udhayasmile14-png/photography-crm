import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Heart,
  Image as ImageIcon
} from 'lucide-react';

interface WeddingInfo {
  booking_id: string;
  session_type: string;
  scheduled_at: string;
  client_name: string;
  studio_name: string;
}

const GuestPortal: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [weddingInfo, setWeddingInfo] = useState<WeddingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchWeddingInfo = async () => {
    try {
      const response = await fetch(`/api/public/wedding/${bookingId}/info`);
      if (!response.ok) {
        throw new Error('This guest wedding album link is invalid or has expired.');
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
      setSelectedFile(e.target.files[0]);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  };

  const handleGuestUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !selectedFile || !bookingId) return;

    setUploadLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('guest_name', guestName);
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`/api/public/wedding/${bookingId}/guest-upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Upload failed. File type/size checks rejected the image.');
      }

      setSuccessMsg(`Snapshot uploaded successfully to the wedding album!`);
      setSelectedFile(null);
      
      const fileInput = document.getElementById('guest-snapshot-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading file.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Loader2 className="animate-spin" size={36} color="var(--accent-purple)" />
      </div>
    );
  }

  if (errorMsg || !weddingInfo) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '450px', textAlign: 'center' }}>
          <Camera size={32} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Album Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {errorMsg || 'This wedding guest portal link is no longer active.'}
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
        
        {/* Branding header */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'hsla(250, 60%, 60%, 0.15)', padding: '0.4rem 0.8rem', borderRadius: '20px', marginBottom: '1rem' }}>
          <Heart size={14} fill="var(--accent-purple)" color="var(--accent-purple)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {weddingInfo.studio_name}
          </span>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
          {weddingInfo.client_name}'s Wedding
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Welcome to the guest photo album! Snap a picture or choose a photo from your library to share it directly with the newlyweds.
        </p>

        {/* Error Notification */}
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

        {/* Success Notification */}
        {successMsg && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: 'hsla(150, 70%, 50%, 0.15)',
            border: '1px solid hsla(150, 70%, 50%, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            color: 'var(--accent-emerald)',
            fontSize: '0.85rem',
            textAlign: 'left'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleGuestUploadSubmit} style={{ textAlign: 'left' }}>
          
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Your Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Aunt Sarah or Cousin Jake"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={uploadLoading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">Select Photo *</label>
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1rem',
              textAlign: 'center',
              background: 'hsla(230, 20%, 10%, 0.3)',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                id="guest-snapshot-input"
                accept=".jpg,.jpeg,.png"
                capture="environment" // Hint to open phone camera directly
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
                disabled={uploadLoading}
                required
              />
              <ImageIcon size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
              {selectedFile ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-all' }}>
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>Take Photo or Browse</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>JPEG or PNG (Max size: 5MB)</div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}
            disabled={uploadLoading || !selectedFile || !guestName.trim()}
          >
            {uploadLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Uploading Snapshot...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Share with the Bride & Groom</span>
              </>
            )}
          </button>

        </form>

        <div style={{ 
          borderTop: '1px solid var(--border-color)', 
          marginTop: '2rem', 
          paddingTop: '1.25rem', 
          fontSize: '0.7rem', 
          color: 'var(--text-muted)'
        }}>
          Biometric face culling enabled. Once uploaded, newlyweds can find your photo automatically using AI search matching.
        </div>

      </div>
    </div>
  );
};

export default GuestPortal;
