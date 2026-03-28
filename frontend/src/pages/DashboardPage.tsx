import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

interface Project { id: number; name: string; description: string; subdomain: string; preview_url: string; status: string; created_at: string; updated_at: string; }
interface Template { id: string; name: string; description: string; icon: string; category: string; prompt: string; designStyle: string; }

const DESIGN_STYLES = [
  { id: 'modern', name: 'Modern Clean', description: 'Minimal and professional', emoji: '✨', prompt: 'Use a clean, modern design with plenty of white space, subtle shadows, rounded corners (8-12px), a neutral color palette with one accent color, and clean sans-serif typography. Prefer cards with subtle borders over heavy backgrounds.' },
  { id: 'glassmorphism', name: 'Glassmorphism', description: 'Frosted glass with depth', emoji: '🧊', prompt: 'Use glassmorphism design: frosted glass effect with backdrop-filter blur(10-20px), semi-transparent backgrounds (rgba with 0.1-0.3 alpha), subtle 1px white/transparent borders, layered depth, and a gradient or colorful background behind the glass panels.' },
  { id: 'claymorphism', name: 'Claymorphism', description: 'Soft, puffy and tactile', emoji: '🎨', prompt: 'Use claymorphism design: soft, rounded, puffy UI elements that look like clay or plastic. Use pastel colors, large border-radius (16-24px), inner shadows combined with drop shadows to create a 3D pressed/raised effect.' },
  { id: 'neo_brutalism', name: 'Neo-Brutalism', description: 'Bold borders and raw energy', emoji: '⚡', prompt: 'Use neo-brutalism design: thick black borders (2-4px solid black), bold solid colors (bright yellows, pinks, blues), no gradients, hard box-shadows offset 4-6px with black, blocky sans-serif typography.' },
  { id: 'neumorphism', name: 'Neumorphism', description: 'Soft extruded surfaces', emoji: '🌗', prompt: 'Use neumorphism/soft UI design: elements appear extruded from or pressed into the background using matching-color shadows. Use a single muted background color, dual shadows (one light, one dark) to create depth.' },
];

const DESIGN_STYLE_MAP: Record<string, string> = {};
DESIGN_STYLES.forEach(s => { DESIGN_STYLE_MAP[s.id] = s.prompt; });

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('modern');
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.get<{ projects: Project[] }>('/api/projects').then(res => {
      if (res.success && res.data) setProjects(res.data.projects);
    }).finally(() => setLoading(false));

    api.get<{ templates: Template[] }>('/api/templates').then(res => {
      if (res.success && res.data) setTemplates(res.data.templates);
    });
  }, []);

  const openCreateModal = (template?: Template) => {
    if (template) {
      setNewName(template.name);
      setNewDesc(template.prompt);
      setSelectedStyle(template.designStyle || 'modern');
    } else {
      setNewName('');
      setNewDesc('');
      setSelectedStyle('modern');
    }
    setShowModal(true);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await api.post<{ project: Project }>('/api/projects', { name: newName, description: newDesc });
    if (res.success && res.data) {
      const style = DESIGN_STYLES.find(s => s.id === selectedStyle);
      navigate(`/studio/${res.data.project.id}`, {
        state: { initialPrompt: newDesc.trim() || undefined, designStylePrompt: style?.prompt || undefined },
      });
    }
    setCreating(false);
  };

  const createFromOnboarding = async (prompt: string, stylePick: string) => {
    const name = prompt.length > 40 ? prompt.slice(0, 40).trim() + '...' : prompt;
    setCreating(true);
    const res = await api.post<{ project: Project }>('/api/projects', { name, description: prompt });
    if (res.success && res.data) {
      const style = DESIGN_STYLES.find(s => s.id === stylePick);
      navigate(`/studio/${res.data.project.id}`, {
        state: { initialPrompt: prompt, designStylePrompt: style?.prompt || undefined },
      });
    }
    setCreating(false);
  };

  const deleteProject = async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project? This can\'t be undone.')) return;
    setDeletingIds(prev => new Set(prev).add(projectId));
    const res = await api.delete<{ deleted: boolean }>(`/api/projects/${projectId}`);
    if (res.success) setProjects(prev => prev.filter(p => p.id !== projectId));
    setDeletingIds(prev => { const next = new Set(prev); next.delete(projectId); return next; });
  };

  const isNewUser = !loading && projects.length === 0;
  const displayTemplates = templates.length > 0 ? templates : [];

  // ── ONBOARDING for first-time users ──
  if (isNewUser) {
    return <OnboardingView
      user={user}
      logout={logout}
      templates={displayTemplates}
      creating={creating}
      onCreate={createFromOnboarding}
      onTemplateClick={(t) => openCreateModal(t)}
      showModal={showModal}
      setShowModal={setShowModal}
      newName={newName} setNewName={setNewName}
      newDesc={newDesc} setNewDesc={setNewDesc}
      selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
      createProject={createProject}
    />;
  }

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
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit' }}>Your Apps</h1>
          <p className="text-white/50">Describe what you want to build — Figi does the rest.</p>
        </div>

        <button onClick={() => openCreateModal()}
          className="mb-6 flex items-center gap-3 px-6 py-4 rounded-2xl border border-dashed transition-all hover:border-orange-500/40"
          style={{ borderColor: 'rgba(255,140,66,0.2)', background: 'rgba(255,140,66,0.03)', width: '100%' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,140,66,0.1)' }}>+</div>
          <div className="text-left">
            <p className="text-white/80 font-semibold text-sm">New App</p>
            <p className="text-white/35 text-xs">Start building with AI</p>
          </div>
        </button>

        {/* Templates */}
        {displayTemplates.length > 0 && (
          <div className="mb-10">
            <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">Or start from a template</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {displayTemplates.map(t => (
                <button key={t.id} onClick={() => openCreateModal(t)}
                  className="text-left p-4 rounded-xl transition-all hover:scale-[1.03] hover:border-orange-500/30"
                  style={{ background: 'rgba(51,65,85,0.15)', border: '1px solid rgba(71,85,105,0.2)' }}>
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <p className="text-white/80 text-sm font-semibold mb-0.5">{t.name}</p>
                  <p className="text-white/35 text-[10px] leading-tight">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(51,65,85,0.2)' }} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <button key={p.id} onClick={() => navigate(`/studio/${p.id}`)}
                className="group relative text-left p-5 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(71,85,105,0.3)', opacity: deletingIds.has(p.id) ? 0.4 : 1 }}>
                <button onClick={(e) => deleteProject(e, p.id)} disabled={deletingIds.has(p.id)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                  title="Delete project">
                  <svg className="w-3.5 h-3.5 text-white/30 hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,140,66,0.1)' }}>🤖</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: p.status === 'active' ? 'rgba(74,222,128,0.1)' : 'rgba(255,140,66,0.1)', color: p.status === 'active' ? '#4ade80' : '#FF8C42' }}>
                    {p.status}
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-1">{p.name}</h3>
                <p className="text-white/40 text-xs mb-3 line-clamp-2">{p.description || 'No description'}</p>
                <p className="text-white/25 text-[10px] mt-2">Updated {new Date(p.updated_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && <CreateModal
        newName={newName} setNewName={setNewName}
        newDesc={newDesc} setNewDesc={setNewDesc}
        selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
        creating={creating} onSubmit={createProject} onClose={() => setShowModal(false)}
      />}
    </div>
  );
}

// ── Onboarding component ──────────────────────────────────────
function OnboardingView({ user, logout, templates, creating, onCreate, onTemplateClick, showModal, setShowModal, newName, setNewName, newDesc, setNewDesc, selectedStyle, setSelectedStyle, createProject }: {
  user: any; logout: () => void; templates: Template[]; creating: boolean;
  onCreate: (prompt: string, style: string) => void;
  onTemplateClick: (t: Template) => void;
  showModal: boolean; setShowModal: (v: boolean) => void;
  newName: string; setNewName: (v: string) => void;
  newDesc: string; setNewDesc: (v: string) => void;
  selectedStyle: string; setSelectedStyle: (v: string) => void;
  createProject: (e: React.FormEvent) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('modern');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b1120' }}>
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

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[680px] animate-fade-in">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🤖</div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit' }}>Welcome to Figi Studio</h1>
            <p className="text-white/50">Describe any app — I'll build it while you watch and learn.</p>
          </div>

          {/* Prompt input */}
          <div className="mb-4 rounded-2xl p-4" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(71,85,105,0.3)' }}>
            <textarea
              value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="What do you want to build? (e.g. A fitness tracker app with workout logging...)"
              rows={3}
              className="w-full bg-transparent outline-none resize-none text-sm text-white/90 placeholder-white/30"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1.5 overflow-x-auto">
                {DESIGN_STYLES.map(s => (
                  <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                    className="shrink-0 px-2 py-1 rounded-lg text-[10px] transition-all"
                    style={{
                      background: style === s.id ? 'rgba(255,140,66,0.15)' : 'rgba(0,0,0,0.2)',
                      border: style === s.id ? '1px solid rgba(255,140,66,0.3)' : '1px solid rgba(71,85,105,0.2)',
                      color: style === s.id ? '#FF8C42' : 'rgba(255,255,255,0.4)',
                    }}>
                    {s.emoji} {s.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { if (prompt.trim()) onCreate(prompt.trim(), style); }}
                disabled={!prompt.trim() || creating}
                className="shrink-0 ml-3 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: prompt.trim() && !creating ? '#FF8C42' : 'rgba(255,140,66,0.2)', opacity: prompt.trim() && !creating ? 1 : 0.5, cursor: prompt.trim() && !creating ? 'pointer' : 'not-allowed' }}>
                {creating ? 'Creating...' : 'Build →'}
              </button>
            </div>
          </div>

          {/* Templates */}
          {templates.length > 0 && (
            <div className="mb-8">
              <p className="text-center text-white/30 text-xs mb-4">── or pick a template ──</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {templates.map(t => (
                  <button key={t.id} onClick={() => onTemplateClick(t)}
                    className="p-3 rounded-xl text-center transition-all hover:scale-[1.05] hover:border-orange-500/30"
                    style={{ background: 'rgba(51,65,85,0.15)', border: '1px solid rgba(71,85,105,0.2)' }}>
                    <div className="text-xl mb-1">{t.icon}</div>
                    <p className="text-white/70 text-[11px] font-medium">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feature list */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(51,65,85,0.1)', border: '1px solid rgba(71,85,105,0.2)' }}>
            <div className="space-y-2.5">
              {[
                { icon: '🔧', text: 'AI builds your full app in seconds' },
                { icon: '📁', text: 'See & edit every file with a real code editor' },
                { icon: '🗺️', text: 'Architecture diagram shows how it connects' },
                { icon: '🎓', text: 'Errors link to Figi Code lessons' },
                { icon: '☁️', text: 'Deploy live to Cloudflare (Pro)' },
                { icon: '🌿', text: 'Push to GitHub (Pro)' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-sm text-white/60">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-white/20 text-xs mt-6">
            Already have a Figi Code account? Your progress carries over.
          </p>
        </div>
      </div>

      {showModal && <CreateModal
        newName={newName} setNewName={setNewName}
        newDesc={newDesc} setNewDesc={setNewDesc}
        selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
        creating={creating} onSubmit={createProject} onClose={() => setShowModal(false)}
      />}
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────
function CreateModal({ newName, setNewName, newDesc, setNewDesc, selectedStyle, setSelectedStyle, creating, onSubmit, onClose }: {
  newName: string; setNewName: (v: string) => void;
  newDesc: string; setNewDesc: (v: string) => void;
  selectedStyle: string; setSelectedStyle: (v: string) => void;
  creating: boolean; onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Outfit' }}>New App</h2>
        <p className="text-white/50 text-sm mb-5">Give your app a name, describe it, and pick a style.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus
            placeholder="My Awesome App"
            className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(71,85,105,0.4)' }} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
            placeholder="What should it do?"
            className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none resize-none"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(71,85,105,0.4)' }} />
          <div>
            <label className="block text-xs font-medium text-white/40 mb-2">Design Style</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DESIGN_STYLES.map(s => (
                <button key={s.id} type="button" onClick={() => setSelectedStyle(s.id)}
                  className="shrink-0 px-3 py-2 rounded-xl text-left transition-all"
                  style={{
                    background: selectedStyle === s.id ? 'rgba(255,140,66,0.1)' : 'rgba(0,0,0,0.2)',
                    border: selectedStyle === s.id ? '1px solid rgba(255,140,66,0.4)' : '1px solid rgba(71,85,105,0.3)',
                  }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{s.emoji}</span>
                    <span className="text-xs font-semibold" style={{ color: selectedStyle === s.id ? '#FF8C42' : 'rgba(255,255,255,0.6)' }}>{s.name}</span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
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
  );
}
