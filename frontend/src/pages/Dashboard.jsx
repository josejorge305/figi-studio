import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearToken, getUser } from '../utils/api';

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/projects', { name: name.trim(), description: description.trim() });
      if (!res.success) { setError(res.error || 'Failed to create project'); return; }
      onCreate(res.data);
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in"
        style={{ background: '#0f1a2e', border: '1px solid rgba(71,85,105,0.4)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">✨ New Project</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xl transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome App"
              autoFocus
              required
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(71,85,105,0.3)' }}
              onFocus={(e) => e.target.style.borderColor = '#FF8C42'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(71,85,105,0.3)'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you build? (optional)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none resize-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(71,85,105,0.3)' }}
              onFocus={(e) => e.target.style.borderColor = '#FF8C42'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(71,85,105,0.3)'}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
              ⚠️ {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-white/60 font-medium transition-colors hover:text-white/80"
              style={{ background: 'rgba(71,85,105,0.2)', border: '1px solid rgba(71,85,105,0.3)' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 py-3 rounded-xl font-semibold text-white transition-all"
              style={{ background: !name.trim() ? 'rgba(255,140,66,0.3)' : '#FF8C42', cursor: !name.trim() ? 'not-allowed' : 'pointer' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" />
                  Creating...
                </span>
              ) : 'Create Project →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const statusColors = {
    active: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', dot: '#22c55e' },
    deployed: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', dot: '#3b82f6' },
    inactive: { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', dot: '#6b7280' },
  };
  const status = statusColors[project.status] || statusColors.active;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((new Date(dateStr) - Date.now()) / 86400000), 'day'
      );
    } catch { return dateStr.split('T')[0]; }
  };

  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 cursor-pointer transition-all duration-200 group"
      style={{
        background: 'rgba(51,65,85,0.2)',
        border: '1px solid rgba(71,85,105,0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,140,66,0.4)';
        e.currentTarget.style.background = 'rgba(51,65,85,0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)';
        e.currentTarget.style.background = 'rgba(51,65,85,0.2)';
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">
          {project.status === 'deployed' ? '🚀' : '⚡'}
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
          style={{ background: status.bg, color: status.text }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: status.dot }} />
          {project.status || 'active'}
        </span>
      </div>

      <h3 className="font-semibold text-white/90 text-lg mb-1 group-hover:text-white transition-colors">{project.name}</h3>
      {project.description && (
        <p className="text-white/50 text-sm mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="border-t pt-3 mt-3 flex items-center justify-between"
        style={{ borderColor: 'rgba(71,85,105,0.2)' }}>
        <span className="text-xs text-white/30">{formatDate(project.created_at)}</span>
        {project.preview_url ? (
          <a href={project.preview_url} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ color: '#FF8C42', background: 'rgba(255,140,66,0.1)' }}>
            View Live ↗
          </a>
        ) : (
          <span className="text-xs text-white/30">Not deployed yet</span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      if (res.success) {
        setProjects(res.data || []);
      } else if (res.error?.includes('Unauthorized')) {
        clearToken();
        navigate('/');
      } else {
        setError(res.error || 'Failed to load projects');
      }
    } catch {
      setError('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ background: '#0b1120', fontFamily: 'Outfit' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(11,17,32,0.95)', borderBottom: '1px solid rgba(71,85,105,0.2)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-xl font-bold text-white">Figi <span style={{ color: '#FF8C42' }}>Studio</span></h1>
            <p className="text-xs text-white/40">Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50 hidden sm:block">
            👋 {user?.email?.split('@')[0] || 'Builder'}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white/80 transition-colors"
            style={{ background: 'rgba(71,85,105,0.2)', border: '1px solid rgba(71,85,105,0.3)' }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Your Projects</h2>
          <p className="text-white/50">Build something amazing with AI-powered conversations</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-spin" style={{ animationDuration: '1s' }}>⚙️</div>
              <p className="text-white/50">Loading your projects...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadProjects}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: '#FF8C42' }}>
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* New Project Card */}
            <button
              onClick={() => setShowModal(true)}
              className="rounded-2xl p-5 text-left transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[180px]"
              style={{
                background: 'rgba(255,140,66,0.05)',
                border: '2px dashed rgba(255,140,66,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,140,66,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,140,66,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,140,66,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,140,66,0.3)';
              }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(255,140,66,0.15)' }}>
                +
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: '#FF8C42' }}>New Project</p>
                <p className="text-xs text-white/40 mt-1">Start building with AI</p>
              </div>
            </button>

            {/* Project Cards */}
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/studio/${project.id}`)}
              />
            ))}

            {projects.length === 0 && (
              <div className="col-span-full text-center py-12 text-white/30">
                <p className="text-lg mb-1">No projects yet</p>
                <p className="text-sm">Click "New Project" to get started!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={(project) => {
            setProjects((prev) => [project, ...prev]);
            navigate(`/studio/${project.id}`);
          }}
        />
      )}
    </div>
  );
}
