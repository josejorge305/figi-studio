import EditorPanel from './EditorPanel';
import AnatomyPanel from './AnatomyPanel';
import TerminalPanel from './TerminalPanel';
import LearnPanel from './LearnPanel';
import type { TerminalLine } from '../../hooks/useTerminal';

type BottomTab = 'editor' | 'anatomy' | 'terminal' | 'learn';

interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface BottomPanelProps {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  height: number;
  onResizeStart: (e: React.MouseEvent) => void;
  openFiles: string[];
  selectedFile: string | null;
  files: FileData[];
  fileContents: Record<string, string>;
  projectId: string;
  onFileSelect: (path: string) => void;
  onFileClose: (path: string) => void;
  onFileUpdated: (path: string, content: string) => void;
  terminalLines: TerminalLine[];
  terminalClear: () => void;
  onExplainCode?: (code: string, filePath: string) => void;
  onAskFigiAboutFile?: (path: string) => void;
  onAskFigiAboutArchitecture?: () => void;
  onAskFigiAboutError?: (error: string) => void;
}

const TABS: { key: BottomTab; icon: string; label: string }[] = [
  { key: 'editor', icon: '📝', label: 'Editor' },
  { key: 'anatomy', icon: '🏗️', label: 'Anatomy' },
  { key: 'terminal', icon: '⬛', label: 'Terminal' },
  { key: 'learn', icon: '🎓', label: 'Learn' },
];

export default function BottomPanel({
  activeTab, onTabChange, collapsed, onToggleCollapse, height, onResizeStart,
  openFiles, selectedFile, files, fileContents, projectId,
  onFileSelect, onFileClose, onFileUpdated,
  terminalLines, terminalClear,
  onExplainCode, onAskFigiAboutFile, onAskFigiAboutArchitecture, onAskFigiAboutError,
}: BottomPanelProps) {
  const tabBarHeight = 36;

  const handleTabClick = (tab: BottomTab) => {
    if (tab === activeTab && !collapsed) {
      onToggleCollapse();
    } else {
      if (collapsed) onToggleCollapse();
      onTabChange(tab);
    }
  };

  // Get last error from terminal for "Ask Figi about this error" button
  const lastError = terminalLines.slice().reverse().find(l => l.type === 'error')?.message;

  return (
    <div className="shrink-0 flex flex-col" style={{ height: collapsed ? tabBarHeight : height, borderTop: '1px solid var(--border-color)' }}>
      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={onResizeStart}
          className="h-1 cursor-row-resize shrink-0"
          style={{ background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-orange)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      )}

      {/* Tab bar */}
      <div className="flex items-center shrink-0" style={{ height: tabBarHeight, background: 'var(--panel-header-bg)', borderBottom: collapsed ? 'none' : '1px solid var(--border-color)' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => handleTabClick(tab.key)}
            className="flex items-center gap-1.5 px-4 transition-colors"
            style={{
              height: '100%',
              fontSize: '12px',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key && !collapsed ? '2px solid var(--accent-orange)' : '2px solid transparent',
              background: activeTab === tab.key && !collapsed ? 'var(--tab-active-bg)' : 'var(--tab-inactive-bg)',
            }}>
            <span className="text-[11px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}

        {/* Ask Figi buttons */}
        <div className="flex-1" />
        {!collapsed && activeTab === 'editor' && selectedFile && onAskFigiAboutFile && (
          <button
            onClick={() => onAskFigiAboutFile(selectedFile)}
            className="flex items-center gap-1 px-2 py-1 mr-2 rounded text-[10px] transition-colors"
            style={{ color: '#a855f7', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.08)'}>
            🎓 Ask Figi
          </button>
        )}
        {!collapsed && activeTab === 'anatomy' && onAskFigiAboutArchitecture && (
          <button
            onClick={onAskFigiAboutArchitecture}
            className="flex items-center gap-1 px-2 py-1 mr-2 rounded text-[10px] transition-colors"
            style={{ color: '#a855f7', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.08)'}>
            🎓 Ask Figi
          </button>
        )}
        {!collapsed && activeTab === 'terminal' && lastError && onAskFigiAboutError && (
          <button
            onClick={() => onAskFigiAboutError(lastError)}
            className="flex items-center gap-1 px-2 py-1 mr-2 rounded text-[10px] transition-colors"
            style={{ color: '#a855f7', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.08)'}>
            🎓 Ask Figi
          </button>
        )}
      </div>

      {/* Panel content */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' && (
            <EditorPanel
              openFiles={openFiles}
              selectedFile={selectedFile}
              files={files}
              fileContents={fileContents}
              projectId={projectId}
              onFileSelect={onFileSelect}
              onFileClose={onFileClose}
              onFileUpdated={onFileUpdated}
              onExplainCode={onExplainCode}
            />
          )}
          {activeTab === 'anatomy' && (
            <AnatomyPanel
              files={files}
              fileContents={fileContents}
              onFileSelected={onFileSelect}
            />
          )}
          {activeTab === 'terminal' && (
            <TerminalPanel
              lines={terminalLines}
              onClear={terminalClear}
            />
          )}
          {activeTab === 'learn' && <LearnPanel files={files} fileContents={fileContents} selectedFile={selectedFile} />}
        </div>
      )}
    </div>
  );
}
