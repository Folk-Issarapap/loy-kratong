import dotenv from 'dotenv';
// @ts-ignore - legacy submodule export
import { WebcastPushConnection } from 'tiktok-live-connector/legacy';
import { KrathongEvent } from '@loy-kratong/shared';
import { generateMockEvent } from './mock.js';

dotenv.config();

const ROOM_URL = process.env.ROOM_URL || 'http://127.0.0.1:8787';
const INGEST_SECRET = process.env.INGEST_SECRET || 'secret_loy_kratong_ingest_key';
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
const IS_MOCK = process.env.MOCK === 'true' || process.argv.includes('--mock');
const MOCK_RATE_PER_SEC = parseInt(process.env.MOCK_RATE || '2', 10);

let eventQueue: KrathongEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

async function flushEvents() {
  if (eventQueue.length === 0) return;

  const batch = [...eventQueue];
  eventQueue = [];

  try {
    const res = await fetch(`${ROOM_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Secret': INGEST_SECRET,
      },
      body: JSON.stringify({ events: batch }),
    });

    if (!res.ok) {
      console.error(`[Ingestor] Failed to push events: ${res.status} ${res.statusText}`);
    } else {
      console.log(`[Ingestor] Pushed ${batch.length} events to room`);
    }
  } catch (err: any) {
    console.error(`[Ingestor] Error sending batch to room: ${err.message}`);
  }
}

function queueEvent(event: KrathongEvent) {
  eventQueue.push(event);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushEvents();
    }, 250); // Batch every 250ms
  }
}

// --- TikTok LIVE Connection Logic ---
function startTikTokConnector(username: string) {
  console.log(`[Ingestor] Connecting to TikTok LIVE: @${username}`);

  const tiktokLive = new WebcastPushConnection(username, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
  });

  tiktokLive.on('chat', (data: any) => {
    queueEvent({
      id: crypto.randomUUID(),
      source: 'tiktok',
      kind: 'comment',
      user: {
        id: data.userId || data.uniqueId,
        name: data.nickname || data.uniqueId,
        avatar: data.profilePictureUrl,
      },
      text: data.comment,
      ts: Date.now(),
    });
  });

  tiktokLive.on('gift', (data: any) => {
    // Only count when streak ends or diamondCount > 0
    if (data.giftType === 1 && !data.repeatEnd) {
      return; // Combo still in progress, wait for end
    }

    const totalDiamonds = (data.diamondCount || 1) * (data.repeatCount || 1);
    queueEvent({
      id: crypto.randomUUID(),
      source: 'tiktok',
      kind: 'gift',
      user: {
        id: data.userId || data.uniqueId,
        name: data.nickname || data.uniqueId,
        avatar: data.profilePictureUrl,
      },
      giftValue: totalDiamonds,
      style: totalDiamonds >= 100 ? 'gold-aura' : 'gold',
      text: data.describe || 'ส่งของขวัญลอยกระทง',
      ts: Date.now(),
    });
  });

  tiktokLive.on('like', (data: any) => {
    queueEvent({
      id: crypto.randomUUID(),
      source: 'tiktok',
      kind: 'like',
      user: {
        id: data.userId || data.uniqueId,
        name: data.nickname || data.uniqueId,
      },
      likeCount: data.likeCount || 1,
      ts: Date.now(),
    });
  });

  tiktokLive.on('follow', (data: any) => {
    queueEvent({
      id: crypto.randomUUID(),
      source: 'tiktok',
      kind: 'follow',
      user: {
        id: data.userId || data.uniqueId,
        name: data.nickname || data.uniqueId,
      },
      ts: Date.now(),
    });
  });

  let backoffMs = 2000;
  function connectWithRetry() {
    tiktokLive.connect()
      .then((state: any) => {
        console.log(`[Ingestor] Connected to TikTok LIVE room: ${state?.roomId || 'ok'}`);
        backoffMs = 2000; // Reset backoff
      })
      .catch((err: any) => {
        console.error(`[Ingestor] Failed to connect: ${err.message}. Retrying in ${backoffMs / 1000}s...`);
        setTimeout(connectWithRetry, backoffMs);
        backoffMs = Math.min(backoffMs * 2, 30000);
      });
  }

  connectWithRetry();
}

// --- Main Entry ---
async function main() {
  console.log('=== Loy Krathong Ingestor Starting ===');
  console.log(`Target Room URL: ${ROOM_URL}`);

  if (IS_MOCK || !TIKTOK_USERNAME) {
    console.log(`[Ingestor] Running in MOCK Mode (~${MOCK_RATE_PER_SEC} events/sec)...`);
    const interval = Math.max(20, Math.floor(1000 / MOCK_RATE_PER_SEC));
    setInterval(() => {
      queueEvent(generateMockEvent());
    }, interval);
  } else {
    startTikTokConnector(TIKTOK_USERNAME);
  }
}

main().catch(console.error);
