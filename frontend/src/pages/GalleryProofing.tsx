import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Camera, 
  Heart, 
  ChevronLeft, 
  Download, 
  X, 
  Loader2,
  Tag
} from 'lucide-react';

interface Photo {
  id: string;
  original_url: string;
  edited_url: string | null;
  is_selected: boolean;
  ai_tags: string[] | null;
}

interface GalleryData {
  id: string;
  title: string;
  booking?: {
    session_type: string;
    client?: {
      name: string;
    }
  };
  photos: Photo[];
}

const GalleryProofing: React.FC = () => {
  const { clientId, galleryId } = useParams<{ clientId: string; galleryId: string }>();

  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchGallery = async () => {
    try {
      const response = await fetch(`/api/public/galleries/${galleryId}`);
      if (response.ok) {
        const data = await response.json();
        setGallery(data);
        
        // Extract unique AI tags
        const tagsSet = new Set<string>();
        data.photos.forEach((p: Photo) => {
          if (p.ai_tags) {
            p.ai_tags.forEach(t => tagsSet.add(t));
          }
        });
        setAllTags(Array.from(tagsSet));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (galleryId) {
      fetchGallery();
    }
  }, [galleryId]);

  const toggleFavorite = async (photoId: string) => {
    try {
      const response = await fetch(`/api/public/photos/${photoId}/favorite`, {
        method: 'POST'
      });
      if (response.ok) {
        const updatedPhoto = await response.json();
        
        // Update local gallery state
        if (gallery) {
          const updatedPhotos = gallery.photos.map(p => 
            p.id === photoId ? { ...p, is_selected: updatedPhoto.is_selected } : p
          );
          setGallery({ ...gallery, photos: updatedPhotos });
        }

        // Update active modal state
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

  if (!gallery) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '450px', textAlign: 'center' }}>
          <Camera size={32} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Gallery Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            The requested gallery links do not exist or have been archived by the photographer.
          </p>
          <Link to={`/portal/${clientId}`} className="btn btn-secondary">Return to portal</Link>
        </div>
      </div>
    );
  }

  const selectedCount = gallery.photos.filter(p => p.is_selected).length;

  const filteredPhotos = filterTag 
    ? gallery.photos.filter(p => p.ai_tags && p.ai_tags.includes(filterTag))
    : gallery.photos;

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
          <Link to={`/portal/${clientId}`} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{gallery.title}</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Proofing for {gallery.booking?.client?.name || 'Client'} — {gallery.booking?.session_type}
            </span>
          </div>
        </div>

        {/* Proofing Progress Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'hsla(250, 60%, 60%, 0.15)', border: '1px solid var(--border-color)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
            <Heart size={14} fill="var(--accent-purple)" color="var(--accent-purple)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {selectedCount} Selected
            </span>
          </div>
        </div>
      </header>

      {/* Grid Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Filters bar */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
              <Tag size={14} />
              <span>AI Tag Filters:</span>
            </span>
            <button 
              className={`btn ${!filterTag ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '20px' }}
              onClick={() => setFilterTag(null)}
            >
              All Photos
            </button>
            {allTags.map(t => (
              <button
                key={t}
                className={`btn ${filterTag === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '20px' }}
                onClick={() => setFilterTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

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
                  alt="Gallery" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform var(--transition-normal)' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                />

                {/* Tags Badge overlay */}
                {photo.ai_tags && (
                  <div style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', display: 'flex', gap: '0.25rem', pointerEvents: 'none' }}>
                    {photo.ai_tags.slice(0, 2).map((t, idx) => (
                      <span key={idx} style={{ background: 'rgba(0,0,0,0.5)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', color: 'white', fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Heart and View Actions overlay */}
                <div style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem'
                }} onClick={(e) => e.stopPropagation()}>
                  <button 
                    style={{
                      background: photo.is_selected ? 'var(--accent-purple)' : 'rgba(0,0,0,0.6)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'white',
                      transition: 'all var(--transition-fast)'
                    }}
                    onClick={() => toggleFavorite(photo.id)}
                  >
                    <Heart size={16} fill={photo.is_selected ? 'white' : 'none'} color="white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
            No photos match this category tag filter.
          </div>
        )}
      </main>

      {/* Lightbox / Slider Modal */}
      {activePhoto && (
        <div 
          className="modal-overlay" 
          style={{ backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000 }}
          onClick={() => setActivePhoto(null)}
        >
          <div 
            style={{ position: 'relative', width: '90%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              style={{ position: 'absolute', right: 0, top: '-3rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              onClick={() => setActivePhoto(null)}
            >
              <X size={28} />
            </button>

            {/* Main Image Slider with Before/After preview option */}
            <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <img 
                src={activePhoto.edited_url || activePhoto.original_url} 
                alt="Selected Lightbox" 
                style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            </div>

            {/* Bottom Actions Bar */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', color: 'white' }}>
              <div>
                {activePhoto.ai_tags && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {activePhoto.ai_tags.map(t => (
                      <span key={t} style={{ background: 'hsla(250, 60%, 60%, 0.15)', border: '1px solid var(--border-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className={`btn ${activePhoto.is_selected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  onClick={() => toggleFavorite(activePhoto.id)}
                >
                  <Heart size={16} fill={activePhoto.is_selected ? 'white' : 'none'} color="white" />
                  <span>{activePhoto.is_selected ? 'Favorited' : 'Add to Favorites'}</span>
                </button>
                <a 
                  href={activePhoto.original_url} 
                  target="_blank" 
                  rel="noreferrer"
                  download
                  className="btn btn-secondary"
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                >
                  <Download size={16} />
                  <span>Download Original</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryProofing;
