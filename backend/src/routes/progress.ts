import { IRequest } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

export const progressRoutes = {
  async getFigiCodeProgress(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const figiCodeApiUrl = (env as any).FIGI_CODE_API_URL;
    if (!figiCodeApiUrl) {
      return Response.json({
        success: true,
        data: {
          connected: false,
          message: 'Figi Code progress sync not configured yet. Your progress will sync once shared auth is set up.',
        },
      });
    }

    try {
      const response = await fetch(`${figiCodeApiUrl}/api/user/progress`, {
        headers: {
          'Authorization': req.headers.get('Authorization') || '',
          'X-Service-Token': (env as any).SERVICE_SECRET || '',
        },
      });

      if (!response.ok) {
        return Response.json({
          success: true,
          data: {
            connected: false,
            message: 'Could not reach Figi Code — progress sync will be available after shared auth is set up.',
          },
        });
      }

      const progress = await response.json();
      return Response.json({
        success: true,
        data: { connected: true, progress },
      });
    } catch {
      return Response.json({
        success: true,
        data: {
          connected: false,
          message: 'Figi Code API not reachable.',
        },
      });
    }
  },

  async awardXP(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const figiCodeApiUrl = (env as any).FIGI_CODE_API_URL;
    if (!figiCodeApiUrl) {
      return Response.json({
        success: true,
        data: {
          awarded: false,
          message: 'Figi Code progress sync not configured yet.',
        },
      });
    }

    try {
      const body = await req.json() as { xp: number; source: string };
      const response = await fetch(`${figiCodeApiUrl}/api/user/xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
          'X-Service-Token': (env as any).SERVICE_SECRET || '',
        },
        body: JSON.stringify({ xp: body.xp, source: body.source }),
      });

      if (!response.ok) {
        return Response.json({
          success: true,
          data: { awarded: false, message: 'Could not reach Figi Code to award XP.' },
        });
      }

      const result = await response.json();
      return Response.json({ success: true, data: { awarded: true, result } });
    } catch {
      return Response.json({
        success: true,
        data: { awarded: false, message: 'Figi Code API not reachable.' },
      });
    }
  },
};
