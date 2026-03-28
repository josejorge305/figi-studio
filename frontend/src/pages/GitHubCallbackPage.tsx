import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export default function GitHubCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setStatus('error');
      setError('No authorization code received');
      return;
    }

    api.post<{ username: string; avatar_url: string }>('/api/github/callback', { code })
      .then(res => {
        if (res.success && res.data) {
          setStatus('success');
          // Notify parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'github-connected',
              username: res.data.username,
            }, '*');
          }
          // Close popup after a brief delay
          setTimeout(() => window.close(), 2000);
        } else {
          setStatus('error');
          setError(res.error || 'Connection failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setError('Network error');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
      color: '#e4e4e7',
      fontFamily: 'Outfit, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s ease infinite' }}>🔗</div>
            <p style={{ color: '#9ca3af' }}>Connecting to GitHub...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>Connected to GitHub!</p>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>This window will close automatically.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>Connection failed</p>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>{error}</p>
            <button onClick={() => window.close()}
              style={{
                marginTop: 16,
                padding: '8px 24px',
                background: '#252830',
                border: '1px solid #2a2d37',
                borderRadius: 8,
                color: '#e4e4e7',
                cursor: 'pointer',
                fontSize: 14,
              }}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
