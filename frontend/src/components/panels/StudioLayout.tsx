import { useState, useCallback, useRef, useEffect } from 'react';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import ChatPanel from './ChatPanel';
import PreviewPanel from './PreviewPanel';
import BottomPanel from './BottomPanel';
import type { TerminalLine } from '../../hooks/useTerminal';

type BottomTab = 'editor' | 'anatomy' | 'terminal' | 'learn';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  changedFiles?: string[];
  isStreaming?: boolean;
}

interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  subdomain: string;
  status: string;
}

interface StudioLayoutProps {
  project: Project;
  messages: Message[];
  files: FileData[];
  fileContents: Record<string, string>;
  input: string;
  generating: boolean;
  previewHtml: string | null;
  previewKey: number;
  recentlyChanged: Set<string>;
  userName?: string;
  projectId: string;
  terminalLines: TerminalLine[];
  terminalLog: (type: TerminalLine['type'], message: string) => void;
  terminalClear: () => void;
  deployedUrl: string | null;
  deploying: boolean;
  cfConnected: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestionClick: (text: string) => void;
  onRefreshPreview: () => void;
  onOpenLive: () => void;
  onBack: () => void;
  onLogout: () => void;
  onFileUpdated: (path: string, content: string) => void;
  onFilesChanged: () => void;
  onDeployStart: () => void;
  onDeployEnd: (url: string | null) => void;
  onDeploy: () => void;
}

export default function StudioLayout({
  project, messages, files, fileContents, input, generating,
  previewHtml, previewKey, recentlyChanged, userName, projectId,
  terminalLines, terminalLog, terminalClear,
  deployedUrl, deploying, cfConnected,
  onInputChange, onSend, onSuggestionClick, onRefreshPreview, onOpenLive, onBack, onLogout,
  onFileUpdated, onFilesChanged, onDeployStart, onDeployEnd, onDeploy,
}: StudioLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('editor');
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);
  const [chatWidthPercent, setChatWidthPercent] = useState(40);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);

  const resizingRef = useRef<'sidebar' | 'chat' | 'bottom' | null>(null);
  const resizeStartRef = useRef({ x: 0, y: 0, value: 0 });
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      if (w < 1024) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFileSelect = useCallback((path: string) => {
    setSelectedFile(path);
    setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
    setActiveBottomTab('editor');
    if (bottomPanelCollapsed) setBottomPanelCollapsed(false);
  }, [bottomPanelCollapsed]);

  const handleFileClose = useCallback((path: string) => {
    setOpenFiles(prev => {
      const next = prev.filter(p => p !== path);
      if (selectedFile === path) {
        setSelectedFile(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  }, [selectedFile]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    if (resizingRef.current === 'sidebar') {
      setSidebarWidth(Math.min(400, Math.max(200, resizeStartRef.current.value + (e.clientX - resizeStartRef.current.x))));
    } else if (resizingRef.current === 'chat' && mainAreaRef.current) {
      const rect = mainAreaRef.current.getBoundingClientRect();
      setChatWidthPercent(Math.min(70, Math.max(30, ((e.clientX - rect.left) / rect.width) * 100)));
    } else if (resizingRef.current === 'bottom' && mainAreaRef.current) {
      const rect = mainAreaRef.current.getBoundingClientRect();
      setBottomPanelHeight(Math.min(rect.height * 0.6, Math.max(36, rect.bottom - e.clientY)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.getElementById('resize-overlay')?.remove();
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  const startResize = (type: 'sidebar' | 'chat' | 'bottom', e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = type;
    resizeStartRef.current = { x: e.clientX, y: e.clientY, value: type === 'sidebar' ? sidebarWidth : type === 'bottom' ? bottomPanelHeight : chatWidthPercent };
    document.body.style.cursor = type === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    const overlay = document.createElement('div');
    overlay.id = 'resize-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:inherit;';
    document.body.appendChild(overlay);
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <TopBar
        projectName={project.name}
        projectStatus={project.status}
        userName={userName}
        previewHtml={previewHtml}
        deployedUrl={deployedUrl}
        deploying={deploying}
        cfConnected={cfConnected}
        onBack={onBack}
        onOpenLive={onOpenLive}
        onLogout={onLogout}
        onDeploy={onDeploy}
      />

      <div className="flex flex-1 overflow-hidden">
        {!isMobile || !sidebarCollapsed ? (
          <LeftSidebar
            collapsed={sidebarCollapsed || isMobile}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            files={files}
            selectedFile={selectedFile}
            recentlyChanged={recentlyChanged}
            onFileSelect={handleFileSelect}
            width={sidebarWidth}
            onResizeStart={(e) => startResize('sidebar', e)}
            projectId={projectId}
            onFilesChanged={onFilesChanged}
            terminalLog={terminalLog}
            onDeployStart={onDeployStart}
            onDeployEnd={onDeployEnd}
          />
        ) : null}

        <div ref={mainAreaRef} className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 flex overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
            <div style={{ width: isMobile ? '100%' : `${chatWidthPercent}%`, height: isMobile ? '50%' : '100%' }}>
              <ChatPanel messages={messages} input={input} generating={generating}
                onInputChange={onInputChange} onSend={onSend} onSuggestionClick={onSuggestionClick} />
            </div>
            {!isMobile && (
              <div onMouseDown={(e) => startResize('chat', e)}
                className="w-1 shrink-0 cursor-col-resize" style={{ background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-orange)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
            )}
            <div className="flex-1" style={{ height: isMobile ? '50%' : '100%' }}>
              <PreviewPanel previewHtml={previewHtml} previewKey={previewKey} generating={generating}
                files={files} fileContents={fileContents}
                onRefresh={onRefreshPreview} onOpenLive={onOpenLive} />
            </div>
          </div>

          <BottomPanel
            activeTab={activeBottomTab} onTabChange={setActiveBottomTab}
            collapsed={bottomPanelCollapsed || isMobile}
            onToggleCollapse={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
            height={bottomPanelHeight} onResizeStart={(e) => startResize('bottom', e)}
            openFiles={openFiles} selectedFile={selectedFile}
            files={files} fileContents={fileContents} projectId={projectId}
            onFileSelect={handleFileSelect} onFileClose={handleFileClose}
            onFileUpdated={onFileUpdated}
            terminalLines={terminalLines} terminalClear={terminalClear}
          />
        </div>
      </div>
    </div>
  );
}
