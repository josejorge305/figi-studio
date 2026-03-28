import { useState } from 'react';

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
        existing = { name: part, path: fullPath, isFolder: !isFile, children: [] };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  // Sort: folders first, then alphabetically
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

function TreeItem({ node, depth, selectedFile, recentlyChanged, onFileSelect, expandedFolders, toggleFolder }: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  recentlyChanged: Set<string>;
  onFileSelect: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.path === selectedFile;
  const isChanged = recentlyChanged.has(node.path);

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
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
        </button>
        {isExpanded && node.children.map(child => (
          <TreeItem key={child.path} node={child} depth={depth + 1}
            selectedFile={selectedFile} recentlyChanged={recentlyChanged}
            onFileSelect={onFileSelect} expandedFolders={expandedFolders} toggleFolder={toggleFolder} />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node.path)}
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
      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>🤖</span>
      {isChanged && (
        <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--accent-orange)' }}>new</span>
      )}
    </button>
  );
}

export default function FileExplorer({ files, selectedFile, recentlyChanged, onFileSelect }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Auto-expand all folders on mount when files change
  const tree = buildTree(files);

  return (
    <div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <span className="text-[11px] uppercase tracking-wider font-medium">📁 Files</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="py-1">
          {files.length === 0 ? (
            <p className="px-3 py-4 text-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Generate your first app to see files here
            </p>
          ) : (
            tree.map(node => (
              <TreeItem key={node.path} node={node} depth={0}
                selectedFile={selectedFile} recentlyChanged={recentlyChanged}
                onFileSelect={onFileSelect} expandedFolders={expandedFolders} toggleFolder={toggleFolder} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
