import { generateMockEvent } from './apps/ingestor/src/mock';

const ROOM_URL = process.env.ROOM_URL || 'http://127.0.0.1:8787';
const INGEST_SECRET = process.env.INGEST_SECRET || 'secret_loy_kratong_ingest_key';

async function sendBatch(events: any[]) {
  try {
    const res = await fetch(`${ROOM_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Secret': INGEST_SECRET,
      },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) {
      console.error('Failed to send batch:', res.status, res.statusText);
    }
  } catch (err: any) {
    console.error('Network error sending batch:', err.message);
  }
}

async function runSimulation() {
  console.log('🌊 Starting High-Density Krathong Wave Simulation...');
  console.log('Sending initial rush of 25 Krathongs...');

  // Phase 1: Burst of 25 krathongs
  for (let i = 0; i < 25; i++) {
    const evt = generateMockEvent();
    await sendBatch([evt]);
    await new Promise(r => setTimeout(r, 120)); // staggered spawn
  }

  console.log('✅ Initial wave launched! Now maintaining continuous stream of 2-3 krathongs/sec...');

  // Phase 2: Steady lively stream (1-2 every 600ms)
  let count = 25;
  while (true) {
    const evt = generateMockEvent();
    await sendBatch([evt]);
    count++;
    if (count % 10 === 0) {
      console.log(`[Stream Active] Total Krathongs spawned in simulation: ${count}`);
    }
    await new Promise(r => setTimeout(r, 650));
  }
}

runSimulation().catch(console.error);

