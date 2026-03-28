import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';

interface CloudflarePanelProps {
  projectId: string;
  terminalLog: (type: 'info' | 'success' | 'error' | 'warning' | 'system' | 'command' | 'ai', message: string) => void;
  onDeployStart: () => void;
  onDeployEnd: (url: string | null) => void;
}

interface CfStatus {
  connected: boolean;
  account_id?: string;
}

interface Deployment {
  id: number;
  deployment_url: string;
  status: string;
  deployed_at: string;
  error_message?: string;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function CloudflarePanel({ projectId, terminalLog, onDeployStart, onDeployEnd }: CloudflarePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [cfStatus, setCfStatus] = useState<CfStatus | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchStatus = useCallback(async () => {
    const res = await api.get<CfStatus>('/api/cloudflare/status');
    if (res.success && res.data) setCfStatus(res.data);
    setLoadingStatus(false);
  }, []);

  const fetchDeployments = useCallback(async () => {
    if (!projectId) return;
    const res = await api.get<{ deployments: Deployment[] }>(`/api/projects/${projectId}/deployments`);
    if (res.success && res.data) setDeployments(res.data.deployments);
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
    fetchDeployments();
  }, [fetchStatus, fetchDeployments]);

  const handleConnect = async () => {
    if (!accountId.trim() || !apiToken.trim()) return;
    setConnecting(true);
    setConnectError('');
    const res = await api.post('/api/cloudflare/connect', { api_token: apiToken, account_id: accountId });
    if (res.success) {
      setCfStatus({ connected: true, account_id: accountId });
      setShowConnectForm(false);
      setApiToken('');
      terminalLog('success', 'Connected to Cloudflare');
    } else {
      setConnectError(res.error || 'Connection failed');
      terminalLog('error', `Cloudflare connection failed: ${res.error}`);
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await api.delete('/api/cloudflare/disconnect');
    setCfStatus({ connected: false });
    setDeployments([]);
    terminalLog('info', 'Disconnected from Cloudflare');
  };

  const handleDeploy = async () => {
    setDeploying(true);
    onDeployStart();
    terminalLog('command', '> Deploying to Cloudflare Pages...');
    const res = await api.post<{ url: string; deployment_id: string }>(`/api/projects/${projectId}/deploy`);
    if (res.success && res.data) {
      terminalLog('success', `Deployed to ${res.data.url}`);
      onDeployEnd(res.data.url);
      await fetchDeployments();
    } else {
      terminalLog('error', `Deploy failed: ${res.error}`);
      onDeployEnd(null);
    }
    setDeploying(false);
  };

  const latestSuccess = deployments.find(d => d.status === 'success');

  const buttonStyle = {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    fontSize: '11px',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.15s',
  };

  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    outline: 'none',
    width: '100%',
    padding: '6px 8px',
    borderRadius: '4px',
  };

  return (
    <div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <span className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-medium">☁️ Deploy</span>
          {cfStatus?.connected && (
            <span className="text-[9px]" style={{ color: 'var(--accent-green)' }}>✅</span>
          )}
          {!cfStatus?.connected && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--accent-purple)' }}>Pro</span>
          )}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="px-3 py-3 space-y-3">
          {loadingStatus ? (
            <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : !cfStatus?.connected ? (
            /* State 1: Not connected */
            showConnectForm ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Account ID</label>
                  <input value={accountId} onChange={e => setAccountId(e.target.value)}
                    placeholder="e.g. abc123def456..." style={inputStyle} />
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Find at dash.cloudflare.com → right sidebar
                  </p>
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>API Token</label>
                  <input value={apiToken} onChange={e => setApiToken(e.target.value)} type="password"
                    placeholder="Your Cloudflare API token" style={inputStyle} />
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Create at Profile → API Tokens → Edit Cloudflare Pages
                  </p>
                </div>
                {connectError && (
                  <p className="text-[10px]" style={{ color: 'var(--accent-red)' }}>{connectError}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setShowConnectForm(false); setConnectError(''); }}
                    style={{ ...buttonStyle, width: 'auto', flex: 1 }}>
                    Cancel
                  </button>
                  <button onClick={handleConnect}
                    disabled={connecting || !accountId.trim() || !apiToken.trim()}
                    style={{ ...buttonStyle, width: 'auto', flex: 2, opacity: connecting || !accountId.trim() || !apiToken.trim() ? 0.5 : 1 }}
                    onMouseEnter={e => { if (!connecting) { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                    {connecting ? '⟳ Verifying...' : 'Connect'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <span style={{ color: 'var(--text-muted)', fontSize: '20px' }}>🔒</span>
                <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.5' }}>
                  Connect Cloudflare to deploy your app. Get a live URL instantly.
                </p>
                <button onClick={() => setShowConnectForm(true)} style={buttonStyle}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  Connect Cloudflare
                </button>
                <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                  Requires Pro ($19.99/mo) or Figi U ($29.99/mo)
                </p>
              </div>
            )
          ) : (
            /* State 2/3: Connected */
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'var(--accent-green)' }}>✅ Connected</span>
                <button onClick={handleDisconnect} className="text-[9px]" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Disconnect
                </button>
              </div>

              {/* Latest deployment URL */}
              {latestSuccess && (
                <div className="rounded-lg p-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]">🌐</span>
                    <a href={latestSuccess.deployment_url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] truncate"
                      style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }}>
                      {latestSuccess.deployment_url.replace('https://', '')} ↗
                    </a>
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Last deployed: {formatTime(latestSuccess.deployed_at)} ✅
                  </p>
                </div>
              )}

              {/* Deploy button */}
              <button onClick={handleDeploy} disabled={deploying}
                style={{ ...buttonStyle, opacity: deploying ? 0.6 : 1, cursor: deploying ? 'wait' : 'pointer' }}
                onMouseEnter={e => { if (!deploying) { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                {deploying ? '⟳ Deploying...' : '🚀 Deploy to Cloudflare'}
              </button>

              {/* Deployment history */}
              {deployments.length > 0 && (
                <div className="rounded-lg p-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>History</p>
                  {deployments.slice(0, 5).map(d => (
                    <div key={d.id} className="flex gap-2 py-0.5" style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>{d.status === 'success' ? '✅' : '❌'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatTime(d.deployed_at)}</span>
                      <span className="truncate flex-1" style={{ color: d.status === 'success' ? 'var(--text-secondary)' : 'var(--accent-red)' }}>
                        {d.status === 'success' ? d.deployment_url?.replace('https://', '') : d.error_message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
