import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setUser } from '../utils/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await api.post(endpoint, { email, password });

      if (!res.success) {
        setError(res.error || 'Something went wrong');
        return;
      }

      setToken(res.data.token);
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0b1120 0%, #0f1a2e 50%, #0b1120 100%)' }}>
      
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #FF8C42 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🤖</div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit' }}>
            Figi <span style={{ color: '#FF8C42' }}>Studio</span>
          </h1>
          <p className="text-white/50 text-sm">Build apps with the power of conversation</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{
          background: 'rgba(51,65,85,0.2)',
          border: '1px solid rgba(71,85,105,0.3)',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={mode === 'login'
                ? { background: '#FF8C42', color: 'white' }
                : { color: 'rgba(255,255,255,0.5)' }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={mode === 'register'
                ? { background: '#FF8C42', color: 'white' }
                : { color: 'rgba(255,255,255,0.5)' }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all duration-200"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(71,85,105,0.3)',
                }}
                onFocus={(e) => e.target.style.borderColor = '#FF8C42'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(71,85,105,0.3)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all duration-200"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(71,85,105,0.3)',
                }}
                onFocus={(e) => e.target.style.borderColor = '#FF8C42'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(71,85,105,0.3)'}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-300 animate-fade-in"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 mt-2"
              style={{
                background: loading ? 'rgba(255,140,66,0.5)' : '#FF8C42',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => !loading && (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.target.style.opacity = '1')}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In →' : 'Create Account →'
              )}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="underline"
              style={{ color: '#FF8C42' }}
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Built with ❤️ by Figi Code Academy
        </p>
      </div>
    </div>
  );
}
