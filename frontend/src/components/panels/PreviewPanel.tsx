import { useState } from 'react';

type Viewport = 'desktop' | 'tablet' | 'mobile';

interface PreviewPanelProps {
  previewHtml: string | null;
  previewKey: number;
  generating: boolean;
  onRefresh: () => void;
  onOpenLive: () => void;
}

export default function PreviewPanel({ previewHtml, previewKey, generating, onRefresh, onOpenLive }: PreviewPanelProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');

  const viewportWidth = viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';

  return (
    <div className="flex flex-col h-full" style={{ background: '#060810' }}>
      {/* Viewport toolbar */}
      <div className="flex items-center justify-between px-3 shrink-0"
        style={{ height: 36, borderBottom: '1px solid var(--border-color)', background: 'var(--panel-header-bg)' }}>
        <div className="flex items-center gap-1">
          {([
            { key: 'desktop' as Viewport, icon: '💻', label: 'Desktop' },
            { key: 'tablet' as Viewport, icon: '📱', label: 'Tablet' },
            { key: 'mobile' as Viewport, icon: '📲', label: 'Mobile' },
          ]).map(v => (
            <button key={v.key} onClick={() => setViewport(v.key)}
              className="px-2 py-1 rounded text-[11px] transition-colors"
              style={{
                background: viewport === v.key ? 'var(--bg-tertiary)' : 'transparent',
                color: viewport === v.key ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title={v.label}>
              {v.icon}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>preview</span>
          <button onClick={onRefresh}
            className="px-2 py-1 rounded text-[11px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Refresh preview">
            🔄
          </button>
          {previewHtml && (
            <button onClick={onOpenLive}
              className="px-2 py-1 rounded text-[11px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Open in new tab">
              ↗️
            </button>
          )}
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative overflow-hidden flex justify-center">
        {generating && !previewHtml && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ background: 'rgba(6,8,16,0.85)' }}>
            <div className="text-4xl mb-3 animate-pulse">🤖</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Building your app...</p>
          </div>
        )}
        {previewHtml ? (
          <div className="h-full" style={{ width: viewportWidth, maxWidth: '100%', transition: 'width 0.3s ease' }}>
            <iframe
              key={previewKey}
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="App Preview"
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
            />
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-center px-8">
            <div className="text-6xl mb-4">🌐</div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Live Preview</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your app will appear here once you start building</p>
          </div>
        )}
      </div>
    </div>
  );
}
