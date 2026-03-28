import { json } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

function generateSubdomain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 7);
}

export const projectRoutes = {
  async list(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { results } = await env.DB.prepare(
      'SELECT id, name, description, subdomain, preview_url, status, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(user.id).all();

    return json({ success: true, data: { projects: results } });
  },

  async create(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    try {
      const { name, description } = await req.json() as { name: string; description?: string };
      if (!name?.trim()) return json({ success: false, error: 'Project name required' }, { status: 400 });

      const subdomain = generateSubdomain(name);
      const result = await env.DB.prepare(
        'INSERT INTO projects (user_id, name, description, subdomain, status) VALUES (?, ?, ?, ?, ?)'
      ).bind(user.id, name.trim(), description || '', subdomain, 'active').run();

      const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(result.meta.last_row_id).first();
      return json({ success: true, data: { project } }, { status: 201 });
    } catch (e: unknown) {
      return json({ success: false, error: e instanceof Error ? e.message : 'Failed to create project' }, { status: 500 });
    }
  },

  async get(req: Request & { params: { id: string } }, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { results: messages } = await env.DB.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC').bind(req.params.id).all();
    const { results: files } = await env.DB.prepare('SELECT id, path, language, updated_at FROM files WHERE project_id = ? ORDER BY path ASC').bind(req.params.id).all();

    return json({ success: true, data: { project, messages, files } });
  },

  async delete(req: Request & { params: { id: string } }, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    await env.DB.prepare('DELETE FROM messages WHERE project_id = ?').bind(req.params.id).run();
    await env.DB.prepare('DELETE FROM files WHERE project_id = ?').bind(req.params.id).run();
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(req.params.id).run();

    return json({ success: true, data: { deleted: true } });
  },

  async getFiles(req: Request & { params: { id: string } }, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { results } = await env.DB.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY path ASC').bind(req.params.id).all();
    return json({ success: true, data: { files: results } });
  },

  async getMessages(req: Request & { params: { id: string } }, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { results } = await env.DB.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC').bind(req.params.id).all();
    return json({ success: true, data: { messages: results } });
  },
};
