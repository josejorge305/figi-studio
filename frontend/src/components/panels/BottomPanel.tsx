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
          {activeTab === 'learn' && <LearnPanel files={files} />}
        </div>
      )}
    </div>
  );
}
