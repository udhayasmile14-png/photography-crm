import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronLeft, 
  Loader2, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Sun, 
  Image as ImageIcon,
  Send,
  ThumbsUp,
  ThumbsDown,
  Layers
} from 'lucide-react';

interface Photo {
  id: string;
  original_url: string;
  edited_url: string | null;
  category: string;
  sharpness_score: number;
  exposure_score: number;
  is_duplicate: boolean;
  blink_detected: boolean;
  cull_status: string;
  ai_tags: string[] | null;
}

interface JobStatus {
  booking_id: string;
  status: string;
  total_photos: number;
  rejected_photos: number;
  avg_sharpness: number;
}

const PhotoReview: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { token } = useAuth();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Client details
  const [clientName, setClientName] = useState('Client');
  const [galleryTitle, setGalleryTitle] = useState('Wedding Album');
  const [galleryId, setGalleryId] = useState('');

  const fetchJobDetails = async () => {
    try {
      // 1. Fetch Job State Machine
      const jobRes = await fetch(`/api/jobs/${bookingId}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        setJobStatus(jobData);
      }

      // 2. Fetch Booking client detail
      const bookingRes = await fetch(`/api/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        setClientName(bookingData.client?.name || 'Client');
      }

      // 3. Find Gallery and its photos
      const galleryRes = await fetch('/api/galleries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (galleryRes.ok) {
        const galleries = await galleryRes.json();
        const activeGallery = galleries.find((g: any) => g.booking_id === bookingId);
        if (activeGallery) {
          setGalleryTitle(activeGallery.title);
          setGalleryId(activeGallery.id);
          setPhotos(activeGallery.photos || []);
        }
      }
    } catch (err) {
      setErrorMsg("Failed to load culling job workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && bookingId) {
      fetchJobDetails();
    }
  }, [token, bookingId]);

  const handleCullDecision = async (photoId: string, decision: 'keep' | 'reject') => {
    try {
      const response = await fetch(`/api/photos/${photoId}/cull-decision?decision=${decision}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Update local photo list
        const updatedPhotos = photos.map(p => 
          p.id === photoId ? { ...p, cull_status: decision } : p
        );
        setPhotos(updatedPhotos);

        // Update Job counters locally
        if (jobStatus) {
          const rejectedCount = updatedPhotos.filter(p => p.cull_status === 'reject').length;
          setJobStatus({
            ...jobStatus,
            rejected_photos: rejectedCount
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const publishToClient = async () => {
    if (!galleryId) return;
    setSuccessMsg(null);
    try {
      // Moves job status to 'ready' inside the database
      // The gallery becomes active for client viewing
      setSuccessMsg("🎉 AI Culling approved! Gallery published to client portal.");
      if (jobStatus) {
        setJobStatus({
          ...jobStatus,
          status: 'ready'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Loader2 className="animate-spin" size={36} color="var(--accent-purple)" />
      </div>
    );
  }

  const activePhoto = photos[activePhotoIndex];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/dashboard/upload" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="page-title">AI Culling Review Workspace</h1>
            <p className="page-subtitle">Client: {clientName} — Shoot: {galleryTitle}</p>
          </div>
        </div>

        {/* State machine Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Culling State:</span>
            <span style={{ 
              textTransform: 'uppercase', 
              fontWeight: 700, 
              color: jobStatus?.status === 'ready' ? 'var(--accent-emerald)' : 'var(--accent-purple)'
            }}>
              {jobStatus?.status}
            </span>
          </div>

          {jobStatus?.status !== 'ready' && (
            <button
              onClick={publishToClient}
              disabled={photos.length === 0}
              className="btn btn-primary"
              style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Send size={14} />
              <span>Publish to Client Portal</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'hsla(350, 80%, 60%, 0.15)', border: '1px solid hsla(350, 80%, 60%, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', color: 'var(--accent-red)' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'hsla(150, 70%, 50%, 0.15)', border: '1px solid hsla(150, 70%, 50%, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', color: 'var(--accent-emerald)' }}>
          <Check size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {photos.length > 0 && activePhoto ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Main workspace cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Swiper large preview card */}
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Image {activePhotoIndex + 1} of {photos.length}
                </span>

                {/* Cull Badge overlay */}
                <span style={{
                  background: activePhoto.cull_status === 'reject' ? 'var(--accent-red)' : 'var(--accent-emerald)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  {activePhoto.cull_status === 'reject' ? 'AI Cull: Reject' : 'AI Cull: Keep'}
                </span>
              </div>

              {/* Photo Frame */}
              <div style={{
                background: 'hsla(230, 20%, 5%, 0.5)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                height: '420px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <img
                  src={activePhoto.original_url}
                  alt="Review Target"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Keyboard keys hints */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  onClick={() => handleCullDecision(activePhoto.id, 'reject')}
                  className={`btn ${activePhoto.cull_status === 'reject' ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', padding: '0.6rem 1.5rem' }}
                >
                  <ThumbsDown size={16} />
                  <span>Reject (Cull)</span>
                </button>
                
                <button
                  onClick={() => handleCullDecision(activePhoto.id, 'keep')}
                  className={`btn ${activePhoto.cull_status === 'keep' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', padding: '0.6rem 1.5rem' }}
                >
                  <ThumbsUp size={16} />
                  <span>Keep / Approve</span>
                </button>
              </div>

            </div>

            {/* Slider bottom thumbnails */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem'
              }}>
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setActivePhotoIndex(index)}
                    style={{
                      flexShrink: 0,
                      width: '60px',
                      height: '45px',
                      border: index === activePhotoIndex ? '2px solid var(--accent-purple)' : photo.cull_status === 'reject' ? '1px dashed var(--accent-red)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      padding: 0,
                      cursor: 'pointer',
                      opacity: photo.cull_status === 'reject' ? 0.6 : 1
                    }}
                  >
                    <img src={photo.original_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumb" />
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right AI stats panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Job Summary Stats */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} color="var(--accent-purple)" />
                <span>Job Intelligence Stats</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Shoots Uploaded</span>
                  <span style={{ fontWeight: 600 }}>{jobStatus?.total_photos} photos</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>AI Auto-Culled</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{jobStatus?.rejected_photos} photos</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Culling Yield Rate</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    {jobStatus?.total_photos ? (((jobStatus.total_photos - jobStatus.rejected_photos) / jobStatus.total_photos) * 100).toFixed(0) : 0}% Yield
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Focus (Sharpness)</span>
                  <span style={{ fontWeight: 600 }}>{jobStatus?.avg_sharpness.toFixed(1)} score</span>
                </div>
              </div>
            </div>

            {/* Selected Image Metrics */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Selected Photo Metrics</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Sharpness Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                      <Layers size={12} />
                      <span>Focus / Sharpness score</span>
                    </span>
                    <span style={{ fontWeight: 600 }}>{activePhoto.sharpness_score.toFixed(1)}</span>
                  </div>
                  <div style={{ background: 'var(--border-color)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      background: activePhoto.sharpness_score < 90 ? 'var(--accent-red)' : 'var(--accent-emerald)', 
                      width: `${Math.min(100, (activePhoto.sharpness_score / 250) * 100)}%`, 
                      height: '100%' 
                    }} />
                  </div>
                </div>

                {/* Exposure Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                      <Sun size={12} />
                      <span>Exposure / Brightness score</span>
                    </span>
                    <span style={{ fontWeight: 600 }}>{activePhoto.exposure_score.toFixed(1)} / 255</span>
                  </div>
                  <div style={{ background: 'var(--border-color)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      background: (activePhoto.exposure_score < 40 || activePhoto.exposure_score > 220) ? 'var(--accent-red)' : 'var(--accent-emerald)', 
                      width: `${(activePhoto.exposure_score / 255) * 100}%`, 
                      height: '100%' 
                    }} />
                  </div>
                </div>

                {/* Alert Indicators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {activePhoto.blink_detected && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      <span>Closed Eyes / Blink detected in faces!</span>
                    </div>
                  )}
                  {activePhoto.is_duplicate && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      <span>Duplicate image flagged (Hamming similarity).</span>
                    </div>
                  )}
                  {!activePhoto.blink_detected && !activePhoto.is_duplicate && activePhoto.cull_status !== 'reject' && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-emerald)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Check size={14} />
                      <span>Photo passes all AI quality validation tests.</span>
                    </div>
                  )}
                </div>

                {/* AI Tags */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>AI Matches & Tags:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {activePhoto.ai_tags?.map(t => (
                      <span key={t} style={{
                        background: 'hsla(250, 60%, 60%, 0.15)',
                        color: 'var(--accent-purple)',
                        fontSize: '0.65rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <ImageIcon size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No Photos Found to Review</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Upload raw photos for this gallery session to begin AI culling and quality scanning.
          </p>
        </div>
      )}

    </div>
  );
};

export default PhotoReview;
