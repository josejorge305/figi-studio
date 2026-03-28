interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface EditorPanelProps {
  openFiles: string[];
  selectedFile: string | null;
  files: FileData[];
  fileContents: Record<string, string>;
  onFileSelect: (path: string) => void;
  onFileClose: (path: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  html: '🌐', jsx: '⚛️', tsx: '⚛️', js: '⚡', ts: '⚡',
  css: '🎨', sql: '🗃️', json: '📦', toml: '⚙️', md: '📝',
};

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
}

export default function EditorPanel({ openFiles, selectedFile, fileContents, onFileSelect, onFileClose }: EditorPanelProps) {
  const content = selectedFile ? fileContents[selectedFile] : null;

  if (openFiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-3xl mb-3">📝</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Click a file in the explorer to view it here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* File tabs */}
      <div className="flex items-center overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        {openFiles.map(path => {
          const name = path.split('/').pop() || path;
          const isActive = path === selectedFile;
          return (
            <div key={path}
              className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer shrink-0"
              style={{
                background: isActive ? 'var(--bg-primary)' : 'transparent',
                borderBottom: isActive ? '2px solid var(--accent-orange)' : '2px solid transparent',
                borderRight: '1px solid var(--border-color)',
              }}
              onClick={() => onFileSelect(path)}>
              <span className="text-[10px]">{getFileIcon(path)}</span>
              <span className="text-[12px]" style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>{name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onFileClose(path); }}
                className="text-[10px] ml-1 rounded w-4 h-4 flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto p-0">
        {content !== undefined && content !== null ? (
          <div className="flex min-h-full">
            {/* Line numbers */}
            <div className="shrink-0 py-3 px-2 text-right select-none"
              style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.6', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', minWidth: 40 }}>
              {content.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Code */}
            <pre className="flex-1 py-3 px-4 m-0 overflow-x-auto"
              style={{ color: 'var(--text-primary)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.6', tabSize: 2 }}>
              {content}
            </pre>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading file content...</p>
          </div>
        )}
      </div>
    </div>
  );
}
