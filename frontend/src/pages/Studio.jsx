import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, clearToken } from '../utils/api';

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, loading }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    onSend(text);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Outfit' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-white/50 text-sm mb-1">What would you like to build?</p>
            <p className="text-white/30 text-xs">Describe your app in plain English</p>
            <div className="mt-6 space-y-2 w-full max-w-xs">
              {['Build a todo app with dark theme', 'Create a landing page', 'Make a calculator'].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSend(prompt)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all"
                  style={{
                    background: 'rgba(51,65,85,0.3)',
                    border: '1px solid rgba(71,85,105,0.3)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,140,66,0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)'}
                >
                  ✨ {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                style={{ background: 'rgba(255,140,66,0.15)', border: '1px solid rgba(255,140,66,0.2)' }}>
                🤖
              </div>
            )}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'rounded-tr-sm'
                : 'rounded-tl-sm'
            }`}
              style={msg.role === 'user'
                ? { background: '#FF8C42', color: 'white' }
                : { background: 'rgba(51,65,85,0.4)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(71,85,105,0.3)' }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2 animate-fade-in">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: 'rgba(255,140,66,0.15)', border: '1px solid rgba(255,140,66,0.2)' }}>
              🤖
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1"
              style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(71,85,105,0.3)' }}>
              <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: '#FF8C42' }} />
              <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: '#FF8C42' }} />
              <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: '#FF8C42' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(71,85,105,0.2)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build or change…"
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(71,85,105,0.3)',
              maxHeight: '120px',
              minHeight: '46px',
            }}
            onFocus={(e) => e.target.style.borderColor = '#FF8C42'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(71,85,105,0.3)'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-3 rounded-xl font-semibold text-sm text-white transition-all flex-shrink-0"
            style={{
              background: !input.trim() || loading ? 'rgba(255,140,66,0.3)' : '#FF8C42',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              minWidth: '60px',
            }}>
            {loading ? '…' : 'Send →'}
          </button>
        </div>
        <p className="text-xs text-white/20 mt-1.5 text-center">↵ Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── Preview Panel ─────────────────────────────────────────────────────────────
function PreviewPanel({ previewUrl, onRefresh }) {
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey((k) => k + 1);
    onRefresh?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(71,85,105,0.2)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-70" />
            <div className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
          </div>
          <div className="px-3 py-1 rounded-lg text-xs text-white/30 truncate max-w-xs"
            style={{ background: 'rgba(0,0,0,0.3)' }}>
            {previewUrl || 'No preview available'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg text-xs transition-colors"
              style={{ color: '#FF8C42', background: 'rgba(255,140,66,0.1)' }}>
              Open ↗
            </a>
          )}
          <button onClick={handleRefresh}
            className="px-3 py-1 rounded-lg text-xs text-white/60 hover:text-white/80 transition-colors"
            style={{ background: 'rgba(71,85,105,0.2)' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative">
        {previewUrl ? (
          <iframe
            key={key}
            src={previewUrl}
            className="w-full h-full border-0"
            title="App Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-6xl mb-4 opacity-30">🖥️</div>
            <p className="text-white/40 text-lg font-medium mb-2">No preview yet</p>
            <p className="text-white/25 text-sm max-w-xs">
              Deploy your project to see a live preview here. Start by chatting with Figi to build your app!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── File Tree ─────────────────────────────────────────────────────────────────
function FileTree({ files }) {
  const [expanded, setExpanded] = useState(new Set(['src']));

  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-center text-white/30 text-xs">
        <p className="mb-1">📁 No files yet</p>
        <p>Files will appear here as you build</p>
      </div>
    );
  }

  // Build tree structure
  const tree = {};
  files.forEach((file) => {
    const parts = file.path.split('/');
    let node = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = file;
      } else {
        node[part] = node[part] || {};
        node = node[part];
      }
    });
  });

  const FileIcon = ({ name }) => {
    if (name.endsWith('.tsx') || name.endsWith('.jsx')) return '⚛️';
    if (name.endsWith('.ts') || name.endsWith('.js')) return '📜';
    if (name.endsWith('.css')) return '🎨';
    if (name.endsWith('.html')) return '🌐';
    if (name.endsWith('.json')) return '📋';
    if (name.endsWith('.md')) return '📝';
    return '📄';
  };

  const renderNode = (node, depth = 0) => {
    return Object.entries(node).map(([key, value]) => {
      const isFile = value && value.path;
      const paddingLeft = depth * 12 + 12;

      if (isFile) {
        return (
          <div key={value.path}
            className="flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer text-xs text-white/60 hover:text-white/80 hover:bg-white/5 transition-all"
            style={{ paddingLeft }}>
            <span><FileIcon name={key} /></span>
            <span className="truncate">{key}</span>
          </div>
        );
      }

      const isExpanded = expanded.has(key);
      return (
        <div key={key}>
          <div
            className="flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
            style={{ paddingLeft }}
            onClick={() => setExpanded((prev) => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            })}>
            <span>{isExpanded ? '▾' : '▸'}</span>
            <span>📁</span>
            <span className="truncate">{key}</span>
          </div>
          {isExpanded && renderNode(value, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="p-2 overflow-y-auto h-full">
      {renderNode(tree)}
    </div>
  );
}

// ─── Deploy Button ─────────────────────────────────────────────────────────────
function DeployButton({ projectId, onDeployed }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleDeploy = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/api/projects/${projectId}/deploy`, {});
      if (res.success) {
        setToast({ type: 'success', msg: '🚀 Deployed! ' + (res.data?.previewUrl || '') });
        onDeployed?.(res.data?.previewUrl);
      } else {
        setToast({ type: 'error', msg: '⚠️ ' + (res.error || 'Deploy failed') });
      }
    } catch {
      setToast({ type: 'error', msg: '⚠️ Network error' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div className="absolute bottom-full right-0 mb-2 px-4 py-2 rounded-xl text-xs whitespace-nowrap animate-fade-in"
          style={{
            background: toast.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: toast.type === 'success' ? '#4ade80' : '#f87171',
          }}>
          {toast.msg}
        </div>
      )}
      <button
        onClick={handleDeploy}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
        style={{ background: loading ? 'rgba(255,140,66,0.5)' : '#FF8C42', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" />
            Deploying…
          </>
        ) : (
          <>🚀 Deploy</>
        )}
      </button>
    </div>
  );
}

// ─── Bottom Bar ────────────────────────────────────────────────────────────────
function BottomBar({ files, messages, status }) {
  const [tab, setTab] = useState('files');

  const tabs = [
    { id: 'files', label: '📁 Files', count: files?.length },
    { id: 'history', label: '🕐 History', count: messages?.length },
  ];

  return (
    <div className="flex flex-col" style={{ height: '200px', borderTop: '1px solid rgba(71,85,105,0.2)' }}>
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: 'rgba(71,85,105,0.15)' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={tab === t.id
              ? { background: 'rgba(255,140,66,0.15)', color: '#FF8C42' }
              : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(71,85,105,0.4)', color: 'rgba(255,255,255,0.5)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full inline-block"
            style={{ background: status === 'deployed' ? '#22c55e' : status === 'active' ? '#FF8C42' : '#6b7280' }} />
          {status || 'active'}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'files' && <FileTree files={files} />}
        {tab === 'history' && (
          <div className="p-3 space-y-1">
            {messages?.filter(m => m.role === 'user').length === 0 ? (
              <p className="text-xs text-white/30 text-center py-4">No prompts yet</p>
            ) : (
              messages?.filter(m => m.role === 'user').map((msg, i) => (
                <div key={i} className="px-3 py-2 rounded-lg text-xs text-white/60 truncate"
                  style={{ background: 'rgba(51,65,85,0.2)' }}>
                  💬 {msg.content}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Studio Page ──────────────────────────────────────────────────────────────
export default function Studio() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const [projRes, filesRes] = await Promise.all([
        api.get(`/api/projects/${projectId}`),
        api.get(`/api/projects/${projectId}/files`),
      ]);

      if (!projRes.success) {
        if (projRes.error?.includes('Unauthorized')) { clearToken(); navigate('/'); return; }
        setError(projRes.error || 'Project not found');
        return;
      }

      setProject(projRes.data);
      setMessages(projRes.data.messages || []);
      setFiles(filesRes.success ? filesRes.data : []);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = useCallback(async (content) => {
    // Optimistic update
    const userMsg = { role: 'user', content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await api.post(`/api/projects/${projectId}/messages`, { role: 'user', content });
      if (res.success && res.data?.assistantMessage) {
        setMessages((prev) => [...prev, res.data.assistantMessage]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '⚠️ Network error. Please try again.',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [projectId]);

  const handleDeployed = (previewUrl) => {
    setProject((prev) => ({ ...prev, preview_url: previewUrl, status: 'deployed' }));
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0b1120' }}>
        <div className="text-center">
          <div className="text-5xl mb-4" style={{ animation: 'spin 1s linear infinite' }}>⚙️</div>
          <p className="text-white/50">Loading studio…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0b1120' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: '#FF8C42' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0b1120', fontFamily: 'Outfit' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(15,26,46,0.95)', borderBottom: '1px solid rgba(71,85,105,0.2)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="text-white/40 hover:text-white/70 transition-colors text-sm">
            ←
          </button>
          <span className="text-xl">🤖</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Figi</span>
              <span className="font-bold" style={{ color: '#FF8C42' }}>Studio</span>
              <span className="text-white/20 text-sm">|</span>
              <span className="text-white/70 text-sm font-medium truncate max-w-[200px]">{project?.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40">
            <span className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: project?.status === 'deployed' ? '#22c55e' : '#FF8C42' }} />
            {project?.status || 'active'}
          </div>
          <DeployButton projectId={projectId} onDeployed={handleDeployed} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel (40%) */}
        <div className="flex flex-col border-r" style={{
          width: '40%',
          minWidth: '300px',
          borderColor: 'rgba(71,85,105,0.2)',
        }}>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              messages={messages}
              onSend={handleSend}
              loading={chatLoading}
            />
          </div>
        </div>

        {/* Preview Panel (60%) */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PreviewPanel
              previewUrl={project?.preview_url}
              onRefresh={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <BottomBar
        files={files}
        messages={messages}
        status={project?.status}
      />
    </div>
  );
}
