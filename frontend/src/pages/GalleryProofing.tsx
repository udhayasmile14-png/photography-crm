import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Camera, 
  Heart, 
  ChevronLeft, 
  Download, 
  X, 
  Loader2,
  CheckCircle,
  Lock,
  Grid,
  Sparkles,
  Users,
  Image as ImageIcon
} from 'lucide-react';

interface Photo {
  id: string;
  original_url: string;
  edited_url: string | null;
  is_selected: boolean;
  ai_tags: string[] | null;
  matched_clients: string[] | null;
  category: string;
}

interface GalleryData {
  id: string;
  title: string;
  booking_id: string;
  quota_couple: number;
  quota_traditional: number;
  quota_candid: number;
  album_submitted: boolean;
  booking?: {
    session_type: string;
    client?: {
      id: string;
      name: string;
      face_recognition_consent?: boolean;
    }
  };
  photos: Photo[];
}

const GalleryProofing: React.FC = () => {
  const { clientId, galleryId } = useParams<{ clientId: string; galleryId: string }>();
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  
  // Dynamic Folder Filters
  const [activeCategory, setActiveCategory] = useState<string>('all'); // 'all', 'couple', 'traditional', 'candid', 'guest'
  const [showOnlyMe, setShowOnlyMe] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchGallery = async () => {
    try {
      const response = await fetch(`/api/public/galleries/${galleryId}?token=${encodeURIComponent(token)}`);
      if (response.ok) {
        const data = await response.json();
        setGallery(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (galleryId && token) {
      fetchGallery();
    } else {
      setLoading(false);
    }
  }, [galleryId, token]);

  const toggleFavorite = async (photoId: string) => {
    if (gallery?.album_submitted) return; // Locked if submitted

    try {
      const response = await fetch(`/api/public/photos/${photoId}/favorite?token=${encodeURIComponent(token)}`, {
        method: 'POST'
      });
      if (response.ok) {
        const updatedPhoto = await response.json();
        if (gallery) {
          const updatedPhotos = gallery.photos.map(p => 
            p.id === photoId ? { ...p, is_selected: updatedPhoto.is_selected } : p
          );
          setGallery({ ...gallery, photos: updatedPhotos });
        }
        if (activePhoto && activePhoto.id === photoId) {
          setActivePhoto({ ...activePhoto, is_selected: updatedPhoto.is_selected });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAlbumSubmit = async () => {
    if (!gallery) return;
    setSubmitProgress(true);
    setSubmitSuccess(null);

    try {
      // 1. Submit selection to lock the gallery
      const response = await fetch(`/api/public/galleries/${gallery.id}/submit-album?token=${encodeURIComponent(token)}`, {
        method: 'POST'
      });

      if (response.ok) {
        setSubmitSuccess("🎉 Album submitted successfully! Your selections are locked and the photographer has been notified.");
        
        // 2. Trigger auto-billing in background if quota exceeded
        const totalSelected = gallery.photos.filter(p => p.is_selected).length;
        const totalQuota = gallery.quota_couple + gallery.quota_traditional + gallery.quota_candid;
        if (totalSelected > totalQuota) {
          await fetch(`/api/bookings/${gallery.booking_id}/invoice-add-ons`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).catch(() => {});
        }
        
        fetchGallery();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitProgress(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Loader2 className="animate-spin" size={36} color="var(--accent-purple)" />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '450px', textAlign: 'center' }}>
          <Camera size={32} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Gallery Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            The requested gallery link does not exist, requires authentication, or has expired.
          </p>
          <Link to={`/portal/${clientId}?token=${encodeURIComponent(token)}`} className="btn btn-secondary">Return to portal</Link>
        </div>
      </div>
    );
  }

  // Count selections
  const coupleCount = gallery.photos.filter(p => p.is_selected && p.category === 'couple').length;
  const traditionalCount = gallery.photos.filter(p => p.is_selected && p.category === 'traditional').length;
  const candidCount = gallery.photos.filter(p => p.is_selected && p.category === 'candid').length;
  const guestCount = gallery.photos.filter(p => p.is_selected && p.category === 'guest').length;
  
  const totalSelected = coupleCount + traditionalCount + candidCount + guestCount;
  const allowedQuota = gallery.quota_couple + gallery.quota_traditional + gallery.quota_candid;
  const exceedsQuota = totalSelected > allowedQuota;

  // Filter logic based on Category Tabs and Biometric Face Search
  let filteredPhotos = gallery.photos;
  if (activeCategory !== 'all') {
    filteredPhotos = filteredPhotos.filter(p => p.category === activeCategory);
  }
  if (showOnlyMe) {
    filteredPhotos = filteredPhotos.filter(p => 
      (p.matched_clients && p.matched_clients.includes(clientId || '')) ||
      (p.ai_tags && p.ai_tags.includes(`Found: ${gallery.booking?.client?.name}`))
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', paddingBottom: '4rem' }}>
      
      {/* Floating Header */}
      <header style={{
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 2rem',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'hsla(230, 25%, 7%, 0.85)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to={`/portal/${clientId}?token=${encodeURIComponent(token)}`} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{gallery.title}</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Client Proofing Portal — {gallery.booking?.session_type}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {gallery.album_submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Lock size={14} />
              <span>Selections Locked & Submitted</span>
            </div>
          ) : (
            <button
              onClick={handleAlbumSubmit}
              disabled={totalSelected === 0 || submitProgress}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              {submitProgress ? 'Submitting...' : 'Lock & Submit Album'}
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Album Submission Success alert */}
        {submitSuccess && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: 'hsla(150, 70%, 50%, 0.15)',
            border: '1px solid hsla(150, 70%, 50%, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: 'var(--accent-emerald)',
            fontSize: '0.9rem'
          }}>
            <CheckCircle size={20} style={{ flexShrink: 0 }} />
            <span>{submitSuccess}</span>
          </div>
        )}

        {/* Quota Progress Workspace Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={18} color="var(--accent-purple)" />
            <span>Printed Wedding Album Builder Progress</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            
            {/* Couple Portrats */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>💍 Couple Portraits</span>
                <span style={{ fontWeight: 600 }}>{coupleCount} / {gallery.quota_couple}</span>
              </div>
              <div style={{ background: 'var(--border-color)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  background: 'var(--accent-purple)', 
                  width: `${Math.min(100, (coupleCount / gallery.quota_couple) * 100)}%`, 
                  height: '100%',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            {/* Traditional */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>📸 Traditional Posed</span>
                <span style={{ fontWeight: 600 }}>{traditionalCount} / {gallery.quota_traditional}</span>
              </div>
              <div style={{ background: 'var(--border-color)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  background: 'var(--accent-blue, #3b82f6)', 
                  width: `${Math.min(100, (traditionalCount / gallery.quota_traditional) * 100)}%`, 
                  height: '100%',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            {/* Candids */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>✨ Candid Snaps</span>
                <span style={{ fontWeight: 600 }}>{candidCount} / {gallery.quota_candid}</span>
              </div>
              <div style={{ background: 'var(--border-color)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  background: 'var(--accent-yellow)', 
                  width: `${Math.min(100, (candidCount / gallery.quota_candid) * 100)}%`, 
                  height: '100%',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            {/* Total Indicator */}
            <div style={{
              background: exceedsQuota ? 'rgba(239, 68, 68, 0.08)' : 'rgba(79, 70, 229, 0.08)',
              border: exceedsQuota ? '1px dashed var(--accent-red)' : '1px dashed var(--accent-purple)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: exceedsQuota ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {exceedsQuota ? '⚠️ Exceeding Quota' : 'Total Selections'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: exceedsQuota ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                {totalSelected} / {allowedQuota} Selected
              </div>
              {exceedsQuota && (
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-red)', marginTop: '0.2rem' }}>
                  Billing: $15.00/additional hero shot
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Directory Categorization Tabs & Biometrics */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          
          {/* Folders Tabs */}
          <div style={{ display: 'flex', background: 'hsla(230, 20%, 10%, 0.6)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveCategory('all')}
              className={`btn`}
              style={{
                background: activeCategory === 'all' ? 'var(--bg-card)' : 'none',
                border: 'none',
                color: activeCategory === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <Grid size={14} style={{ marginRight: '0.35rem', display: 'inline-block', verticalAlign: 'middle' }} />
              All Media
            </button>
            <button
              onClick={() => setActiveCategory('couple')}
              className={`btn`}
              style={{
                background: activeCategory === 'couple' ? 'var(--bg-card)' : 'none',
                border: 'none',
                color: activeCategory === 'couple' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <Sparkles size={14} style={{ marginRight: '0.35rem', display: 'inline-block', verticalAlign: 'middle' }} />
              Couples
            </button>
            <button
              onClick={() => setActiveCategory('traditional')}
              className={`btn`}
              style={{
                background: activeCategory === 'traditional' ? 'var(--bg-card)' : 'none',
                border: 'none',
                color: activeCategory === 'traditional' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <Camera size={14} style={{ marginRight: '0.35rem', display: 'inline-block', verticalAlign: 'middle' }} />
              Traditional
            </button>
            <button
              onClick={() => setActiveCategory('candid')}
              className={`btn`}
              style={{
                background: activeCategory === 'candid' ? 'var(--bg-card)' : 'none',
                border: 'none',
                color: activeCategory === 'candid' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <ImageIcon size={14} style={{ marginRight: '0.35rem', display: 'inline-block', verticalAlign: 'middle' }} />
              Candids
            </button>
            <button
              onClick={() => setActiveCategory('guest')}
              className={`btn`}
              style={{
                background: activeCategory === 'guest' ? 'var(--bg-card)' : 'none',
                border: 'none',
                color: activeCategory === 'guest' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <Users size={14} style={{ marginRight: '0.35rem', display: 'inline-block', verticalAlign: 'middle' }} />
              Guest Snaps
            </button>
          </div>

          {/* Biometric Smart Search */}
          {gallery.booking?.client?.face_recognition_consent && (
            <button
              className={`btn ${showOnlyMe ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.8rem', 
                borderRadius: 'var(--radius-sm)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.35rem',
                borderColor: 'var(--accent-purple)',
                color: showOnlyMe ? '#fff' : 'var(--accent-purple)'
              }}
              onClick={() => setShowOnlyMe(!showOnlyMe)}
            >
              <span>🔍 Smart Search: Just Me</span>
            </button>
          )}

        </div>

        {/* Gallery Image Grid */}
        {filteredPhotos.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredPhotos.map((photo) => (
              <div 
                key={photo.id} 
                className="glass-panel" 
                style={{ 
                  overflow: 'hidden', 
                  borderRadius: 'var(--radius-md)', 
                  position: 'relative',
                  aspectRatio: '3/2',
                  cursor: 'pointer'
                }}
                onClick={() => setActivePhoto(photo)}
              >
                <img 
                  src={photo.edited_url || photo.original_url} 
                  alt="Gallery Proof" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Image Info / Selection Hover Overlays */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.1) 40%, rgba(15,23,42,0.4) 100%)',
                  opacity: photo.is_selected ? 1 : 0,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1rem'
                }}
                className="hover-overlay-selected"
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      disabled={gallery.album_submitted}
                    >
                      <Heart 
                        size={22} 
                        color={photo.is_selected ? 'var(--accent-purple)' : '#fff'} 
                        fill={photo.is_selected ? 'var(--accent-purple)' : 'none'} 
                      />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {photo.ai_tags && photo.ai_tags.slice(0, 2).map(tag => (
                        <span key={tag} style={{ fontSize: '0.65rem', background: 'hsla(230, 20%, 10%, 0.85)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      background: photo.category === 'couple' ? 'var(--accent-purple)' : photo.category === 'traditional' ? 'var(--accent-blue, #3b82f6)' : 'var(--accent-yellow)',
                      color: '#fff',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {photo.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No images match your active filters.
          </div>
        )}
      </main>

      {/* Fullscreen Photo Review Modal */}
      {activePhoto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(9, 9, 11, 0.96)',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2rem'
        }}>
          {/* Modal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fullscreen Proof Viewer</span>
            <button 
              onClick={() => setActivePhoto(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={26} />
            </button>
          </div>

          {/* Large Image View */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2rem 0' }}>
            <img 
              src={activePhoto.original_url} 
              alt="Proof Preview Large" 
              style={{ maxHeight: '70vh', maxWidth: '80vw', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
            />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem',
                background: 'var(--accent-purple)',
                color: '#fff',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                Folder: {activePhoto.category}
              </span>
              {activePhoto.ai_tags && activePhoto.ai_tags.map(tag => (
                <span key={tag} style={{ fontSize: '0.7rem', background: 'hsla(230, 20%, 10%, 0.6)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={() => toggleFavorite(activePhoto.id)}
                disabled={gallery.album_submitted}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem' }}
              >
                <Heart size={18} fill={activePhoto.is_selected ? '#fff' : 'none'} />
                <span>{activePhoto.is_selected ? 'Deselect Photo' : 'Add to Album Selection'}</span>
              </button>

              <a 
                href={activePhoto.original_url} 
                download 
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.25rem', textDecoration: 'none' }}
              >
                <Download size={18} />
                <span>Download Proof</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryProofing;
