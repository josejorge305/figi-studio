import { useState, useCallback, useRef, useEffect } from 'react';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import ChatPanel from './ChatPanel';
import PreviewPanel from './PreviewPanel';
import BottomPanel from './BottomPanel';

type BottomTab = 'editor' | 'anatomy' | 'terminal' | 'learn';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  changedFiles?: string[];
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
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestionClick: (text: string) => void;
  onRefreshPreview: () => void;
  onOpenLive: () => void;
  onBack: () => void;
  onLogout: () => void;
}

export default function StudioLayout({
  project, messages, files, fileContents, input, generating,
  previewHtml, previewKey, recentlyChanged, userName,
  onInputChange, onSend, onSuggestionClick, onRefreshPreview, onOpenLive, onBack, onLogout,
}: StudioLayoutProps) {
  // Layout state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('editor');
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);
  const [chatWidthPercent, setChatWidthPercent] = useState(40);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);

  // Resize refs
  const resizingRef = useRef<'sidebar' | 'chat' | 'bottom' | null>(null);
  const resizeStartRef = useRef({ x: 0, y: 0, value: 0 });
  const mainAreaRef = useRef<HTMLDivElement>(null);

  // Responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      if (w < 768) setSidebarCollapsed(true);
      if (w >= 768 && w < 1024) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // File selection handler
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

  // Resize handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;

    if (resizingRef.current === 'sidebar') {
      const newWidth = Math.min(400, Math.max(200, resizeStartRef.current.value + (e.clientX - resizeStartRef.current.x)));
      setSidebarWidth(newWidth);
    } else if (resizingRef.current === 'chat' && mainAreaRef.current) {
      const rect = mainAreaRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setChatWidthPercent(Math.min(70, Math.max(30, pct)));
    } else if (resizingRef.current === 'bottom' && mainAreaRef.current) {
      const rect = mainAreaRef.current.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      const maxHeight = rect.height * 0.6;
      setBottomPanelHeight(Math.min(maxHeight, Math.max(36, newHeight)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Remove the overlay iframe blocker
    const blocker = document.getElementById('resize-overlay');
    if (blocker) blocker.remove();
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startResize = (type: 'sidebar' | 'chat' | 'bottom', e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = type;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      value: type === 'sidebar' ? sidebarWidth : type === 'bottom' ? bottomPanelHeight : chatWidthPercent,
    };
    document.body.style.cursor = type === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    // Add overlay to prevent iframe from stealing mouse events
    const overlay = document.createElement('div');
    overlay.id = 'resize-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:inherit;';
    document.body.appendChild(overlay);
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <TopBar
        projectName={project.name}
        projectStatus={project.status}
        userName={userName}
        previewHtml={previewHtml}
        onBack={onBack}
        onOpenLive={onOpenLive}
        onLogout={onLogout}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
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
          />
        ) : null}

        {/* Center: Chat + Preview + Bottom Panel */}
        <div ref={mainAreaRef} className="flex-1 flex flex-col overflow-hidden">
          {/* Top section: Chat + Preview */}
          <div className={`flex-1 flex overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
            {/* Chat */}
            <div style={{ width: isMobile ? '100%' : `${chatWidthPercent}%`, height: isMobile ? '50%' : '100%' }}>
              <ChatPanel
                messages={messages}
                input={input}
                generating={generating}
                onInputChange={onInputChange}
                onSend={onSend}
                onSuggestionClick={onSuggestionClick}
              />
            </div>

            {/* Chat/Preview resize handle */}
            {!isMobile && (
              <div
                onMouseDown={(e) => startResize('chat', e)}
                className="w-1 shrink-0 cursor-col-resize"
                style={{ background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-orange)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              />
            )}

            {/* Preview */}
            <div className="flex-1" style={{ height: isMobile ? '50%' : '100%' }}>
              <PreviewPanel
                previewHtml={previewHtml}
                previewKey={previewKey}
                generating={generating}
                onRefresh={onRefreshPreview}
                onOpenLive={onOpenLive}
              />
            </div>
          </div>

          {/* Bottom panel */}
          <BottomPanel
            activeTab={activeBottomTab}
            onTabChange={setActiveBottomTab}
            collapsed={bottomPanelCollapsed || isMobile}
            onToggleCollapse={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
            height={bottomPanelHeight}
            onResizeStart={(e) => startResize('bottom', e)}
            openFiles={openFiles}
            selectedFile={selectedFile}
            files={files}
            fileContents={fileContents}
            onFileSelect={handleFileSelect}
            onFileClose={handleFileClose}
          />
        </div>
      </div>
    </div>
  );
}
