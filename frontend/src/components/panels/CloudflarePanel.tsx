import { useState } from 'react';

export default function CloudflarePanel() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <span className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-medium">☁️ Deploy</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--accent-purple)' }}>Pro</span>
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="px-3 py-3 space-y-3">
          <div className="flex flex-col items-center gap-2 py-2">
            <span style={{ color: 'var(--text-muted)', fontSize: '20px' }}>🔒</span>
            <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Connect Cloudflare to deploy your app
            </p>
            <button disabled className="text-[11px] px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              title="Coming in Phase 2">
              Connect Cloudflare
            </button>
          </div>
          <div className="rounded-lg p-2.5 space-y-1.5"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
            <div style={{ color: 'var(--text-muted)' }}>⚡ Workers: not connected</div>
            <div style={{ color: 'var(--text-muted)' }}>📊 D1: not connected</div>
            <div style={{ color: 'var(--text-muted)' }}>🌐 Pages: not connected</div>
          </div>
        </div>
      )}
    </div>
  );
}
