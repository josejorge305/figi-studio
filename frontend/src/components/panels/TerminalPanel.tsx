export default function TerminalPanel() {
  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0a0a' }}>
      <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.6' }}>
        <div><span style={{ color: 'var(--text-muted)' }}>[10:42:15]</span> <span style={{ color: 'var(--accent-green)' }}>Figi Studio v1.0</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>[10:42:15]</span> <span style={{ color: 'var(--text-primary)' }}>Ready. Generate an app or type a command.</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>[10:42:18]</span> <span style={{ color: 'var(--accent-cyan)' }}>Tip: Deploy to Cloudflare coming in Phase 2 ☁️</span></div>
      </div>
      <div className="shrink-0 flex items-center gap-2 px-3 py-2" style={{ borderTop: '1px solid var(--border-color)' }}>
        <span style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>$</span>
        <input
          type="text"
          disabled
          placeholder="Terminal commands coming soon"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', opacity: 0.5 }}
        />
      </div>
    </div>
  );
}
