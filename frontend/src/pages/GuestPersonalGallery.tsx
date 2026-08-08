import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Camera, 
  Heart, 
  Download, 
  X, 
  Loader2,
  HeartHandshake
} from 'lucide-react';

interface Photo {
  id: string;
  original_url: string;
  edited_url: string | null;
  is_selected: boolean;
  ai_tags: string[] | null;
}

interface GuestGalleryData {
  guest: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  wedding: {
    booking_id: string;
    client_name: string;
    studio_name: string;
    scheduled_at: string;
  };
  photos: Photo[];
}

const GuestPersonalGallery: React.FC = () => {
  const { guestId } = useParams<{ guestId: string }>();

  const [data, setData] = useState<GuestGalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  const fetchGuestGallery = async () => {
    try {
      const response = await fetch(`/api/public/guest/${guestId}/gallery`);
      if (!response.ok) {
        throw new Error('Could not retrieve your personalized wedding photos.');
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guestId) {
      fetchGuestGallery();
    }
  }, [guestId]);

  const toggleFavorite = async (photoId: string) => {
    try {
      // Toggle favorite using guest scope (uses client/public favorites endpoint)
      const response = await fetch(`/api/public/photos/${photoId}/favorite`, {
        method: 'POST'
      });
      if (response.ok) {
        const updatedPhoto = await response.json();
        
        // Update local photo list state
        if (data) {
          const updatedPhotos = data.photos.map(p => 
            p.id === photoId ? { ...p, is_selected: updatedPhoto.is_selected } : p
          );
          setData({ ...data, photos: updatedPhotos });
        }

        if (activePhoto && activePhoto.id === photoId) {
          setActivePhoto({ ...activePhoto, is_selected: updatedPhoto.is_selected });
        }
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

  if (errorMsg || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '450px', textAlign: 'center' }}>
          <Camera size={32} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Personal Gallery Inactive</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {errorMsg || 'We could not fetch your personalized photos.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', paddingBottom: '4rem' }}>
      
      {/* Floating Header */}
      <header style={{
        borderBottom: '1px solid var(--border-color)',
        padding: '1.25rem 2rem',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'hsla(230, 25%, 7%, 0.8)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'hsla(250, 60%, 60%, 0.15)', padding: '0.35rem', borderRadius: '50%' }}>
            <HeartHandshake size={20} color="var(--accent-purple)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Hi {data.guest.name}!</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Your matched photos from {data.wedding.client_name}'s Wedding
            </span>
          </div>
        </div>
        
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Powered by {data.wedding.studio_name}
        </span>
      </header>

      {/* Main Grid Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Your Custom Photo Hub</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Our biometric matching culler scanned the wedding album and found you in the <strong>{data.photos.length}</strong> snapshots below.
          </p>
        </div>

        {/* Photo Grid */}
        {data.photos.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {data.photos.map((photo) => (
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
                  alt="Personal Guest Match" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Image info overlays */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.1) 40%, rgba(15,23,42,0.4) 100%)',
                  opacity: activePhoto?.id === photo.id ? 1 : 0,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  color: '#fff'
                }}
                className="hover-overlay"
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Heart 
                        size={22} 
                        color={photo.is_selected ? 'var(--accent-purple)' : '#fff'} 
                        fill={photo.is_selected ? 'var(--accent-purple)' : 'none'} 
                      />
                    </button>
                  </div>
                  
                  {/* Photo tags */}
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {photo.ai_tags && photo.ai_tags.map(tag => (
                      <span key={tag} style={{ fontSize: '0.65rem', background: 'hsla(230, 20%, 10%, 0.8)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            We haven't found your face in the photos uploaded so far. Check back again as the photographer continues uploading the shoot!
          </div>
        )}
      </main>

      {/* Fullscreen Modal View */}
      {activePhoto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(9, 9, 11, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Personal Snapshot Preview</span>
            <button 
              onClick={() => setActivePhoto(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={26} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2rem 0' }}>
            <img 
              src={activePhoto.original_url} 
              alt="Personal Large View" 
              style={{ maxHeight: '75vh', maxWidth: '85vw', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {activePhoto.ai_tags && activePhoto.ai_tags.map(tag => (
                <span key={tag} style={{ fontSize: '0.7rem', background: 'hsla(230, 20%, 10%, 0.6)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={() => toggleFavorite(activePhoto.id)}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem' }}
              >
                <Heart size={18} fill={activePhoto.is_selected ? '#fff' : 'none'} />
                <span>{activePhoto.is_selected ? 'Remove Selection' : 'Select Photo'}</span>
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
                <span>Save to Device</span>
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default GuestPersonalGallery;
