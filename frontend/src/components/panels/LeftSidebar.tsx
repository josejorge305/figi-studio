import FileExplorer from './FileExplorer';
import GitPanel from './GitPanel';
import CloudflarePanel from './CloudflarePanel';

interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface LeftSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  files: FileData[];
  selectedFile: string | null;
  recentlyChanged: Set<string>;
  onFileSelect: (path: string) => void;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
}

export default function LeftSidebar({ collapsed, onToggle, files, selectedFile, recentlyChanged, onFileSelect, width, onResizeStart }: LeftSidebarProps) {
  return (
    <div className="relative shrink-0 flex" style={{ width: collapsed ? 48 : width }}>
      <div className="flex-1 flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', transition: collapsed ? 'width 0.2s' : undefined }}>
        {/* Toggle button */}
        <button onClick={onToggle}
          className="flex items-center justify-center shrink-0 transition-colors"
          style={{ height: 'var(--topbar-height)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span className="text-sm">{collapsed ? '☰' : '✕'}</span>
          {!collapsed && <span className="ml-2 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Explorer</span>}
        </button>

        {collapsed ? (
          /* Icon rail */
          <div className="flex flex-col items-center gap-1 pt-2">
            <button onClick={onToggle} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors" title="Files"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              📁
            </button>
            <button onClick={onToggle} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors" title="Git"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              🌿
            </button>
            <button onClick={onToggle} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors" title="Deploy"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              ☁️
            </button>
          </div>
        ) : (
          /* Full sidebar content */
          <div className="flex-1 overflow-y-auto">
            <FileExplorer files={files} selectedFile={selectedFile}
              recentlyChanged={recentlyChanged} onFileSelect={onFileSelect} />
            <GitPanel />
            <CloudflarePanel />
          </div>
        )}
      </div>

      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={onResizeStart}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-10"
          style={{ background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-orange)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      )}
    </div>
  );
}
