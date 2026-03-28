import { useState, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { api } from '../../utils/api';

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
  projectId: string;
  onFileSelect: (path: string) => void;
  onFileClose: (path: string) => void;
  onFileUpdated: (path: string, content: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  html: '🌐', jsx: '⚛️', tsx: '⚛️', js: '⚡', ts: '⚡',
  css: '🎨', sql: '🗃️', json: '📦', toml: '⚙️', md: '📝',
};

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
}

function getMonacoLanguage(langOrPath: string): string {
  const map: Record<string, string> = {
    'html': 'html', 'htm': 'html',
    'css': 'css', 'scss': 'scss',
    'javascript': 'javascript', 'js': 'javascript', 'jsx': 'javascript',
    'typescript': 'typescript', 'ts': 'typescript', 'tsx': 'typescript',
    'json': 'json',
    'markdown': 'markdown', 'md': 'markdown',
    'sql': 'sql',
    'python': 'python', 'py': 'python',
    'toml': 'ini',
    'yaml': 'yaml', 'yml': 'yaml',
    'xml': 'xml', 'svg': 'xml',
    'shell': 'shell', 'sh': 'shell', 'bash': 'shell',
    'plaintext': 'plaintext', 'txt': 'plaintext',
  };
  if (map[langOrPath]) return map[langOrPath];
  const ext = langOrPath.split('.').pop()?.toLowerCase() || '';
  return map[ext] || 'plaintext';
}

export default function EditorPanel({
  openFiles, selectedFile, files, fileContents, projectId,
  onFileSelect, onFileClose, onFileUpdated,
}: EditorPanelProps) {
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [savingFile, setSavingFile] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  const activeFileData = files.find(f => f.path === selectedFile);
  const displayContent = selectedFile
    ? (editedContent[selectedFile] ?? fileContents[selectedFile] ?? '')
    : '';
  const language = getMonacoLanguage(activeFileData?.language || selectedFile || '');

  const handleSaveFile = useCallback(async (filePath: string) => {
    if (!filePath || !projectId) return;
    const fileData = files.find(f => f.path === filePath);
    if (!fileData?.id) return;
    const newContent = editedContent[filePath];
    if (newContent === undefined) return;

    setSavingFile(filePath);
    try {
      const res = await api.put(`/api/projects/${projectId}/files/${fileData.id}`, { content: newContent });
      if (!res.success) throw new Error(res.error || 'Failed to save');

      onFileUpdated(filePath, newContent);

      setUnsavedFiles(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
      setEditedContent(prev => {
        const next = { ...prev };
        delete next[filePath];
        return next;
      });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSavingFile(null);
    }
  }, [projectId, files, editedContent, onFileUpdated]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (selectedFile) handleSaveFile(selectedFile);
    });

    monaco.editor.defineTheme('figi-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1a1d27',
        'editor.foreground': '#e4e4e7',
        'editorLineNumber.foreground': '#6b7280',
        'editorLineNumber.activeForeground': '#9ca3af',
        'editor.lineHighlightBackground': '#252830',
        'editor.selectionBackground': '#3a3d4755',
        'editorCursor.foreground': '#f97316',
      },
    });
    monaco.editor.setTheme('figi-dark');
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (unsavedFiles.has(path)) {
      if (!confirm(`"${path.split('/').pop()}" has unsaved changes. Close anyway?`)) return;
    }
    setEditedContent(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setUnsavedFiles(prev => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
    onFileClose(path);
  };

  if (openFiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: '#1a1d27' }}>
        <span className="text-3xl mb-3">📝</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Click a file in the explorer to view it here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#1a1d27' }}>
      {/* File tabs */}
      <div className="flex items-center overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        {openFiles.map(path => {
          const name = path.split('/').pop() || path;
          const isActive = path === selectedFile;
          const isUnsaved = unsavedFiles.has(path);
          const isSaving = savingFile === path;
          return (
            <div key={path}
              className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer shrink-0"
              style={{
                background: isActive ? '#1a1d27' : 'transparent',
                borderBottom: isActive ? '2px solid var(--accent-orange)' : '2px solid transparent',
                borderRight: '1px solid var(--border-color)',
              }}
              onClick={() => onFileSelect(path)}>
              <span className="text-[10px]">{getFileIcon(path)}</span>
              <span className="text-[12px]" style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>{name}</span>
              {isSaving && (
                <span className="text-[10px] animate-spin" style={{ color: 'var(--accent-orange)' }}>⟳</span>
              )}
              {isUnsaved && !isSaving && (
                <span className="text-[10px]" style={{ color: 'var(--accent-orange)' }}>●</span>
              )}
              <button
                onClick={(e) => handleCloseTab(path, e)}
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

      {/* Monaco Editor */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={displayContent}
          theme="vs-dark"
          onChange={(value) => {
            if (value !== undefined && selectedFile) {
              setEditedContent(prev => ({ ...prev, [selectedFile]: value }));
              setUnsavedFiles(prev => new Set(prev).add(selectedFile));
            }
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
            renderWhitespace: 'none',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            contextmenu: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
          onMount={handleEditorMount}
        />
        {/* Save hint */}
        {selectedFile && unsavedFiles.has(selectedFile) && (
          <div className="absolute bottom-3 right-4 px-2 py-1 rounded text-[11px]"
            style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--accent-orange)', border: '1px solid rgba(249,115,22,0.3)' }}>
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S to save
          </div>
        )}
      </div>
    </div>
  );
}
