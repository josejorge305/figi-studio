import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

interface Message { id: number; role: 'user' | 'assistant'; content: string; created_at: string; }
interface File { id: number; path: string; language: string; content?: string; updated_at: string; }
interface Project { id: number; name: string; description: string; subdomain: string; preview_url: string; status: string; }

type BottomTab = 'files' | 'history';

export default function StudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [bottomTab, setBottomTab] = useState<BottomTab>('files');
  const [toast, setToast] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!projectId) return;
    api.get<{ project: Project; messages: Message[]; files: File[] }>(`/api/projects/${projectId}`).then(res => {
      if (res.success && res.data) {
        setProject(res.data.project);
        setMessages(res.data.messages);
        setFiles(res.data.files);
        if (res.data.project.preview_url) setPreviewUrl(res.data.project.preview_url);
      } else navigate('/dashboard');
    }).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSend = async () => {
    if (!input.trim() || generating || !projectId) return;
    const userMsg = input.trim();
    setInput('');
    setGenerating(true);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMsg, created_at: new Date().toISOString() }]);

    const res = await api.post<{ message: string; files: File[]; preview_url: string; preview_ready: boolean }>(`/api/projects/${projectId}/generate`, { message: userMsg });
    if (res.success && res.data) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: res.data!.message, created_at: new Date().toISOString() }]);
      if (res.data.files?.length > 0) {
        setFiles(prev => {
          const updated = [...prev];
          for (const f of res.data!.files) {
            const idx = updated.findIndex(x => x.path === f.path);
            if (idx >= 0) updated[idx] = { ...updated[idx], ...f };
            else updated.push(f as File);
          }
          return updated;
        });
        setBottomTab('files');
      }
      if (res.data.preview_url) { setPreviewUrl(res.data.preview_url); setPreviewKey(k => k + 1); }
    } else {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Sorry, something went wrong: ${res.error}`, created_at: new Date().toISOString() }]);
    }
    setGenerating(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b1120' }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🤖</div><p className="text-white/40 text-sm">Loading studio...</p></div>
    </div>
  );

  if (!project) return null;

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0b1120' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0" style={{ borderColor: 'rgba(71,85,105,0.3)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-white/40 hover:text-white/70 transition-colors text-sm">← Dashboard</button>
          <span className="text-white/20">|</span>
          <span className="text-2xl">🤖</span>
          <span className="font-bold text-white/90">{project.name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full text-green-400" style={{ background: 'rgba(74,222,128,0.1)' }}>● {project.status}</span>
        </div>
        <div className="flex items-center gap-3">
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-orange-400 transition-all"
              style={{ background: 'rgba(255,140,66,0.1)', border: '1px solid rgba(255,140,66,0.2)' }}>
              Open Live ↗
            </a>
          )}
          <span className="text-white/30 text-xs">{user?.name}</span>
          <button onClick={logout} className="text-white/20 hover:text-white/50 text-xs transition-colors">Sign out</button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel */}
        <div className="flex flex-col border-r" style={{ width: '42%', borderColor: 'rgba(71,85,105,0.3)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-white font-bold mb-2">Professor Figi is ready</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Describe what you want to build. I'll generate the code and explain what I made.
                </p>
                <div className="mt-6 space-y-2 w-full max-w-xs">
                  {['Build a landing page for a SaaS product', 'Create a todo app with local storage', 'Make a REST API with user auth'].map(suggestion => (
                    <button key={suggestion} onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-white/60 transition-all hover:text-white/80"
                      style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(71,85,105,0.2)' }}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {msg.role === 'assistant' && <div className="text-xl shrink-0 mt-1">🤖</div>}
                <div className="max-w-[85%]">
                  <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: msg.role === 'user' ? 'rgba(255,140,66,0.1)' : 'rgba(51,65,85,0.3)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(255,140,66,0.2)' : 'rgba(71,85,105,0.3)'}`,
                      color: 'rgba(255,255,255,0.9)',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {generating && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="text-xl">🤖</div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(51,65,85,0.3)', border: '1px solid rgba(71,85,105,0.3)' }}>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF8C42', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t shrink-0" style={{ borderColor: 'rgba(71,85,105,0.3)' }}>
            <div className="flex gap-2 items-end rounded-xl p-2" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(71,85,105,0.3)' }}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Describe what to build or change..."
                rows={2} disabled={generating}
                className="flex-1 bg-transparent outline-none resize-none text-sm text-white/90 placeholder-white/30 leading-relaxed"
                style={{ minHeight: 44, maxHeight: 120 }} />
              <button onClick={handleSend} disabled={!input.trim() || generating}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all text-white font-bold text-lg"
                style={{ background: input.trim() && !generating ? '#FF8C42' : 'rgba(255,255,255,0.05)', cursor: input.trim() && !generating ? 'pointer' : 'not-allowed' }}>
                ↑
              </button>
            </div>
            <p className="text-white/20 text-[10px] text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>

        {/* Preview + Bottom Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview */}
          <div className="flex-1 relative" style={{ background: '#060810' }}>
            {previewUrl ? (
              <>
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                  <span className="text-[10px] text-white/30 font-mono">{previewUrl}</span>
                  <button onClick={() => setPreviewKey(k => k + 1)}
                    className="px-3 py-1 rounded-lg text-xs text-white/60 transition-all hover:text-white/90"
                    style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(71,85,105,0.3)' }}>↻ Refresh</button>
                </div>
                <iframe key={previewKey} src={previewUrl} className="w-full h-full border-0" title="App Preview" sandbox="allow-scripts allow-same-origin allow-forms" />
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="text-6xl mb-4">🌐</div>
                <h3 className="text-white/60 font-semibold mb-2">Live Preview</h3>
                <p className="text-white/30 text-sm">Your app will appear here once you start building</p>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="shrink-0 border-t" style={{ borderColor: 'rgba(71,85,105,0.3)', maxHeight: 200 }}>
            <div className="flex items-center border-b" style={{ borderColor: 'rgba(71,85,105,0.2)' }}>
              {(['files', 'history'] as BottomTab[]).map(tab => (
                <button key={tab} onClick={() => setBottomTab(tab)}
                  className="px-4 py-2 text-xs font-medium capitalize transition-colors"
                  style={{ color: bottomTab === tab ? '#FF8C42' : 'rgba(255,255,255,0.4)', borderBottom: bottomTab === tab ? '2px solid #FF8C42' : '2px solid transparent' }}>
                  {tab === 'files' ? `📁 Files (${files.length})` : `🕐 History (${messages.length})`}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto p-3" style={{ maxHeight: 150 }}>
              {bottomTab === 'files' ? (
                files.length === 0 ? <p className="text-white/25 text-xs text-center py-4">No files yet — start building!</p> : (
                  <div className="space-y-1">
                    {files.map(f => (
                      <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(51,65,85,0.15)' }}>
                        <span className="text-xs text-white/30">📄</span>
                        <span className="text-xs text-white/70 font-mono">{f.path}</span>
                        <span className="text-[10px] text-white/25 ml-auto">{f.language}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                messages.length === 0 ? <p className="text-white/25 text-xs text-center py-4">No messages yet</p> : (
                  <div className="space-y-1">
                    {messages.map(m => (
                      <div key={m.id} className="flex items-start gap-2">
                        <span className="text-xs">{m.role === 'user' ? '👤' : '🤖'}</span>
                        <span className="text-xs text-white/50 line-clamp-1">{m.content}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-sm font-medium text-white animate-fade-in z-50"
          style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
