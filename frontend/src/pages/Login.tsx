import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { isAuthenticated, login, registerStudio } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studioName, setStudioName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!name || !email || !password || !studioName) {
          throw new Error('Please fill in all fields.');
        }
        await registerStudio(name, email, password, studioName);
      } else {
        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 10% 20%, hsl(250, 40%, 15%) 0%, var(--bg-app) 90%)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-premium), 0 0 50px 0 hsla(250, 60%, 60%, 0.1)'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'var(--gradient-primary)',
            padding: '0.85rem',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 4px 20px 0 hsla(250, 60%, 60%, 0.3)'
          }}>
            <Camera size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            APERTURE
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {isRegistering ? 'Setup your professional studio dashboard' : 'Sign in to your photography workspace'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: 'hsla(350, 80%, 60%, 0.15)',
            border: '1px solid hsla(350, 80%, 60%, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: 'var(--accent-red)',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label className="form-label">Studio Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aura Photography"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isRegistering ? 'Create Studio Workspace' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Mode Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegistering ? (
            <span>
              Already have an workspace?{' '}
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                disabled={loading}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New to Aperture?{' '}
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                disabled={loading}
              >
                Register Studio
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
