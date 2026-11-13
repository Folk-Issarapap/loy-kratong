import { DurableObject } from 'cloudflare:workers';
import {
  KrathongEvent,
  ServerMessage,
  AdminStats,
  sanitizeWishText,
  KrathongStyle
} from '@loy-kratong/shared';

export interface Env {
  KRATHONG_ROOM: DurableObjectNamespace<KrathongRoom>;
  INGEST_SECRET: string;
  ADMIN_TOKEN: string;
}

export class KrathongRoom extends DurableObject<Env> {
  private activeKrathongs: KrathongEvent[] = [];
  private krathongQueue: KrathongEvent[] = [];
  private userLastKrathongTime: Map<string, number> = new Map();
  private isPaused: boolean = false;
  private mode: 'live' | 'fallback' = 'live';
  private lastEventTime: number = Date.now();
  private totalKrathongs: number = 0;
  private totalLikes: number = 0;
  private blockedUsers: Set<string> = new Set();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Initialize SQLite table if not exists
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value INTEGER
      );
      CREATE TABLE IF NOT EXISTS blocked_users (
        user_id TEXT PRIMARY KEY,
        created_at INTEGER
      );
    `);

    // Restore state from SQLite safely
    const totalRows = this.ctx.storage.sql.exec(`SELECT value FROM stats WHERE key = 'total_krathongs'`).toArray();
    if (totalRows.length > 0) {
      this.totalKrathongs = Number(totalRows[0].value);
    }
    const likesRows = this.ctx.storage.sql.exec(`SELECT value FROM stats WHERE key = 'total_likes'`).toArray();
    if (likesRows.length > 0) {
      this.totalLikes = Number(likesRows[0].value);
    }

    const blockedRows = this.ctx.storage.sql.exec(`SELECT user_id FROM blocked_users`).toArray();
    for (const row of blockedRows) {
      this.blockedUsers.add(String(row.user_id));
    }
  }

  // --- Fetch Handler (Handles WebSocket upgrade from Worker) ---
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      this.ctx.acceptWebSocket(server, ['viewer']);

      // Send initial snapshot
      const snapshotMsg: ServerMessage = {
        type: 'snapshot',
        total: this.totalKrathongs,
        active: this.activeKrathongs,
        mode: this.mode,
      };
      server.send(JSON.stringify(snapshotMsg));

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Not Found in Room', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Read-only clients, but can handle ping/pong if needed
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    ws.close(code, reason);
  }

  private broadcast(message: ServerMessage) {
    const sockets = this.ctx.getWebSockets('viewer');
    const payload = JSON.stringify(message);
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch (err) {
        // Socket may have closed
      }
    }
  }

  // --- Core Processing Logic ---
  public processEvents(events: KrathongEvent[]) {
    this.lastEventTime = Date.now();
    if (this.isPaused) return;

    for (const event of events) {
      if (this.blockedUsers.has(event.user.id)) {
        continue;
      }

      if (event.kind === 'like') {
        this.totalLikes += (event.likeCount || 1);
        this.saveStat('total_likes', this.totalLikes);
        if (this.totalLikes % 500 === 0) {
          this.broadcast({ type: 'lantern', likeTotal: this.totalLikes });
        }
        continue;
      }

      if (event.kind === 'follow') {
        this.broadcast({ type: 'firework', name: event.user.name });
        continue;
      }

      if (event.kind === 'comment' || event.kind === 'gift') {
        const isGift = event.kind === 'gift';

        // Rate limit: 1 krathong per user per 10s (gifts bypass)
        const lastTime = this.userLastKrathongTime.get(event.user.id) || 0;
        if (!isGift && Date.now() - lastTime < 10000) {
          continue;
        }
        this.userLastKrathongTime.set(event.user.id, Date.now());

        // Sanitize text & extract style
        const sanitized = sanitizeWishText(event.text || '');
        event.text = sanitized.text;
        if (!event.style) {
          event.style = isGift 
            ? ((event.giftValue || 0) >= 100 ? 'gold-aura' : 'gold')
            : (sanitized.style || 'banana');
        }

        // Add to active krathongs or queue
        this.enqueueKrathong(event);
      }
    }
  }

  private enqueueKrathong(event: KrathongEvent) {
    this.totalKrathongs++;
    this.saveStat('total_krathongs', this.totalKrathongs);

    if (this.activeKrathongs.length < 40) {
      this.activeKrathongs.push(event);
      this.broadcast({ type: 'krathong', event });

      // Automatically remove from active after screen duration (simulate 25-60s)
      const duration = event.style === 'gold-aura' ? 60000 : (event.style === 'gold' ? 40000 : 25000);
      setTimeout(() => {
        this.activeKrathongs = this.activeKrathongs.filter(k => k.id !== event.id);
        this.promoteQueue();
      }, duration);
    } else {
      // Queue management: max 200 items, drop oldest normal comments if full
      if (this.krathongQueue.length >= 200) {
        const dropIndex = this.krathongQueue.findIndex(k => k.kind !== 'gift');
        if (dropIndex !== -1) {
          this.krathongQueue.splice(dropIndex, 1);
        } else {
          // If all are gifts, drop oldest
          this.krathongQueue.shift();
        }
      }
      this.krathongQueue.push(event);
    }
  }

  private promoteQueue() {
    if (this.krathongQueue.length > 0 && this.activeKrathongs.length < 40) {
      const next = this.krathongQueue.shift();
      if (next) {
        this.activeKrathongs.push(next);
        this.broadcast({ type: 'krathong', event: next });

        const duration = next.style === 'gold-aura' ? 60000 : (next.style === 'gold' ? 40000 : 25000);
        setTimeout(() => {
          this.activeKrathongs = this.activeKrathongs.filter(k => k.id !== next.id);
          this.promoteQueue();
        }, duration);
      }
    }
  }

  // --- Admin Controls ---
  public clearScreen() {
    this.activeKrathongs = [];
    this.krathongQueue = [];
    this.broadcast({ type: 'control', action: 'clear' });
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    this.broadcast({ type: 'control', action: paused ? 'pause' : 'resume' });
  }

  public setMode(mode: 'live' | 'fallback') {
    this.mode = mode;
    this.broadcast({ type: 'control', action: mode });
  }

  public blockUser(userId: string) {
    this.blockedUsers.add(userId);
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO blocked_users (user_id, created_at) VALUES (?, ?)`,
      userId,
      Date.now()
    );
    // Remove active krathongs from this user
    this.activeKrathongs = this.activeKrathongs.filter(k => k.user.id !== userId);
    this.krathongQueue = this.krathongQueue.filter(k => k.user.id !== userId);
    this.broadcast({ type: 'control', action: 'clear' });
  }

  public getStats(): AdminStats {
    return {
      totalKrathongs: this.totalKrathongs,
      activeCount: this.activeKrathongs.length,
      queueCount: this.krathongQueue.length,
      likeTotal: this.totalLikes,
      lastEventTime: this.lastEventTime,
      isPaused: this.isPaused,
      mode: this.mode,
      blockedUsersCount: this.blockedUsers.size,
    };
  }

  private saveStat(key: string, value: number) {
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO stats (key, value) VALUES (?, ?)`,
      key,
      value
    );
  }
}

