import { KrathongRoom, Env } from './KrathongRoom';
import { KrathongEvent } from '@loy-kratong/shared';

export { KrathongRoom };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ingest-Secret',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Single room instance for the entire stream
    const id = env.KRATHONG_ROOM.idFromName('main-river');
    const room = env.KRATHONG_ROOM.get(id);

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }
      return room.fetch(request);
    }

    // Ingestor batch event receiver
    if (url.pathname === '/events' && request.method === 'POST') {
      const secret = request.headers.get('X-Ingest-Secret');
      if (secret !== env.INGEST_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized ingest secret' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const body = (await request.json()) as { events: KrathongEvent[] };
      if (!Array.isArray(body?.events)) {
        return new Response(JSON.stringify({ error: 'Invalid payload: expected events array' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      await room.processEvents(body.events);
      return new Response(JSON.stringify({ success: true, count: body.events.length }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Public web Krathong creation
    if (url.pathname === '/krathong' && request.method === 'POST') {
      const body = (await request.json()) as {
        name: string;
        wish: string;
        style?: 'banana' | 'lotus' | 'bread';
        turnstileToken?: string;
      };

      if (!body.name || !body.wish) {
        return new Response(JSON.stringify({ error: 'Name and wish are required' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Generate web event
      const webEvent: KrathongEvent = {
        id: crypto.randomUUID(),
        source: 'web',
        kind: 'comment',
        user: {
          id: `web-${crypto.randomUUID().slice(0, 8)}`,
          name: body.name.slice(0, 20),
        },
        text: body.wish,
        style: body.style || 'banana',
        ts: Date.now(),
      };

      await room.processEvents([webEvent]);
      return new Response(JSON.stringify({ success: true, event: webEvent }), {
        status: 201,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Admin endpoints
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (url.pathname === '/stats' && request.method === 'GET') {
      if (token !== env.ADMIN_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const stats = await room.getStats();
      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/admin' && request.method === 'POST') {
      if (token !== env.ADMIN_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const body = (await request.json()) as {
        action: 'clear' | 'pause' | 'resume' | 'fallback' | 'live' | 'block';
        userId?: string;
      };

      switch (body.action) {
        case 'clear':
          await room.clearScreen();
          break;
        case 'pause':
          await room.setPaused(true);
          break;
        case 'resume':
          await room.setPaused(false);
          break;
        case 'fallback':
          await room.setMode('fallback');
          break;
        case 'live':
          await room.setMode('live');
          break;
        case 'block':
          if (body.userId) {
            await room.blockUser(body.userId);
          }
          break;
        default:
          return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
      }

      return new Response(JSON.stringify({ success: true, action: body.action }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Loy Krathong Room Worker is Running', {
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
    });
  },
};

