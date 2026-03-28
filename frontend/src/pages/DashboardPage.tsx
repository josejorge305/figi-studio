import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

interface Project { id: number; name: string; description: string; subdomain: string; preview_url: string; status: string; created_at: string; updated_at: string; }

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get<{ projects: Project[] }>('/api/projects').then(res => {
      if (res.success && res.data) setProjects(res.data.projects);
    }).finally(() => setLoading(false));
  }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await api.post<{ project: Project }>('/api/projects', { name: newName, description: newDesc });
    if (res.success && res.data) {
      navigate(`/studio/${res.data.project.id}`);
    }
    setCreating(false);
  };

  return (
    <div className="min-h-screen" style={{ background: '#0b1120' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'rgba(71,85,105,0.3)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <span className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit' }}>Figi Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/50">Hey, {user?.name} 👋</span>
            <button onClick={logout} className="text-xs text-white/30 hover:text-white/60 transition-colors">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit' }}>Your Apps</h1>
          <p className="text-white/50">Describe what you want to build — Figi does the rest.</p>
        </div>

        {/* New project button */}
        <button onClick={() => setShowModal(true)}
          className="mb-8 flex items-center gap-3 px-6 py-4 rounded-2xl border border-dashed transition-all hover:border-orange-500/40"
          style={{ borderColor: 'rgba(255,140,66,0.2)', background: 'rgba(255,140,66,0.03)', width: '100%' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,140,66,0.1)' }}>+</div>
          <div className="text-left">
            <p className="text-white/80 font-semibold text-sm">New App</p>
            <p className="text-white/35 text-xs">Start building with AI</p>
          </div>
        </button>

        {/* Projects grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(51,65,85,0.2)' }} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-white/50">No apps yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <button key={p.id} onClick={() => navigate(`/studio/${p.id}`)}
                className="text-left p-5 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(71,85,105,0.3)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,140,66,0.1)' }}>🤖</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: p.status === 'active' ? 'rgba(74,222,128,0.1)' : 'rgba(255,140,66,0.1)', color: p.status === 'active' ? '#4ade80' : '#FF8C42' }}>
                    {p.status}
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-1">{p.name}</h3>
                <p className="text-white/40 text-xs mb-3 line-clamp-2">{p.description || 'No description'}</p>
                {p.preview_url && (
                  <p className="text-[10px] text-orange-400/60 font-mono truncate">{p.preview_url}</p>
                )}
                <p className="text-white/25 text-[10px] mt-2">Updated {new Date(p.updated_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New project modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Outfit' }}>New App</h2>
            <p className="text-white/50 text-sm mb-5">Give your app a name and we'll get building.</p>
            <form onSubmit={createProject} className="space-y-4">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus
                placeholder="My Awesome App"
                className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(71,85,105,0.4)' }} />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
                placeholder="What should it do? (optional)"
                className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none resize-none"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(71,85,105,0.4)' }} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50"
                  style={{ border: '1px solid rgba(71,85,105,0.3)' }}>Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#FF8C42', opacity: creating ? 0.6 : 1 }}>
                  {creating ? 'Creating...' : 'Create & Build →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
