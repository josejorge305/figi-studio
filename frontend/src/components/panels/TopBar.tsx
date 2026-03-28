interface TopBarProps {
  projectName: string;
  projectStatus: string;
  userName?: string;
  previewHtml: string | null;
  deployedUrl: string | null;
  deploying: boolean;
  cfConnected: boolean;
  onBack: () => void;
  onOpenLive: () => void;
  onLogout: () => void;
  onDeploy: () => void;
}

export default function TopBar({
  projectName, projectStatus, userName, previewHtml,
  deployedUrl, deploying, cfConnected,
  onBack, onOpenLive, onLogout, onDeploy,
}: TopBarProps) {
  const handleOpenLive = () => {
    if (deployedUrl) {
      window.open(deployedUrl, '_blank');
    } else {
      onOpenLive();
    }
  };

  return (
    <div className="flex items-center justify-between px-4 shrink-0"
      style={{ height: 'var(--topbar-height)', background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          ← Dashboard
        </button>
        <span style={{ color: 'var(--border-active)' }}>|</span>
        <span className="text-xl">🤖</span>
        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{projectName}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ color: 'var(--accent-green)', background: 'rgba(34,197,94,0.1)' }}>
          ● {projectStatus}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onDeploy}
          disabled={deploying}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{
            background: deploying ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.2)',
            color: 'var(--accent-orange)',
            opacity: deploying ? 0.7 : 1,
            cursor: deploying ? 'wait' : 'pointer',
          }}
          title={cfConnected ? 'Deploy to Cloudflare' : 'Connect Cloudflare in the Deploy panel first'}>
          {deploying ? '⟳ Deploying…' : 'Deploy ▶'}
        </button>
        {(previewHtml || deployedUrl) && (
          <button onClick={handleOpenLive}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: 'rgba(255,140,66,0.1)', border: '1px solid rgba(255,140,66,0.2)', color: 'var(--accent-orange)' }}>
            {deployedUrl ? 'Open Live ↗' : 'Preview ↗'}
          </button>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{userName}</span>
        <button onClick={onLogout} className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          Sign out
        </button>
      </div>
    </div>
  );
}
