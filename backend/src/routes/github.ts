import { json, IRequest } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

async function getGitHubToken(db: D1Database, userId: number): Promise<string | null> {
  const conn = await db.prepare(
    'SELECT github_access_token FROM github_connections WHERE user_id = ?'
  ).bind(userId).first<{ github_access_token: string }>();
  return conn?.github_access_token || null;
}

async function githubAPI(path: string, token: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'FigiStudio/1.0',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  });

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  return response.json();
}

export const githubRoutes = {
  async authUrl(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!env.GITHUB_CLIENT_ID) {
      return json({ success: false, error: 'GitHub integration not configured' }, { status: 503 });
    }

    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${env.FRONTEND_URL}/github/callback`,
      scope: 'repo',
      state,
    });

    return json({
      success: true,
      data: {
        url: `https://github.com/login/oauth/authorize?${params}`,
        state,
      },
    });
  },

  async callback(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return json({ success: false, error: 'GitHub integration not configured' }, { status: 503 });
    }

    const { code } = await req.json() as { code: string };
    if (!code) return json({ success: false, error: 'Authorization code required' }, { status: 400 });

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData: any = await tokenResponse.json();
    if (tokenData.error) {
      return json({ success: false, error: tokenData.error_description || 'OAuth failed' }, { status: 400 });
    }

    // Get GitHub user info
    const githubUser: any = await githubAPI('/user', tokenData.access_token);

    // Store connection
    await env.DB.prepare(`
      INSERT INTO github_connections (user_id, github_username, github_access_token, avatar_url)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        github_username = excluded.github_username,
        github_access_token = excluded.github_access_token,
        avatar_url = excluded.avatar_url,
        updated_at = datetime('now')
    `).bind(user.id, githubUser.login, tokenData.access_token, githubUser.avatar_url).run();

    return json({
      success: true,
      data: {
        username: githubUser.login,
        avatar_url: githubUser.avatar_url,
      },
    });
  },

  async status(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const connection = await env.DB.prepare(
      'SELECT github_username, avatar_url, created_at FROM github_connections WHERE user_id = ?'
    ).bind(user.id).first<{ github_username: string; avatar_url: string; created_at: string }>();

    return json({
      success: true,
      data: {
        connected: !!connection,
        username: connection?.github_username || null,
        avatar_url: connection?.avatar_url || null,
        connected_at: connection?.created_at || null,
      },
    });
  },

  async disconnect(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await env.DB.prepare('DELETE FROM github_connections WHERE user_id = ?').bind(user.id).run();
    return json({ success: true });
  },

  async initRepo(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const token = await getGitHubToken(env.DB, user.id);
    if (!token) return json({ success: false, error: 'GitHub not connected' }, { status: 401 });

    const project = await env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, user.id).first<{ id: number; name: string }>();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const existingRepo = await env.DB.prepare(
      'SELECT * FROM project_repos WHERE project_id = ?'
    ).bind(req.params.id).first();
    if (existingRepo) return json({ success: false, error: 'Repo already linked' }, { status: 409 });

    const repoName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    let repo: any;
    try {
      repo = await githubAPI('/user/repos', token, {
        method: 'POST',
        body: JSON.stringify({
          name: repoName,
          description: `Built with Figi Studio — ${project.name}`,
          private: false,
          auto_init: false,
        }),
      });
    } catch (err: any) {
      return json({ success: false, error: `Failed to create repo: ${err.message}` }, { status: 400 });
    }

    // Get all project files
    const files = await env.DB.prepare(
      'SELECT path, content FROM files WHERE project_id = ?'
    ).bind(req.params.id).all<{ path: string; content: string }>();

    // Create blobs
    const blobs = await Promise.all(
      files.results.map(async (file) => {
        const blob: any = await githubAPI(`/repos/${repo.full_name}/git/blobs`, token, {
          method: 'POST',
          body: JSON.stringify({ content: file.content || '', encoding: 'utf-8' }),
        });
        return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
      })
    );

    // Create tree
    const tree: any = await githubAPI(`/repos/${repo.full_name}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({ tree: blobs }),
    });

    // Create commit
    const commit: any = await githubAPI(`/repos/${repo.full_name}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Initial commit from Figi Studio 🤖',
        tree: tree.sha,
      }),
    });

    // Create main branch ref
    await githubAPI(`/repos/${repo.full_name}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({ ref: 'refs/heads/main', sha: commit.sha }),
    });

    // Store repo link
    await env.DB.prepare(`
      INSERT INTO project_repos (project_id, repo_full_name, repo_url, default_branch, last_pushed_at)
      VALUES (?, ?, ?, 'main', datetime('now'))
    `).bind(req.params.id, repo.full_name, repo.html_url).run();

    return json({
      success: true,
      data: { repo_url: repo.html_url, repo_full_name: repo.full_name },
    });
  },

  async commitAndPush(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const token = await getGitHubToken(env.DB, user.id);
    if (!token) return json({ success: false, error: 'GitHub not connected' }, { status: 401 });

    const { message } = await req.json() as { message?: string };

    const repo = await env.DB.prepare(
      'SELECT * FROM project_repos WHERE project_id = ?'
    ).bind(req.params.id).first<{ repo_full_name: string; repo_url: string; default_branch: string }>();
    if (!repo) return json({ success: false, error: 'No repo linked to this project' }, { status: 404 });

    try {
      // Get latest commit SHA
      const ref: any = await githubAPI(`/repos/${repo.repo_full_name}/git/ref/heads/${repo.default_branch}`, token);
      const parentSha = ref.object.sha;

      // Get all project files
      const files = await env.DB.prepare(
        'SELECT path, content FROM files WHERE project_id = ?'
      ).bind(req.params.id).all<{ path: string; content: string }>();

      // Create blobs
      const blobs = await Promise.all(
        files.results.map(async (file) => {
          const blob: any = await githubAPI(`/repos/${repo.repo_full_name}/git/blobs`, token, {
            method: 'POST',
            body: JSON.stringify({ content: file.content || '', encoding: 'utf-8' }),
          });
          return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
        })
      );

      // Create tree
      const tree: any = await githubAPI(`/repos/${repo.repo_full_name}/git/trees`, token, {
        method: 'POST',
        body: JSON.stringify({ tree: blobs }),
      });

      // Create commit
      const commit: any = await githubAPI(`/repos/${repo.repo_full_name}/git/commits`, token, {
        method: 'POST',
        body: JSON.stringify({
          message: message || 'Update from Figi Studio',
          tree: tree.sha,
          parents: [parentSha],
        }),
      });

      // Update branch ref
      await githubAPI(`/repos/${repo.repo_full_name}/git/refs/heads/${repo.default_branch}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha }),
      });

      await env.DB.prepare(
        'UPDATE project_repos SET last_pushed_at = datetime("now") WHERE project_id = ?'
      ).bind(req.params.id).run();

      return json({
        success: true,
        data: {
          commit_sha: commit.sha,
          commit_url: `${repo.repo_url}/commit/${commit.sha}`,
        },
      });
    } catch (err: any) {
      return json({ success: false, error: err.message }, { status: 500 });
    }
  },

  async repoStatus(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const token = await getGitHubToken(env.DB, user.id);

    const repo = await env.DB.prepare(
      'SELECT * FROM project_repos WHERE project_id = ?'
    ).bind(req.params.id).first<{ repo_full_name: string; repo_url: string; default_branch: string; last_pushed_at: string }>();

    if (!repo || !token) {
      return json({ success: true, data: { linked: false } });
    }

    try {
      const commits: any[] = await githubAPI(
        `/repos/${repo.repo_full_name}/commits?sha=${repo.default_branch}&per_page=5`, token
      );

      return json({
        success: true,
        data: {
          linked: true,
          repo_url: repo.repo_url,
          repo_full_name: repo.repo_full_name,
          default_branch: repo.default_branch,
          last_pushed_at: repo.last_pushed_at,
          recent_commits: commits.slice(0, 5).map((c: any) => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message,
            date: c.commit.committer.date,
          })),
        },
      });
    } catch {
      return json({
        success: true,
        data: { linked: true, repo_url: repo.repo_url, repo_full_name: repo.repo_full_name },
      });
    }
  },
};
