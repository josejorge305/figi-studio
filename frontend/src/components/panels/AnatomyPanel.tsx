import { useMemo, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface AnatomyPanelProps {
  files: FileData[];
  fileContents: Record<string, string>;
  onFileSelected: (path: string) => void;
}

interface AnatomyData {
  frontendFiles: { name: string; path: string; type: 'component' | 'page' | 'style' | 'util' | 'config' }[];
  backendFiles: { name: string; path: string; type: 'route' | 'worker' | 'middleware' | 'util' }[];
  databaseFiles: { name: string; path: string; tables: string[] }[];
  staticFiles: { name: string; path: string; type: 'html' | 'json' | 'config' | 'other' }[];
}

function analyzeProjectFiles(files: FileData[], fileContents: Record<string, string>): AnatomyData {
  const result: AnatomyData = {
    frontendFiles: [],
    backendFiles: [],
    databaseFiles: [],
    staticFiles: [],
  };

  for (const file of files) {
    const path = file.path.toLowerCase();
    const name = file.path.split('/').pop() || file.path;
    const content = fileContents[file.path] || file.content || '';

    if (path.endsWith('.jsx') || path.endsWith('.tsx')) {
      const isPage = path.includes('page') || path.includes('view') || path.includes('screen');
      const isUtil = path.includes('util') || path.includes('hook') || path.includes('context');
      result.frontendFiles.push({
        name, path: file.path,
        type: isPage ? 'page' : isUtil ? 'util' : 'component',
      });
    } else if (path.endsWith('.css') || path.endsWith('.scss')) {
      result.frontendFiles.push({ name, path: file.path, type: 'style' });
    } else if (
      path.includes('api') || path.includes('worker') || path.includes('server') ||
      path.includes('route') || path.includes('handler') ||
      (content && (
        content.includes('router.') ||
        content.includes('app.get') ||
        content.includes('app.post') ||
        content.includes("addEventListener('fetch")
      ))
    ) {
      const isMiddleware = path.includes('middleware') || path.includes('auth');
      const routeMatches = content?.match(/(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi) || [];
      result.backendFiles.push({
        name, path: file.path,
        type: isMiddleware ? 'middleware' : routeMatches.length > 0 ? 'route' : 'worker',
      });
    } else if (
      path.endsWith('.sql') ||
      (content && (
        content.includes('CREATE TABLE') ||
        content.includes('D1Database') ||
        content.includes('.prepare(')
      ))
    ) {
      const tableMatches = content?.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi) || [];
      const tables = tableMatches.map(m => m.replace(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i, ''));
      result.databaseFiles.push({ name, path: file.path, tables });
    } else if (path === 'index.html' || path.endsWith('.json') || path.includes('config') || path.endsWith('.toml')) {
      result.staticFiles.push({
        name, path: file.path,
        type: path.endsWith('.html') ? 'html' : path.endsWith('.json') ? 'json' : 'config',
      });
    } else {
      result.frontendFiles.push({ name, path: file.path, type: 'util' });
    }
  }

  return result;
}

function generateDiagramNodes(anatomy: AnatomyData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Frontend group
  if (anatomy.frontendFiles.length > 0) {
    nodes.push({
      id: 'frontend-group',
      type: 'group',
      position: { x: 0, y: 0 },
      data: { label: '🎨 Frontend' },
      style: {
        background: 'rgba(34, 197, 94, 0.08)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        width: 220,
        height: Math.max(120, anatomy.frontendFiles.length * 36 + 60),
      },
    });

    anatomy.frontendFiles.forEach((file, i) => {
      const icon = file.type === 'component' ? '⚛️' :
                   file.type === 'page' ? '📄' :
                   file.type === 'style' ? '🎨' : '🔧';
      nodes.push({
        id: `frontend-${i}`,
        position: { x: 16, y: 40 + i * 36 },
        parentId: 'frontend-group',
        data: { label: `${icon} ${file.name}`, filePath: file.path },
        style: {
          background: '#1a1d27',
          border: '1px solid #2a2d37',
          borderRadius: '6px',
          color: '#22c55e',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '6px 10px',
          cursor: 'pointer',
          width: 188,
        },
      });
    });
  }

  // Backend group
  if (anatomy.backendFiles.length > 0) {
    nodes.push({
      id: 'backend-group',
      type: 'group',
      position: { x: 300, y: 0 },
      data: { label: '⚡ Backend' },
      style: {
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        width: 220,
        height: Math.max(120, anatomy.backendFiles.length * 36 + 60),
      },
    });

    anatomy.backendFiles.forEach((file, i) => {
      const icon = file.type === 'route' ? '🛣️' :
                   file.type === 'middleware' ? '🛡️' : '⚡';
      nodes.push({
        id: `backend-${i}`,
        position: { x: 16, y: 40 + i * 36 },
        parentId: 'backend-group',
        data: { label: `${icon} ${file.name}`, filePath: file.path },
        style: {
          background: '#1a1d27',
          border: '1px solid #2a2d37',
          borderRadius: '6px',
          color: '#3b82f6',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '6px 10px',
          cursor: 'pointer',
          width: 188,
        },
      });
    });
  }

  // Database group
  if (anatomy.databaseFiles.length > 0) {
    const allTables = anatomy.databaseFiles.flatMap(f => f.tables);
    const totalItems = anatomy.databaseFiles.length + allTables.length;

    nodes.push({
      id: 'database-group',
      type: 'group',
      position: { x: 600, y: 0 },
      data: { label: '🗄️ Database' },
      style: {
        background: 'rgba(168, 85, 247, 0.08)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        width: 220,
        height: Math.max(120, totalItems * 36 + 60),
      },
    });

    let dbNodeIndex = 0;
    anatomy.databaseFiles.forEach((file) => {
      nodes.push({
        id: `db-file-${dbNodeIndex}`,
        position: { x: 16, y: 40 + dbNodeIndex * 36 },
        parentId: 'database-group',
        data: { label: `📁 ${file.name}`, filePath: file.path },
        style: {
          background: '#1a1d27',
          border: '1px solid #2a2d37',
          borderRadius: '6px',
          color: '#a855f7',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '6px 10px',
          cursor: 'pointer',
          width: 188,
        },
      });
      dbNodeIndex++;

      file.tables.forEach((table) => {
        nodes.push({
          id: `db-table-${dbNodeIndex}`,
          position: { x: 32, y: 40 + dbNodeIndex * 36 },
          parentId: 'database-group',
          data: { label: `  📊 ${table}` },
          style: {
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            fontSize: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '4px 8px',
            width: 172,
          },
        });
        dbNodeIndex++;
      });
    });
  }

  // Entry point (index.html)
  if (anatomy.staticFiles.length > 0) {
    const htmlEntry = anatomy.staticFiles.find(f => f.type === 'html');
    if (htmlEntry) {
      nodes.push({
        id: 'entry-point',
        position: { x: 150, y: -80 },
        data: { label: '🌐 index.html (entry)', filePath: htmlEntry.path },
        style: {
          background: '#252830',
          border: '2px solid #f97316',
          borderRadius: '8px',
          color: '#f97316',
          fontSize: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 'bold',
          padding: '8px 16px',
          cursor: 'pointer',
        },
      });
    }
  }

  // Edges
  if (nodes.find(n => n.id === 'entry-point') && nodes.find(n => n.id === 'frontend-group')) {
    edges.push({
      id: 'entry-to-frontend',
      source: 'entry-point',
      target: 'frontend-group',
      animated: true,
      style: { stroke: '#f97316', strokeWidth: 2 },
      label: 'renders',
      labelStyle: { fill: '#9ca3af', fontSize: 10 },
    });
  }

  if (anatomy.frontendFiles.length > 0 && anatomy.backendFiles.length > 0) {
    edges.push({
      id: 'frontend-to-backend',
      source: 'frontend-group',
      target: 'backend-group',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      label: 'fetch()',
      labelStyle: { fill: '#9ca3af', fontSize: 10 },
    });
  }

  if (anatomy.backendFiles.length > 0 && anatomy.databaseFiles.length > 0) {
    edges.push({
      id: 'backend-to-database',
      source: 'backend-group',
      target: 'database-group',
      animated: true,
      style: { stroke: '#a855f7', strokeWidth: 2 },
      label: 'SQL queries',
      labelStyle: { fill: '#9ca3af', fontSize: 10 },
    });
  }

  return { nodes, edges };
}

export default function AnatomyPanel({ files, fileContents, onFileSelected }: AnatomyPanelProps) {
  const anatomy = useMemo(() => analyzeProjectFiles(files, fileContents), [files, fileContents]);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => generateDiagramNodes(anatomy),
    [anatomy]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const newAnatomy = analyzeProjectFiles(files, fileContents);
    const { nodes: newNodes, edges: newEdges } = generateDiagramNodes(newAnatomy);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [files, fileContents, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const filePath = (node.data as { filePath?: string })?.filePath;
    if (filePath) {
      onFileSelected(filePath);
    }
  }, [onFileSelected]);

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: '#0f1117' }}>
        <span className="text-3xl mb-3">🏗️</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Generate an app to see its architecture here</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0f1117', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#2a2d37" gap={20} size={1} />
        <Controls
          style={{
            background: '#1a1d27',
            border: '1px solid #2a2d37',
            borderRadius: '8px',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.startsWith('frontend')) return '#22c55e';
            if (node.id.startsWith('backend')) return '#3b82f6';
            if (node.id.startsWith('db')) return '#a855f7';
            if (node.id === 'entry-point') return '#f97316';
            return '#6b7280';
          }}
          style={{
            background: '#1a1d27',
            border: '1px solid #2a2d37',
            borderRadius: '8px',
          }}
          maskColor="rgba(15, 17, 23, 0.8)"
        />
      </ReactFlow>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '16px',
        background: '#1a1d27',
        border: '1px solid #2a2d37',
        borderRadius: '6px',
        padding: '4px 12px',
        fontSize: '10px',
        color: '#9ca3af',
        whiteSpace: 'nowrap',
      }}>
        <span><span style={{ color: '#22c55e' }}>●</span> Frontend</span>
        <span><span style={{ color: '#3b82f6' }}>●</span> Backend</span>
        <span><span style={{ color: '#a855f7' }}>●</span> Database</span>
        <span><span style={{ color: '#f97316' }}>●</span> Entry Point</span>
        <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Click any node to open file</span>
      </div>
    </div>
  );
}
