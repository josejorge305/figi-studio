import { useState, useEffect, useMemo } from 'react';

type Viewport = 'desktop' | 'tablet' | 'mobile';

interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface PreviewPanelProps {
  previewHtml: string | null;
  previewKey: number;
  generating: boolean;
  files: FileData[];
  fileContents: Record<string, string>;
  onRefresh: () => void;
  onOpenLive: () => void;
}

// Inject navigation interceptor + error catcher into HTML
function injectPreviewScripts(html: string): string {
  const script = `<script>
document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;var h=a.getAttribute('href');if(!h)return;if(h.startsWith('http')||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:')||h.startsWith('javascript:'))return;e.preventDefault();var p=h.replace(/^\\.?\\//,'');window.parent.postMessage({type:'navigate',page:p},'*')});
window.onerror=function(m,u,l){window.parent.postMessage({type:'preview-error',message:m+(l?' (line '+l+')':'')},'*')};
window.addEventListener('unhandledrejection',function(e){window.parent.postMessage({type:'preview-error',message:'Unhandled rejection: '+e.reason},'*')});
</script>`;

  // Insert before </body> or at end
  if (html.includes('</body>')) {
    return html.replace('</body>', script + '</body>');
  }
  return html + script;
}

export default function PreviewPanel({ previewHtml, previewKey, generating, files, fileContents, onRefresh, onOpenLive }: PreviewPanelProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [previewPage, setPreviewPage] = useState('index.html');

  const htmlPages = useMemo(() => files.filter(f => f.path.endsWith('.html')), [files]);

  // Reset to index.html when files change significantly
  useEffect(() => {
    setPreviewPage('index.html');
  }, [files.length]);

  // Listen for navigation messages from iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'navigate') {
        const page = event.data.page;
        const exists = files.some(f => f.path === page);
        if (exists) {
          setPreviewPage(page);
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files]);

  // Determine the HTML to show
  const displayHtml = useMemo(() => {
    if (previewPage !== 'index.html') {
      const pageContent = fileContents[previewPage];
      if (pageContent) return injectPreviewScripts(pageContent);
    }
    if (previewHtml) return injectPreviewScripts(previewHtml);
    return null;
  }, [previewHtml, previewPage, fileContents]);

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
          {displayHtml && (
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

      {/* Page breadcrumb bar */}
      {htmlPages.length > 1 && (
        <div className="flex items-center gap-1 px-2 py-1 shrink-0 overflow-x-auto"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
          {htmlPages.map(page => (
            <button key={page.path} onClick={() => setPreviewPage(page.path)}
              className="shrink-0 px-2 py-0.5 rounded text-[11px] transition-colors"
              style={{
                background: previewPage === page.path ? 'var(--accent-orange)' : 'transparent',
                color: previewPage === page.path ? '#000' : 'var(--text-secondary)',
                border: previewPage === page.path ? 'none' : '1px solid var(--border-color)',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: previewPage === page.path ? 600 : 400,
              }}>
              {page.path}
            </button>
          ))}
        </div>
      )}

      {/* Preview iframe */}
      <div className="flex-1 relative overflow-hidden flex justify-center">
        {generating && !displayHtml && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ background: 'rgba(6,8,16,0.85)' }}>
            <div className="text-4xl mb-3 animate-pulse">🤖</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Building your app...</p>
          </div>
        )}
        {displayHtml ? (
          <div className="h-full" style={{ width: viewportWidth, maxWidth: '100%', transition: 'width 0.3s ease' }}>
            <iframe
              key={`${previewKey}-${previewPage}`}
              srcDoc={displayHtml}
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
