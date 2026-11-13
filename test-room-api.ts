const BASE_URL = 'http://127.0.0.1:8787';
const INGEST_SECRET = 'secret_loy_kratong_ingest_key';
const ADMIN_TOKEN = 'admin_loy_kratong_master_token';

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runApiTests() {
  console.log('Connecting to Room at', BASE_URL);

  // 1. Health check
  const rootRes = await fetch(`${BASE_URL}/`);
  const rootText = await rootRes.text();
  console.log('1. Health check:', rootRes.status, rootText);
  if (!rootRes.ok) throw new Error('Health check failed');

  // 2. Test Ingestor POST /events
  const mockEvent = {
    id: 'test-evt-1',
    source: 'tiktok',
    kind: 'comment',
    user: { id: 'u-1', name: 'Test User' },
    text: 'ขอให้รวยๆ #ดอกบัว',
    ts: Date.now(),
  };

  const pushRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ingest-Secret': INGEST_SECRET,
    },
    body: JSON.stringify({ events: [mockEvent] }),
  });
  const pushJson = await pushRes.json();
  console.log('2. Ingestor POST /events:', pushRes.status, pushJson);
  if (!pushRes.ok) throw new Error('Failed to push events');

  // 3. Test Web Krathong POST /krathong
  const webRes = await fetch(`${BASE_URL}/krathong`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'น้องสายธาร',
      wish: 'ขอให้ครอบครัวแข็งแรง มีสุข',
      style: 'banana',
    }),
  });
  const webJson = await webRes.json();
  console.log('3. Web POST /krathong:', webRes.status, webJson);
  if (!webRes.ok) throw new Error('Failed to create web krathong');

  // 4. Test Admin GET /stats
  const statsRes = await fetch(`${BASE_URL}/stats`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  const statsJson = await statsRes.json();
  console.log('4. Admin GET /stats:', statsRes.status, statsJson);
  if (!statsRes.ok || statsJson.totalKrathongs < 2) {
    throw new Error('Stats did not reflect created krathongs');
  }

  // 5. Test Admin POST /admin
  const adminRes = await fetch(`${BASE_URL}/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ action: 'pause' }),
  });
  const adminJson = await adminRes.json();
  console.log('5. Admin POST /admin (pause):', adminRes.status, adminJson);
  if (!adminRes.ok) throw new Error('Admin action failed');

  // Resume
  await fetch(`${BASE_URL}/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ action: 'resume' }),
  });

  // 6. Test WebSocket connection
  console.log('6. Testing WebSocket connection...');
  const ws = new WebSocket('ws://127.0.0.1:8787/ws');
  
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log('WebSocket received message:', msg);
      if (msg.type === 'snapshot') {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    };
    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };
  });

  console.log('\nAll End-to-End Room & WebSocket Tests Passed! 🚀');
}

runApiTests().catch((err) => {
  console.error('API Test Error:', err);
  process.exit(1);
});

