import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = mode === 'login' ? await login(email, password) : await register(email, password, name);
    if (!res.success) setError(res.error || 'Something went wrong');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(ellipse at center, rgba(255,140,66,0.04) 0%, #0b1120 60%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🤖</div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Figi Studio</h1>
          <p className="text-white/50 mt-1">Build full-stack apps by describing them</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(71,85,105,0.3)' }}>
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden mb-6" style={{ background: 'rgba(0,0,0,0.2)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2.5 text-sm font-semibold transition-all capitalize"
                style={{ background: mode === m ? '#FF8C42' : 'transparent', color: mode === m ? 'white' : 'rgba(255,255,255,0.5)' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Your Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="JJ Figueroa"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(71,85,105,0.4)' }} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(71,85,105,0.4)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(71,85,105,0.4)' }} />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-base font-bold text-white transition-all"
              style={{ background: loading ? 'rgba(255,140,66,0.5)' : '#FF8C42', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Build full-stack apps with Cloudflare Workers, D1, and React
        </p>
      </div>
    </div>
  );
}
