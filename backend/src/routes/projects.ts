import { json, IRequest } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

function generateSubdomain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 7);
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    'html': 'html', 'htm': 'html',
    'css': 'css', 'scss': 'scss', 'less': 'less',
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'sql': 'sql',
    'py': 'python',
    'toml': 'toml',
    'yaml': 'yaml', 'yml': 'yaml',
    'xml': 'xml',
    'svg': 'xml',
    'sh': 'shell',
    'bash': 'shell',
    'txt': 'plaintext',
  };
  return map[ext || ''] || 'plaintext';
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

  async get(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { results: messages } = await env.DB.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC').bind(req.params.id).all();
    const { results: files } = await env.DB.prepare('SELECT id, path, language, updated_at FROM files WHERE project_id = ? ORDER BY path ASC').bind(req.params.id).all();

    return json({ success: true, data: { project, messages, files } });
  },

  async delete(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    await env.DB.prepare('DELETE FROM messages WHERE project_id = ?').bind(req.params.id).run();
    await env.DB.prepare('DELETE FROM files WHERE project_id = ?').bind(req.params.id).run();
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(req.params.id).run();

    return json({ success: true, data: { deleted: true } });
  },

  async getFiles(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { results } = await env.DB.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY path ASC').bind(req.params.id).all();
    return json({ success: true, data: { files: results } });
  },

  async getMessages(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { results } = await env.DB.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC').bind(req.params.id).all();
    return json({ success: true, data: { messages: results } });
  },

  async updateFile(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { content } = await req.json() as { content: string };

    await env.DB.prepare(
      'UPDATE files SET content = ?, updated_at = datetime("now") WHERE id = ? AND project_id = ?'
    ).bind(content, req.params.fileId, req.params.id).run();

    const file = await env.DB.prepare(
      'SELECT * FROM files WHERE id = ? AND project_id = ?'
    ).bind(req.params.fileId, req.params.id).first();

    return json({ success: true, data: { file } });
  },

  async createFile(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { path, content = '', language } = await req.json() as { path: string; content?: string; language?: string };
    if (!path?.trim()) return json({ success: false, error: 'File path is required' }, { status: 400 });

    const existing = await env.DB.prepare(
      'SELECT id FROM files WHERE project_id = ? AND path = ?'
    ).bind(req.params.id, path).first();
    if (existing) return json({ success: false, error: 'File already exists at this path' }, { status: 409 });

    const detectedLanguage = language || detectLanguage(path);

    await env.DB.prepare(
      'INSERT INTO files (project_id, path, content, language, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(req.params.id, path, content, detectedLanguage).run();

    const file = await env.DB.prepare(
      'SELECT * FROM files WHERE project_id = ? AND path = ? ORDER BY id DESC LIMIT 1'
    ).bind(req.params.id, path).first();

    return json({ success: true, data: { file } }, { status: 201 });
  },

  async deleteFile(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const file = await env.DB.prepare(
      'SELECT * FROM files WHERE id = ? AND project_id = ?'
    ).bind(req.params.fileId, req.params.id).first<{ path: string }>();

    if (!file) return json({ success: false, error: 'File not found' }, { status: 404 });
    if (file.path === 'index.html') {
      return json({ success: false, error: 'Cannot delete index.html — it is the entry point' }, { status: 400 });
    }

    await env.DB.prepare(
      'DELETE FROM files WHERE id = ? AND project_id = ?'
    ).bind(req.params.fileId, req.params.id).run();

    return json({ success: true });
  },

  async renameFile(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).bind(req.params.id, user.id).first();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    const { path: newPath } = await req.json() as { path: string };
    if (!newPath?.trim()) return json({ success: false, error: 'New path is required' }, { status: 400 });

    const existing = await env.DB.prepare(
      'SELECT id FROM files WHERE project_id = ? AND path = ? AND id != ?'
    ).bind(req.params.id, newPath, req.params.fileId).first();
    if (existing) return json({ success: false, error: 'A file already exists at that path' }, { status: 409 });

    const newLanguage = detectLanguage(newPath);

    await env.DB.prepare(
      'UPDATE files SET path = ?, language = ?, updated_at = datetime("now") WHERE id = ? AND project_id = ?'
    ).bind(newPath, newLanguage, req.params.fileId, req.params.id).run();

    const file = await env.DB.prepare(
      'SELECT * FROM files WHERE id = ? AND project_id = ?'
    ).bind(req.params.fileId, req.params.id).first();

    return json({ success: true, data: { file } });
  },

  async preview(req: IRequest, env: Env): Promise<Response> {
    // Serve the project's index.html directly as HTML — no auth required so iframe can load it
    const file = await env.DB.prepare(
      "SELECT content FROM files WHERE project_id = ? AND path = 'index.html'"
    ).bind(req.params.id).first<{ content: string }>();

    if (!file?.content) {
      return new Response('<html><body style="background:#0b1120;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Outfit,sans-serif"><p style="opacity:0.5">No preview available yet — start building!</p></body></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response(file.content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
