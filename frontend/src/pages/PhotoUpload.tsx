import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileImage
} from 'lucide-react';

interface Gallery {
  id: string;
  title: string;
}

interface Photo {
  id: string;
  original_url: string;
  edited_url: string | null;
  is_selected: boolean;
  ai_tags: string[] | null;
  created_at: string;
}

const PhotoUpload: React.FC = () => {
  const { token } = useAuth();
  
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGalleries = async () => {
    try {
      const response = await fetch('/api/galleries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGalleries(data);
        if (data.length > 0) {
          setSelectedGalleryId(data[0].id);
          setPhotos(data[0].photos || []);
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
      fetchGalleries();
    }
  }, [token]);

  // Fetch photos whenever gallery changes
  const handleGalleryChange = (galleryId: string) => {
    setSelectedGalleryId(galleryId);
    const selected = galleries.find(g => g.id === galleryId);
    // Cast and populate photos
    if (selected) {
      // Find matching photos
      const match = (selected as any).photos || [];
      setPhotos(match);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedGalleryId) return;
    
    setUploadProgress(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('gallery_id', selectedGalleryId);

    try {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Upload failed. File type or size may be invalid.');
      }

      setSuccessMsg(`Uploaded successfully! The AI background culler is analyzing tags.`);
      setSelectedFile(null);
      
      // Reset input element
      const fileInput = document.getElementById('photo-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload gallery list to pull updated photos
      fetchGalleries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading file.');
    } finally {
      setUploadProgress(false);
    }
  };

  // Poll for background AI updates (optional helper to refresh list)
  useEffect(() => {
    let intervalId: any;
    if (token && photos.some(p => p.ai_tags && p.ai_tags.includes("Processing..."))) {
      intervalId = setInterval(() => {
        fetchGalleries();
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [photos, token]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gallery Media Ingestion</h1>
          <p className="page-subtitle">Upload image files, validate content, and trigger AI auto-tagging workflows.</p>
        </div>
      </div>

      {galleries.length === 0 && !loading && (
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
          <AlertCircle size={32} color="var(--accent-yellow)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No galleries active</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '450px', marginBottom: '1.25rem' }}>
            Before uploading image assets, you must first publish a Delivery Gallery page for one of your bookings.
          </p>
        </div>
      )}

      {galleries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Upload Card Panel */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} color="var(--accent-purple)" />
              <span>Secure File Uploader</span>
            </h2>

            {/* Error alerts */}
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
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success alerts */}
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
                fontSize: '0.85rem'
              }}>
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label className="form-label">Select Delivery Gallery *</label>
                <select
                  className="form-input"
                  style={{ background: 'var(--bg-input)' }}
                  value={selectedGalleryId}
                  onChange={(e) => handleGalleryChange(e.target.value)}
                  required
                >
                  {galleries.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Choose Image File *</label>
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
                    id="photo-file-input"
                    accept=".jpg,.jpeg,.png"
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
                    disabled={uploadProgress}
                  />
                  <FileImage size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                  {selectedFile ? (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>Click to browse files</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>JPEG or PNG (Max size: 5MB)</div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
                disabled={uploadProgress || !selectedFile}
              >
                {uploadProgress ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span style={{ marginLeft: '0.5rem' }}>Uploading Image...</span>
                  </>
                ) : 'Upload and Process'}
              </button>
            </form>
          </div>

          {/* Active Photos List Panel */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Photos in Gallery ({photos.length})</h3>
            
            {photos.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '1rem',
                maxHeight: '450px',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}>
                {photos.map((photo) => (
                  <div key={photo.id} style={{
                    background: 'hsla(230, 20%, 10%, 0.5)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <img
                      src={photo.edited_url || photo.original_url}
                      alt="Gallery Asset"
                      style={{ width: '100%', height: '90px', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>AI Tags:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                        {photo.ai_tags?.map(t => (
                          <span key={t} style={{
                            background: t.includes('Processing') ? 'hsla(40, 80%, 60%, 0.15)' : 'hsla(250, 60%, 60%, 0.15)',
                            color: t.includes('Processing') ? 'var(--accent-yellow)' : 'var(--accent-purple)',
                            fontSize: '0.55rem',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Select a gallery to view its files, or upload an image to populate it.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
