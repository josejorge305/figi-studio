import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useTerminal } from '../hooks/useTerminal';
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

  // Deploy state
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [cfConnected, setCfConnected] = useState(false);

  const { lines: terminalLines, log: terminalLog, clear: terminalClear } = useTerminal();

  // Load project data
  useEffect(() => {
    if (!projectId) return;
    api.get<{ project: Project; messages: Message[]; files: FileData[] }>(`/api/projects/${projectId}`).then(res => {
      if (res.success && res.data) {
        setProject(res.data.project);
        setMessages(res.data.messages);
        setFiles(res.data.files);
        terminalLog('system', `Loaded project: ${res.data.project.name}`);
        if (res.data.files.length > 0) {
          terminalLog('info', `${res.data.files.length} files found`);
          api.get<{ files: FileData[] }>(`/api/projects/${projectId}/files`).then(filesRes => {
            if (filesRes.success && filesRes.data) {
              const indexFile = filesRes.data.files.find(f => f.path === 'index.html');
              if (indexFile?.content) setPreviewHtml(indexFile.content);
              const contents: Record<string, string> = {};
              for (const f of filesRes.data.files) {
                if (f.content) contents[f.path] = f.content;
              }
              setFileContents(contents);
              setFiles(filesRes.data.files);
            }
          });
        }
      } else navigate('/dashboard');
    }).finally(() => setLoading(false));

    // Check CF connection status
    api.get<{ connected: boolean }>('/api/cloudflare/status').then(res => {
      if (res.success && res.data) setCfConnected(res.data.connected);
    });

    // Check for existing deployments
    api.get<{ deployments: Array<{ deployment_url: string; status: string }> }>(`/api/projects/${projectId}/deployments`).then(res => {
      if (res.success && res.data) {
        const latest = res.data.deployments.find(d => d.status === 'success');
        if (latest) setDeployedUrl(latest.deployment_url);
      }
    });
  }, [projectId]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const openInNewTab = () => {
    if (deployedUrl) { window.open(deployedUrl, '_blank'); return; }
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const refreshFiles = useCallback(async () => {
    if (!projectId) return;
    const res = await api.get<{ files: FileData[] }>(`/api/projects/${projectId}/files`);
    if (res.success && res.data) {
      setFiles(res.data.files);
      const contents: Record<string, string> = {};
      for (const f of res.data.files) {
        if (f.content) contents[f.path] = f.content;
      }
      setFileContents(contents);
      const indexFile = res.data.files.find(f => f.path === 'index.html');
      if (indexFile?.content) {
        setPreviewHtml(indexFile.content);
        setPreviewKey(k => k + 1);
      }
    }
  }, [projectId]);

  const handleFileUpdated = useCallback((path: string, content: string) => {
    setFileContents(prev => ({ ...prev, [path]: content }));
    terminalLog('success', `💾 Saved: ${path}`);
    if (path === 'index.html') {
      setPreviewHtml(content);
    }
    setPreviewKey(k => k + 1);
    terminalLog('info', 'Preview refreshed.');
    showToast(`Saved ${path.split('/').pop()}`);
  }, [terminalLog]);

  const handleFilesChanged = useCallback(async () => {
    await refreshFiles();
  }, [refreshFiles]);

  const handleTerminalLog = useCallback((type: 'info' | 'success' | 'error' | 'warning' | 'system' | 'command' | 'ai', message: string) => {
    terminalLog(type, message);
  }, [terminalLog]);

  // Deploy handlers
  const handleDeployStart = useCallback(() => {
    setDeploying(true);
  }, []);

  const handleDeployEnd = useCallback((url: string | null) => {
    setDeploying(false);
    if (url) {
      setDeployedUrl(url);
      setCfConnected(true);
      showToast(`Deployed to ${url}`);
    }
  }, []);

  const handleTopBarDeploy = useCallback(async () => {
    if (!cfConnected || !projectId) {
      terminalLog('warning', 'Connect Cloudflare in the Deploy panel first');
      return;
    }
    setDeploying(true);
    terminalLog('command', '> Deploying to Cloudflare Pages...');
    const res = await api.post<{ url: string }>(`/api/projects/${projectId}/deploy`);
    if (res.success && res.data) {
      terminalLog('success', `Deployed to ${res.data.url}`);
      setDeployedUrl(res.data.url);
      showToast(`Deployed to ${res.data.url}`);
    } else {
      terminalLog('error', `Deploy failed: ${res.error}`);
    }
    setDeploying(false);
  }, [cfConnected, projectId, terminalLog]);

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const userMsg = (overrideMessage || input).trim();
    if (!userMsg || generating || !projectId) return;
    if (!overrideMessage) setInput('');
    setGenerating(true);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMsg, created_at: new Date().toISOString() }]);

    const truncated = userMsg.length > 80 ? userMsg.slice(0, 80) + '...' : userMsg;
    terminalLog('command', `> Generate: "${truncated}"`);
    terminalLog('info', 'Sending prompt to Figi AI...');

    const res = await api.post<{ message: string; files: Array<{ path: string; language: string }>; preview_html: string | null }>(`/api/projects/${projectId}/generate`, { message: userMsg });
    if (res.success && res.data) {
      const changedPaths = (res.data.files || []).map(f => f.path);

      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: res.data!.message,
        created_at: new Date().toISOString(), changedFiles: changedPaths,
      }]);

      terminalLog('success', `Generated ${changedPaths.length} file${changedPaths.length !== 1 ? 's' : ''}`);
      changedPaths.forEach(p => terminalLog('info', `  📄 ${p}`));

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

        api.get<{ files: FileData[] }>(`/api/projects/${projectId}/files`).then(filesRes => {
          if (filesRes.success && filesRes.data) {
            const contents: Record<string, string> = {};
            for (const f of filesRes.data.files) {
              if (f.content) contents[f.path] = f.content;
            }
            setFileContents(contents);
            setFiles(filesRes.data.files);
          }
        });
      }

      if (res.data.preview_html) {
        setPreviewHtml(res.data.preview_html);
        setPreviewKey(k => k + 1);
        terminalLog('success', 'Preview updated.');
        showToast(`${changedPaths.length} file${changedPaths.length !== 1 ? 's' : ''} generated — preview updated`);
      }
    } else {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Sorry, something went wrong: ${res.error}`, created_at: new Date().toISOString() }]);
      terminalLog('error', `Generation failed: ${res.error}`);
    }
    setGenerating(false);
  }, [input, generating, projectId, terminalLog]);

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

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'preview-error') {
        terminalLog('error', `Preview error: ${event.data.message}`);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [terminalLog]);

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
        projectId={projectId || ''}
        terminalLines={terminalLines}
        terminalLog={handleTerminalLog}
        terminalClear={terminalClear}
        deployedUrl={deployedUrl}
        deploying={deploying}
        cfConnected={cfConnected}
        onInputChange={setInput}
        onSend={() => handleSend()}
        onSuggestionClick={setInput}
        onRefreshPreview={() => setPreviewKey(k => k + 1)}
        onOpenLive={openInNewTab}
        onBack={() => navigate('/dashboard')}
        onLogout={logout}
        onFileUpdated={handleFileUpdated}
        onFilesChanged={handleFilesChanged}
        onDeployStart={handleDeployStart}
        onDeployEnd={handleDeployEnd}
        onDeploy={handleTopBarDeploy}
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-sm font-medium text-white animate-fade-in z-50"
          style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
          ✓ {toast}
        </div>
      )}
    </>
  );
}
