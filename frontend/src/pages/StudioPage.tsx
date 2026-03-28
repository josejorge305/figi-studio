import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import StudioLayout from '../components/panels/StudioLayout';

interface Message { id: number; role: 'user' | 'assistant'; content: string; created_at: string; changedFiles?: string[]; }
interface FileData { id: number; path: string; language: string; content?: string; updated_at: string; }
interface Project { id: number; name: string; description: string; subdomain: string; status: string; }

export default function StudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [toast, setToast] = useState('');
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());
  const initialPromptSent = useRef(false);

  // Load project data
  useEffect(() => {
    if (!projectId) return;
    api.get<{ project: Project; messages: Message[]; files: FileData[] }>(`/api/projects/${projectId}`).then(res => {
      if (res.success && res.data) {
        setProject(res.data.project);
        setMessages(res.data.messages);
        setFiles(res.data.files);
        if (res.data.files.length > 0) {
          api.get<{ files: FileData[] }>(`/api/projects/${projectId}/files`).then(filesRes => {
            if (filesRes.success && filesRes.data) {
              const indexFile = filesRes.data.files.find(f => f.path === 'index.html');
              if (indexFile?.content) setPreviewHtml(indexFile.content);
              // Store file contents for editor
              const contents: Record<string, string> = {};
              for (const f of filesRes.data.files) {
                if (f.content) contents[f.path] = f.content;
              }
              setFileContents(contents);
            }
          });
        }
      } else navigate('/dashboard');
    }).finally(() => setLoading(false));
  }, [projectId]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const openInNewTab = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const userMsg = (overrideMessage || input).trim();
    if (!userMsg || generating || !projectId) return;
    if (!overrideMessage) setInput('');
    setGenerating(true);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMsg, created_at: new Date().toISOString() }]);

    const res = await api.post<{ message: string; files: Array<{ path: string; language: string }>; preview_html: string | null }>(`/api/projects/${projectId}/generate`, { message: userMsg });
    if (res.success && res.data) {
      const changedPaths = (res.data.files || []).map(f => f.path);

      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: res.data!.message,
        created_at: new Date().toISOString(), changedFiles: changedPaths,
      }]);

      if (changedPaths.length > 0) {
        setFiles(prev => {
          const updated = [...prev];
          for (const f of res.data!.files) {
            const idx = updated.findIndex(x => x.path === f.path);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], ...f, updated_at: new Date().toISOString() };
            } else {
              updated.push({ id: Date.now(), path: f.path, language: f.language, updated_at: new Date().toISOString() } as FileData);
            }
          }
          return updated;
        });
        setRecentlyChanged(new Set(changedPaths));
        setTimeout(() => setRecentlyChanged(new Set()), 5000);

        // Refresh file contents for editor
        api.get<{ files: FileData[] }>(`/api/projects/${projectId}/files`).then(filesRes => {
          if (filesRes.success && filesRes.data) {
            const contents: Record<string, string> = {};
            for (const f of filesRes.data.files) {
              if (f.content) contents[f.path] = f.content;
            }
            setFileContents(contents);
          }
        });
      }

      if (res.data.preview_html) {
        setPreviewHtml(res.data.preview_html);
        setPreviewKey(k => k + 1);
        showToast(`${changedPaths.length} file${changedPaths.length !== 1 ? 's' : ''} generated — preview updated`);
      }
    } else {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Sorry, something went wrong: ${res.error}`, created_at: new Date().toISOString() }]);
    }
    setGenerating(false);
  }, [input, generating, projectId]);

  // Auto-send initial prompt from Dashboard
  useEffect(() => {
    if (loading || !project || initialPromptSent.current) return;
    const state = location.state as { initialPrompt?: string; designStylePrompt?: string } | null;
    if (state?.initialPrompt) {
      initialPromptSent.current = true;
      window.history.replaceState({}, document.title);
      const designPrefix = state.designStylePrompt ? `[DESIGN STYLE: ${state.designStylePrompt}]\n\n` : '';
      setTimeout(() => handleSend(designPrefix + state.initialPrompt), 100);
    }
  }, [loading, project, location.state, handleSend]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🤖</div><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading studio...</p></div>
    </div>
  );

  if (!project) return null;

  return (
    <>
      <StudioLayout
        project={project}
        messages={messages}
        files={files}
        fileContents={fileContents}
        input={input}
        generating={generating}
        previewHtml={previewHtml}
        previewKey={previewKey}
        recentlyChanged={recentlyChanged}
        userName={user?.name}
        onInputChange={setInput}
        onSend={() => handleSend()}
        onSuggestionClick={setInput}
        onRefreshPreview={() => setPreviewKey(k => k + 1)}
        onOpenLive={openInNewTab}
        onBack={() => navigate('/dashboard')}
        onLogout={logout}
      />
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-sm font-medium text-white animate-fade-in z-50"
          style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
          ✓ {toast}
        </div>
      )}
    </>
  );
}
