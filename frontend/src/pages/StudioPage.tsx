import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useTerminal } from '../hooks/useTerminal';
import StudioLayout from '../components/panels/StudioLayout';
import ErrorBridge from '../components/panels/ErrorBridge';
import type { ChatMode, Message } from '../components/panels/ChatPanel';
import { detectModeClient } from '../components/panels/ChatPanel';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface FileData { id: number; path: string; language: string; content?: string; updated_at: string; }
interface Project { id: number; name: string; description: string; subdomain: string; status: string; }

// Guided path types
interface GuidedStep {
  step: number;
  title: string;
  figiSays: string;
  buildPrompt: string;
  designStyle?: string;
  afterExplanation: string;
  conceptsIntroduced: string[];
}

interface GuidedPath {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  duration: string;
  icon: string;
  chapters_covered: string[];
  xp_reward: number;
  steps: GuidedStep[];
}

type GuidedStatus = 'intro' | 'building' | 'explaining' | 'ready_for_next' | 'complete';

interface GuidedState {
  path: GuidedPath;
  currentStep: number;
  status: GuidedStatus;
}

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

  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [cfConnected, setCfConnected] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Chat mode state
  const [chatMode, setChatMode] = useState<ChatMode>('build');
  const [forcedMode, setForcedMode] = useState<ChatMode | null>(null);
  // Learn mode toggle — when ON, build mode auto-explains everything
  const [learnModeEnabled, setLearnModeEnabled] = useState(false);

  // Guided path state
  const [guidedState, setGuidedState] = useState<GuidedState | null>(null);

  // Active file tracking for context
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const { lines: terminalLines, log: terminalLog, clear: terminalClear } = useTerminal();

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

    api.get<{ connected: boolean }>('/api/cloudflare/status').then(res => {
      if (res.success && res.data) setCfConnected(res.data.connected);
    });
    api.get<{ deployments: Array<{ deployment_url: string; status: string }> }>(`/api/projects/${projectId}/deployments`).then(res => {
      if (res.success && res.data) {
        const latest = res.data.deployments.find(d => d.status === 'success');
        if (latest) setDeployedUrl(latest.deployment_url);
      }
    });
  }, [projectId]);

  // Check for guided path from location state
  useEffect(() => {
    const state = location.state as { guidedPath?: GuidedPath } | null;
    if (state?.guidedPath) {
      setGuidedState({
        path: state.guidedPath,
        currentStep: 1,
        status: 'intro',
      });
      // Add Professor Figi intro message
      const step = state.guidedPath.steps[0];
      const introMsgId = Date.now();
      setMessages(prev => [...prev, {
        id: introMsgId,
        role: 'assistant',
        content: `**${state.guidedPath.icon} ${state.guidedPath.name} — Step 1 of ${state.guidedPath.steps.length}: ${step.title}**\n\n${step.figiSays}`,
        created_at: new Date().toISOString(),
        mode: 'learn',
      }]);
    }
  }, []);

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
    terminalLog('success', `Saved: ${path}`);
    if (path === 'index.html') setPreviewHtml(content);
    setPreviewKey(k => k + 1);
    terminalLog('info', 'Preview refreshed.');
    showToast(`Saved ${path.split('/').pop()}`);
  }, [terminalLog]);

  const handleFilesChanged = useCallback(async () => { await refreshFiles(); }, [refreshFiles]);

  const handleTerminalLog = useCallback((type: 'info' | 'success' | 'error' | 'warning' | 'system' | 'command' | 'ai', message: string) => {
    terminalLog(type, message);
  }, [terminalLog]);

  const handleDeployStart = useCallback(() => { setDeploying(true); }, []);
  const handleDeployEnd = useCallback((url: string | null) => {
    setDeploying(false);
    if (url) { setDeployedUrl(url); setCfConnected(true); showToast(`Deployed to ${url}`); }
  }, []);

  const handleTopBarDeploy = useCallback(async () => {
    if (!cfConnected || !projectId) { terminalLog('warning', 'Connect Cloudflare in the Deploy panel first'); return; }
    setDeploying(true);
    terminalLog('command', '> Deploying to Cloudflare Pages...');
    const res = await api.post<{ url: string }>(`/api/projects/${projectId}/deploy`);
    if (res.success && res.data) { terminalLog('success', `Deployed to ${res.data.url}`); setDeployedUrl(res.data.url); showToast(`Deployed to ${res.data.url}`); }
    else { terminalLog('error', `Deploy failed: ${res.error}`); }
    setDeploying(false);
  }, [cfConnected, projectId, terminalLog]);

  // Streaming generation handler with mode support
  const handleSend = useCallback(async (overrideMessage?: string, overrideContext?: { mode?: ChatMode; errorMessage?: string; selectedCode?: string; activeFile?: string }) => {
    const userMsg = (overrideMessage || input).trim();
    if (!userMsg || generating || !projectId) return;
    if (!overrideMessage) setInput('');
    setGenerating(true);

    // Determine mode
    const resolvedMode = overrideContext?.mode || forcedMode || detectModeClient(
      userMsg,
      !!overrideContext?.errorMessage,
      !!overrideContext?.selectedCode
    );
    setChatMode(resolvedMode);
    setForcedMode(null);

    const truncated = userMsg.length > 80 ? userMsg.slice(0, 80) + '...' : userMsg;
    terminalLog('command', `> ${resolvedMode === 'learn' ? 'Ask' : resolvedMode === 'debug' ? 'Debug' : 'Generate'}: "${truncated}"`);
    terminalLog('info', resolvedMode === 'learn' ? 'Professor Figi is thinking...' : resolvedMode === 'debug' ? 'Figi is debugging...' : 'Sending to Figi AI...');

    // Add user message
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userMsg, created_at: new Date().toISOString() }]);

    // Add streaming assistant placeholder
    const assistantMsgId = userMsgId + 1;
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', created_at: new Date().toISOString(), isStreaming: true, mode: resolvedMode }]);

    // Build context for backend
    const contextObj: Record<string, string> = {};
    const ctxFile = overrideContext?.activeFile || activeFile;
    if (ctxFile) {
      contextObj.activeFile = ctxFile;
      if (fileContents[ctxFile]) contextObj.activeFileContent = fileContents[ctxFile];
    }
    if (overrideContext?.errorMessage) contextObj.errorMessage = overrideContext.errorMessage;
    if (overrideContext?.selectedCode) contextObj.selectedCode = overrideContext.selectedCode;

    try {
      const token = localStorage.getItem('figi_studio_token');
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg, mode: resolvedMode, context: contextObj, learnModeEnabled }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(errData.error || 'Generation failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = '';
          let eventData = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            if (line.startsWith('data: ')) eventData = line.slice(6);
          }
          if (!eventType || !eventData) continue;

          try {
            const data = JSON.parse(eventData);
            switch (eventType) {
              case 'start':
                terminalLog('info', resolvedMode === 'learn' ? 'Professor Figi is teaching...' : resolvedMode === 'debug' ? 'Figi is debugging...' : 'Figi is building...');
                break;
              case 'delta':
                accumulatedText += data.text;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedText } : m));
                break;
              case 'complete': {
                const serverMode = data.mode || resolvedMode;
                const changedPaths: string[] = data.generatedFiles || [];
                setMessages(prev => prev.map(m => m.id === assistantMsgId
                  ? { ...m, content: data.message, isStreaming: false, changedFiles: changedPaths, mode: serverMode }
                  : m));
                // Update files and contents (only for build/debug modes with files)
                if (data.files) {
                  const newFiles = data.files as FileData[];
                  setFiles(newFiles);
                  const contents: Record<string, string> = {};
                  for (const f of newFiles) { if (f.content) contents[f.path] = f.content; }
                  setFileContents(contents);
                  const indexFile = newFiles.find((f: FileData) => f.path === 'index.html');
                  if (indexFile?.content) {
                    setPreviewHtml(indexFile.content);
                    setPreviewKey(k => k + 1);
                  }
                }
                if (changedPaths.length > 0) {
                  setRecentlyChanged(new Set(changedPaths));
                  setTimeout(() => setRecentlyChanged(new Set()), 5000);
                  terminalLog('success', `Generated ${changedPaths.length} file${changedPaths.length !== 1 ? 's' : ''}`);
                  changedPaths.forEach(p => terminalLog('info', `  ${p}`));
                  terminalLog('success', 'Preview updated.');
                  showToast(`${changedPaths.length} file${changedPaths.length !== 1 ? 's' : ''} generated`);
                } else if (serverMode === 'learn') {
                  terminalLog('ai', 'Professor Figi responded.');
                }

                // Handle guided path step completion
                if (guidedState && guidedState.status === 'building') {
                  const step = guidedState.path.steps[guidedState.currentStep - 1];
                  // Add after-explanation message
                  const explainMsgId = Date.now() + 2;
                  setTimeout(() => {
                    setMessages(prev => [...prev, {
                      id: explainMsgId,
                      role: 'assistant',
                      content: `${step.afterExplanation}\n\n**Concepts introduced:** ${step.conceptsIntroduced.map(c => `\`${c}\``).join(' · ')}`,
                      created_at: new Date().toISOString(),
                      mode: 'learn',
                    }]);
                    setGuidedState(prev => prev ? {
                      ...prev,
                      status: prev.currentStep >= prev.path.steps.length ? 'complete' : 'ready_for_next',
                    } : null);
                  }, 500);
                }
                break;
              }
              case 'error':
                setMessages(prev => prev.map(m => m.id === assistantMsgId
                  ? { ...m, content: `Error: ${data.message}`, isStreaming: false }
                  : m));
                terminalLog('error', `Generation failed: ${data.message}`);
                break;
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId
        ? { ...m, content: `Error: ${(err as Error).message}`, isStreaming: false }
        : m));
      terminalLog('error', `${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }, [input, generating, projectId, terminalLog, forcedMode, activeFile, fileContents, guidedState]);

  useEffect(() => {
    if (loading || !project || initialPromptSent.current) return;
    const state = location.state as { initialPrompt?: string; designStylePrompt?: string; guidedPath?: GuidedPath } | null;
    if (state?.initialPrompt && !state?.guidedPath) {
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
        setPreviewError(event.data.message);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [terminalLog]);

  const handleFixError = useCallback((errorMsg: string) => {
    handleSend(`Fix this error in my code: ${errorMsg}`, { mode: 'debug', errorMessage: errorMsg });
  }, [handleSend]);

  const handleExplainError = useCallback((errorMsg: string) => {
    handleSend(`Explain this error and teach me why it happened: ${errorMsg}`, { mode: 'learn', errorMessage: errorMsg });
  }, [handleSend]);

  // "Explain This" handlers
  const handleExplainFile = useCallback((filePath: string) => {
    const content = fileContents[filePath] || '';
    handleSend(`Explain what ${filePath} does in my project and how it connects to other files`, {
      mode: 'learn',
      activeFile: filePath,
    });
  }, [handleSend, fileContents]);

  const handleExplainCode = useCallback((code: string, filePath: string) => {
    handleSend(`Explain this code from ${filePath}:\n\`\`\`\n${code}\n\`\`\``, {
      mode: 'learn',
      selectedCode: code,
      activeFile: filePath,
    });
  }, [handleSend]);

  // Ask Professor Figi handlers
  const handleAskFigiAboutFile = useCallback((filePath: string) => {
    handleSend(`Tell me about this file: ${filePath}`, {
      mode: 'learn',
      activeFile: filePath,
    });
  }, [handleSend]);

  const handleAskFigiAboutArchitecture = useCallback(() => {
    handleSend('Explain the architecture of my project — how do the files connect and work together?', {
      mode: 'learn',
    });
  }, [handleSend]);

  const handleAskFigiAboutError = useCallback((errorMsg: string) => {
    handleSend(`Explain this error: ${errorMsg}`, {
      mode: 'learn',
      errorMessage: errorMsg,
    });
  }, [handleSend]);

  // Mode change handler
  const handleModeChange = useCallback((mode: ChatMode) => {
    setForcedMode(mode);
    setChatMode(mode);
  }, []);

  // Guided path handlers
  const handleGuidedSendPrompt = useCallback(() => {
    if (!guidedState) return;
    const step = guidedState.path.steps[guidedState.currentStep - 1];
    const designPrefix = step.designStyle ? `[DESIGN STYLE: ${step.designStyle}]\n\n` : '';
    setGuidedState(prev => prev ? { ...prev, status: 'building' } : null);
    handleSend(designPrefix + step.buildPrompt);
  }, [guidedState, handleSend]);

  const handleGuidedNextStep = useCallback(() => {
    if (!guidedState) return;
    const nextStep = guidedState.currentStep + 1;
    if (nextStep > guidedState.path.steps.length) {
      setGuidedState(prev => prev ? { ...prev, status: 'complete' } : null);
      return;
    }
    const step = guidedState.path.steps[nextStep - 1];
    setGuidedState(prev => prev ? { ...prev, currentStep: nextStep, status: 'intro' } : null);
    // Add Professor Figi intro for next step
    const introMsgId = Date.now();
    setMessages(prev => [...prev, {
      id: introMsgId,
      role: 'assistant',
      content: `**${guidedState.path.icon} Step ${nextStep} of ${guidedState.path.steps.length}: ${step.title}**\n\n${step.figiSays}`,
      created_at: new Date().toISOString(),
      mode: 'learn',
    }]);
  }, [guidedState]);

  const handleActiveFileChange = useCallback((path: string | null) => {
    setActiveFile(path);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🤖</div><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading studio...</p></div>
    </div>
  );

  if (!project) return null;

  return (
    <>
      <StudioLayout
        project={project} messages={messages} files={files} fileContents={fileContents}
        input={input} generating={generating} previewHtml={previewHtml} previewKey={previewKey}
        recentlyChanged={recentlyChanged} userName={user?.name} projectId={projectId || ''}
        terminalLines={terminalLines} terminalLog={handleTerminalLog} terminalClear={terminalClear}
        deployedUrl={deployedUrl} deploying={deploying} cfConnected={cfConnected}
        chatMode={chatMode} onModeChange={handleModeChange}
        learnModeEnabled={learnModeEnabled}
        onLearnModeToggle={setLearnModeEnabled}
        guidedState={guidedState}
        onGuidedSendPrompt={handleGuidedSendPrompt}
        onGuidedNextStep={handleGuidedNextStep}
        onInputChange={setInput} onSend={() => handleSend()} onSuggestionClick={setInput}
        onRefreshPreview={() => setPreviewKey(k => k + 1)} onOpenLive={openInNewTab}
        onBack={() => navigate('/dashboard')} onLogout={logout}
        onFileUpdated={handleFileUpdated} onFilesChanged={handleFilesChanged}
        onDeployStart={handleDeployStart} onDeployEnd={handleDeployEnd} onDeploy={handleTopBarDeploy}
        onExplainFile={handleExplainFile} onExplainCode={handleExplainCode}
        onAskFigiAboutFile={handleAskFigiAboutFile}
        onAskFigiAboutArchitecture={handleAskFigiAboutArchitecture}
        onAskFigiAboutError={handleAskFigiAboutError}
        onActiveFileChange={handleActiveFileChange}
      />
      <ErrorBridge
        errorMessage={previewError}
        onFixIt={handleFixError}
        onExplainError={handleExplainError}
        onDismiss={() => setPreviewError(null)}
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-sm font-medium text-white animate-fade-in z-50"
          style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
          {toast}
        </div>
      )}
    </>
  );
}
