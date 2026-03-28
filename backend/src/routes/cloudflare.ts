import { json, IRequest } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

export const cloudflareRoutes = {
  async connect(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { api_token, account_id } = await req.json() as { api_token: string; account_id: string };
    if (!api_token || !account_id) {
      return json({ success: false, error: 'API token and Account ID required' }, { status: 400 });
    }

    // Verify the token works
    const verifyResponse = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { 'Authorization': `Bearer ${api_token}` },
    });
    const verifyData: any = await verifyResponse.json();

    if (!verifyData.success) {
      return json({ success: false, error: 'Invalid API token' }, { status: 400 });
    }

    await env.DB.prepare(`
      INSERT INTO cloudflare_connections (user_id, account_id, api_token)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        account_id = excluded.account_id,
        api_token = excluded.api_token,
        updated_at = datetime('now')
    `).bind(user.id, account_id, api_token).run();

    return json({ success: true });
  },

  async status(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const conn = await env.DB.prepare(
      'SELECT account_id, created_at FROM cloudflare_connections WHERE user_id = ?'
    ).bind(user.id).first<{ account_id: string; created_at: string }>();

    return json({
      success: true,
      data: {
        connected: !!conn,
        account_id: conn?.account_id || null,
        connected_at: conn?.created_at || null,
      },
    });
  },

  async disconnect(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await env.DB.prepare('DELETE FROM cloudflare_connections WHERE user_id = ?').bind(user.id).run();
    return json({ success: true });
  },

  async deploy(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const cfConn = await env.DB.prepare(
      'SELECT * FROM cloudflare_connections WHERE user_id = ?'
    ).bind(user.id).first<{ account_id: string; api_token: string }>();
    if (!cfConn) return json({ success: false, error: 'Cloudflare not connected' }, { status: 401 });

    const project = await env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, user.id).first<{ id: number; name: string }>();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const files = await env.DB.prepare(
      'SELECT path, content FROM files WHERE project_id = ?'
    ).bind(req.params.id).all<{ path: string; content: string }>();

    const projectSlug = project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    // Ensure Pages project exists
    const checkRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfConn.account_id}/pages/projects/${projectSlug}`,
      { headers: { 'Authorization': `Bearer ${cfConn.api_token}` } }
    );
    const checkData: any = await checkRes.json();

    if (!checkData.success) {
      // Create the Pages project
      const createRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfConn.account_id}/pages/projects`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cfConn.api_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: projectSlug, production_branch: 'main' }),
        }
      );
      const createData: any = await createRes.json();
      if (!createData.success) {
        const msg = createData.errors?.[0]?.message || 'Failed to create Pages project';
        await env.DB.prepare(`
          INSERT INTO project_deployments (project_id, deployment_type, status, error_message)
          VALUES (?, 'pages', 'failed', ?)
        `).bind(req.params.id, msg).run();
        return json({ success: false, error: msg }, { status: 400 });
      }
    }

    // Direct Upload deployment
    const formData = new FormData();
    const manifest: Record<string, string> = {};

    for (const file of files.results) {
      const blob = new Blob([file.content || ''], { type: 'application/octet-stream' });
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(file.content || ''));
      const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
      manifest[`/${file.path}`] = hashHex;
      formData.append(hashHex, blob, file.path as string);
    }

    formData.append('manifest', JSON.stringify(manifest));

    const deployResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfConn.account_id}/pages/projects/${projectSlug}/deployments`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfConn.api_token}` },
        body: formData,
      }
    );

    const deployData: any = await deployResponse.json();

    if (!deployData.success) {
      const errorMsg = deployData.errors?.[0]?.message || 'Deploy failed';
      await env.DB.prepare(`
        INSERT INTO project_deployments (project_id, deployment_type, status, error_message)
        VALUES (?, 'pages', 'failed', ?)
      `).bind(req.params.id, errorMsg).run();
      return json({ success: false, error: errorMsg }, { status: 400 });
    }

    const deploymentUrl = deployData.result?.url || `https://${projectSlug}.pages.dev`;

    await env.DB.prepare(`
      INSERT INTO project_deployments (project_id, deployment_type, deployment_url, status)
      VALUES (?, 'pages', ?, 'success')
    `).bind(req.params.id, deploymentUrl).run();

    return json({
      success: true,
      data: { url: deploymentUrl, deployment_id: deployData.result?.id },
    });
  },

  async deployments(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const deployments = await env.DB.prepare(
      'SELECT * FROM project_deployments WHERE project_id = ? ORDER BY deployed_at DESC LIMIT 10'
    ).bind(req.params.id).all();

    return json({ success: true, data: { deployments: deployments.results } });
  },
};
