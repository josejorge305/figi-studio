import { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import { getBadgeForPath } from '../../data/curriculumMap';

interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface FileExplorerProps {
  files: FileData[];
  selectedFile: string | null;
  recentlyChanged: Set<string>;
  onFileSelect: (path: string) => void;
  projectId: string;
  onFilesChanged: () => void;
  onExplainFile?: (path: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  html: '🌐', jsx: '⚛️', tsx: '⚛️', js: '⚡', ts: '⚡',
  css: '🎨', sql: '🗃️', json: '📦', toml: '⚙️', md: '📝',
};

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  fileData?: FileData;
}

function buildTree(files: FileData[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      let existing = current.find(n => n.name === part && n.isFolder === !isFile);
      if (!existing) {
        existing = { name: part, path: fullPath, isFolder: !isFile, children: [], fileData: isFile ? file : undefined };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}

// Context menu component
function ContextMenu({ x, y, node, projectId, onFilesChanged, onFileSelect, onClose, onExplainFile }: {
  x: number;
  y: number;
  node: TreeNode | null; // null = root level
  projectId: string;
  onFilesChanged: () => void;
  onFileSelect: (path: string) => void;
  onClose: () => void;
  onExplainFile?: (path: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  useEffect(() => {
    if ((showNewFileInput || showRenameInput) && inputRef.current) {
      inputRef.current.focus();
      if (showRenameInput) inputRef.current.select();
    }
  }, [showNewFileInput, showRenameInput]);

  const handleNewFile = async () => {
    if (!inputValue.trim()) return;
    const folder = node?.isFolder ? node.path : (node ? node.path.substring(0, node.path.lastIndexOf('/')) : '');
    const newPath = folder ? `${folder}/${inputValue.trim()}` : inputValue.trim();

    const res = await api.post(`/api/projects/${projectId}/files`, { path: newPath, content: '' });
    if (res.success) {
      onFilesChanged();
      onFileSelect(newPath);
      onClose();
    }
  };

  const handleRename = async () => {
    if (!inputValue.trim() || !node?.fileData) return;
    const folder = node.path.substring(0, node.path.lastIndexOf('/'));
    const newPath = folder ? `${folder}/${inputValue.trim()}` : inputValue.trim();

    const res = await api.patch(`/api/projects/${projectId}/files/${node.fileData.id}`, { path: newPath });
    if (res.success) {
      onFilesChanged();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!node?.fileData) return;
    const res = await api.delete(`/api/projects/${projectId}/files/${node.fileData.id}`);
    if (res.success) {
      onFilesChanged();
      onClose();
    }
  };

  const handleCopyPath = () => {
    if (node) navigator.clipboard.writeText(node.path);
    onClose();
  };

  // Adjust position to stay within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 9999,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    minWidth: 180,
    overflow: 'hidden',
  };

  if (showNewFileInput) {
    return (
      <div ref={menuRef} style={style} className="p-2">
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>New file name:</p>
        <input ref={inputRef}
          value={inputValue} onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleNewFile(); if (e.key === 'Escape') onClose(); }}
          className="w-full px-2 py-1 rounded text-[12px]"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
          placeholder="filename.ext"
        />
      </div>
    );
  }

  if (showRenameInput) {
    return (
      <div ref={menuRef} style={style} className="p-2">
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Rename to:</p>
        <input ref={inputRef}
          value={inputValue} onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') onClose(); }}
          className="w-full px-2 py-1 rounded text-[12px]"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
        />
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div ref={menuRef} style={style} className="p-3">
        <p className="text-[12px] mb-2" style={{ color: 'var(--text-primary)' }}>
          Delete <strong>{node?.name}</strong>?
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-2 py-1 rounded text-[11px]"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
            Cancel
          </button>
          <button onClick={handleDelete}
            className="px-2 py-1 rounded text-[11px]"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            Delete
          </button>
        </div>
      </div>
    );
  }

  const isFile = node && !node.isFolder;
  const isIndexHtml = node?.path === 'index.html';

  return (
    <div ref={menuRef} style={style}>
      {isFile && (
        <MenuItem label="Open in Editor" onClick={() => { onFileSelect(node.path); onClose(); }} />
      )}
      {isFile && onExplainFile && (
        <MenuItem label="🎓 Explain This File" onClick={() => { onExplainFile(node.path); onClose(); }} />
      )}
      <MenuItem label="New File..." onClick={() => setShowNewFileInput(true)} />
      {isFile && (
        <MenuItem label="Rename..." onClick={() => { setInputValue(node.name); setShowRenameInput(true); }} />
      )}
      {isFile && !isIndexHtml && (
        <MenuItem label="Delete" onClick={() => setShowDeleteConfirm(true)} destructive />
      )}
      {isFile && (
        <MenuItem label="Copy Path" onClick={handleCopyPath} />
      )}
    </div>
  );
}

function MenuItem({ label, onClick, destructive }: { label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-[12px] transition-colors flex items-center"
      style={{ color: destructive ? '#ef4444' : 'var(--text-primary)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
        e.currentTarget.style.borderLeft = '2px solid var(--accent-orange)';
        e.currentTarget.style.paddingLeft = '10px';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderLeft = 'none';
        e.currentTarget.style.paddingLeft = '12px';
      }}
    >
      {label}
    </button>
  );
}

function TreeItem({ node, depth, selectedFile, recentlyChanged, onFileSelect, expandedFolders, toggleFolder, onContextMenu }: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  recentlyChanged: Set<string>;
  onFileSelect: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.path === selectedFile;
  const isChanged = recentlyChanged.has(node.path);

  const badge = getBadgeForPath(node.isFolder ? node.name : node.path);

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
          onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
          className="w-full flex items-center gap-1.5 py-1 px-2 text-left transition-colors"
          style={{
            paddingLeft: `${depth * 12 + 8}px`,
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isExpanded ? '▼' : '▶'}</span>
          <span>📁</span>
          <span>{node.name}</span>
          {badge && (
            <span className="text-[9px] px-1.5 rounded shrink-0" style={{
              background: `${badge.color}22`, color: badge.color,
              lineHeight: '16px', height: '16px',
            }}>{badge.label}</span>
          )}
        </button>
        {isExpanded && node.children.map(child => (
          <TreeItem key={child.path} node={child} depth={depth + 1}
            selectedFile={selectedFile} recentlyChanged={recentlyChanged}
            onFileSelect={onFileSelect} expandedFolders={expandedFolders}
            toggleFolder={toggleFolder} onContextMenu={onContextMenu} />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
      className="w-full flex items-center gap-1.5 py-1 px-2 text-left transition-colors"
      style={{
        paddingLeft: `${depth * 12 + 8}px`,
        background: isSelected ? 'var(--bg-tertiary)' : isChanged ? 'rgba(249,115,22,0.06)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--accent-orange)' : '2px solid transparent',
        fontSize: '13px',
        fontFamily: "'JetBrains Mono', monospace",
        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isChanged ? 'rgba(249,115,22,0.06)' : 'transparent'; }}
    >
      <span className="text-xs">{getFileIcon(node.path)}</span>
      <span className="flex-1 truncate">{node.name}</span>
      {badge && (
        <span className="text-[9px] px-1.5 rounded shrink-0" style={{
          background: `${badge.color}22`, color: badge.color,
          lineHeight: '16px', height: '16px',
        }}>{badge.label}</span>
      )}
      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>🤖</span>
      {isChanged && (
        <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--accent-orange)' }}>new</span>
      )}
    </button>
  );
}

export default function FileExplorer({ files, selectedFile, recentlyChanged, onFileSelect, projectId, onFilesChanged, onExplainFile }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode | null } | null>(null);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: null });
  };

  const handleNewFileButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({ x: rect.left, y: rect.bottom + 4, node: null });
  };

  const tree = buildTree(files);

  return (
    <div>
      <div className="flex items-center justify-between"
        style={{ background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => setCollapsed(!collapsed)}
          className="flex-1 flex items-center justify-between px-3 py-2 transition-colors"
          style={{ color: 'var(--text-secondary)' }}>
          <span className="text-[11px] uppercase tracking-wider font-medium">📁 Files</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{collapsed ? '▶' : '▼'}</span>
        </button>
        {!collapsed && (
          <button onClick={handleNewFileButton}
            className="px-2 py-1 mr-1 rounded text-[12px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="New file">
            +
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="py-1" onContextMenu={handleRootContextMenu}>
          {files.length === 0 ? (
            <p className="px-3 py-4 text-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Generate your first app to see files here
            </p>
          ) : (
            tree.map(node => (
              <TreeItem key={node.path} node={node} depth={0}
                selectedFile={selectedFile} recentlyChanged={recentlyChanged}
                onFileSelect={onFileSelect} expandedFolders={expandedFolders}
                toggleFolder={toggleFolder} onContextMenu={handleContextMenu} />
            ))
          )}
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          projectId={projectId}
          onFilesChanged={onFilesChanged}
          onFileSelect={onFileSelect}
          onClose={() => setContextMenu(null)}
          onExplainFile={onExplainFile}
        />
      )}
    </div>
  );
}
