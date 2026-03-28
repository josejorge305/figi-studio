import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';

interface GitPanelProps {
  projectId: string;
  terminalLog: (type: 'info' | 'success' | 'error' | 'warning' | 'system' | 'command' | 'ai', message: string) => void;
}

interface GitHubStatus {
  connected: boolean;
  username?: string;
  avatar_url?: string;
}

interface RepoStatus {
  linked: boolean;
  repo_url?: string;
  repo_full_name?: string;
  default_branch?: string;
  last_pushed_at?: string;
  recent_commits?: { sha: string; message: string; date: string }[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function GitPanel({ projectId, terminalLog }: GitPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [repoStatus, setRepoStatus] = useState<RepoStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [pushing, setPushing] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchGitHubStatus = useCallback(async () => {
    const res = await api.get<GitHubStatus>('/api/github/status');
    if (res.success && res.data) setGithubStatus(res.data);
    setLoadingStatus(false);
  }, []);

  const fetchRepoStatus = useCallback(async () => {
    if (!projectId) return;
    const res = await api.get<RepoStatus>(`/api/projects/${projectId}/github/status`);
    if (res.success && res.data) setRepoStatus(res.data);
  }, [projectId]);

  useEffect(() => {
    fetchGitHubStatus();
    fetchRepoStatus();
  }, [fetchGitHubStatus, fetchRepoStatus]);

  // Listen for OAuth callback message
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'github-connected') {
        fetchGitHubStatus();
        terminalLog('success', `Connected to GitHub as @${e.data.username}`);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchGitHubStatus, terminalLog]);

  const handleConnectGitHub = async () => {
    const res = await api.get<{ url: string; state: string }>('/api/github/auth-url');
    if (res.success && res.data?.url) {
      const w = 600, h = 700;
      const left = window.screenX + (window.innerWidth - w) / 2;
      const top = window.screenY + (window.innerHeight - h) / 2;
      window.open(res.data.url, 'github-oauth', `width=${w},height=${h},left=${left},top=${top}`);
    } else {
      terminalLog('error', res.error || 'GitHub integration not available');
    }
  };

  const handleDisconnect = async () => {
    await api.delete('/api/github/disconnect');
    setGithubStatus({ connected: false });
    setRepoStatus(null);
    terminalLog('info', 'Disconnected from GitHub');
  };

  const handleInitRepo = async () => {
    setInitializing(true);
    terminalLog('command', '> Creating GitHub repo and pushing files...');
    const res = await api.post<{ repo_url: string; repo_full_name: string }>(`/api/projects/${projectId}/github/init`);
    if (res.success && res.data) {
      terminalLog('success', `Repo created: ${res.data.repo_full_name}`);
      terminalLog('info', `  ${res.data.repo_url}`);
      await fetchRepoStatus();
    } else {
      terminalLog('error', `Failed to create repo: ${res.error}`);
    }
    setInitializing(false);
  };

  const handleCommitPush = async () => {
    if (!commitMessage.trim()) return;
    setPushing(true);
    terminalLog('command', `> Commit & push: "${commitMessage}"`);
    const res = await api.post<{ commit_sha: string; commit_url: string }>(`/api/projects/${projectId}/github/commit`, { message: commitMessage });
    if (res.success && res.data) {
      terminalLog('success', `Pushed commit ${res.data.commit_sha}`);
      setCommitMessage('');
      await fetchRepoStatus();
    } else {
      terminalLog('error', `Push failed: ${res.error}`);
    }
    setPushing(false);
  };

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

  return (
    <div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <span className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-medium">🌿 Git</span>
          {githubStatus?.connected && (
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>@{githubStatus.username}</span>
          )}
          {!githubStatus?.connected && (
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
          ) : !githubStatus?.connected ? (
            /* State 1: Not connected */
            <div className="flex flex-col items-center gap-2 py-2">
              <span style={{ color: 'var(--text-muted)', fontSize: '20px' }}>🔒</span>
              <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.5' }}>
                Connect GitHub to track your code. Push projects, manage branches, and track every change.
              </p>
              <button onClick={handleConnectGitHub} style={buttonStyle}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                Connect GitHub
              </button>
              <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                Requires Pro ($19.99/mo) or Figi U ($29.99/mo)
              </p>
            </div>
          ) : !repoStatus?.linked ? (
            /* State 2: Connected, no repo */
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'var(--accent-green)' }}>
                  ✅ Connected as @{githubStatus.username}
                </span>
                <button onClick={handleDisconnect} className="text-[9px]" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Disconnect
                </button>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                This project isn't on GitHub yet.
              </p>
              <button onClick={handleInitRepo} disabled={initializing}
                style={{ ...buttonStyle, opacity: initializing ? 0.6 : 1, cursor: initializing ? 'wait' : 'pointer' }}
                onMouseEnter={e => { if (!initializing) { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                {initializing ? '⟳ Creating...' : 'Create Repo & Push'}
              </button>
              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                Creates a new repo and pushes all files.
              </p>
            </div>
          ) : (
            /* State 3: Connected with repo */
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <a href={repoStatus.repo_url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] truncate"
                  style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }}>
                  📦 {repoStatus.repo_full_name} ↗
                </a>
                <button onClick={handleDisconnect} className="text-[9px]" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Disconnect
                </button>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                🌿 {repoStatus.default_branch}
              </div>

              {/* Recent commits */}
              {repoStatus.recent_commits && repoStatus.recent_commits.length > 0 && (
                <div className="rounded-lg p-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Recent Commits</p>
                  {repoStatus.recent_commits.map(c => (
                    <div key={c.sha} className="flex gap-2 py-0.5" style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
                      <span style={{ color: 'var(--accent-orange)' }}>{c.sha}</span>
                      <span className="truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{c.message}</span>
                      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.date)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Commit form */}
              <div className="space-y-1.5">
                <input
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !pushing) handleCommitPush(); }}
                  placeholder="Commit message..."
                  className="w-full px-2 py-1.5 rounded text-[11px]"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontFamily: "'JetBrains Mono', monospace",
                    outline: 'none',
                  }}
                />
                <button onClick={handleCommitPush}
                  disabled={pushing || !commitMessage.trim()}
                  style={{ ...buttonStyle, opacity: pushing || !commitMessage.trim() ? 0.5 : 1, cursor: pushing || !commitMessage.trim() ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (!pushing && commitMessage.trim()) { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  {pushing ? '⟳ Pushing...' : 'Commit & Push ⬆️'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
