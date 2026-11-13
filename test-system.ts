import { sanitizeWishText, generateMockEvent } from './apps/ingestor/src/mock';
// Also test shared package directly
import { sanitizeWishText as sanitizeShared } from './packages/shared/src/filter';

async function runTests() {
  console.log('--- 1. Testing Sanitization & Word Filter ---');
  
  // Test 1: Style extraction and URL stripping
  const res1 = sanitizeShared('ขอให้เฮงๆ รวยๆ https://scam.com/buy #ดอกบัว');
  console.log('Test 1 (Tag & URL):', res1);
  if (res1.style !== 'lotus' || res1.text.includes('http')) {
    throw new Error('Test 1 Failed: URL not removed or style not extracted');
  }

  // Test 2: Phone number stripping
  const res2 = sanitizeShared('โทรมานะ 081-234-5678 #ขนมปัง');
  console.log('Test 2 (Phone Number):', res2);
  if (res2.style !== 'bread' || res2.text.includes('081')) {
    throw new Error('Test 2 Failed: Phone number not removed');
  }

  // Test 3: Profanity filter
  const res3 = sanitizeShared('ขอให้คนนั้น ควย หายไปจากชีวิต');
  console.log('Test 3 (Profanity Filter):', res3);
  if (!res3.isProfane || res3.text !== '') {
    throw new Error('Test 3 Failed: Profanity not caught or text not blanked');
  }

  // Test 4: Length truncation (40 chars)
  const longText = 'ก'.repeat(60);
  const res4 = sanitizeShared(longText);
  console.log(`Test 4 (Truncate): length=${res4.text.length}`);
  if (res4.text.length > 40) {
    throw new Error('Test 4 Failed: Text exceeds 40 chars');
  }

  console.log('--- 2. Testing Mock Event Generator ---');
  for (let i = 0; i < 5; i++) {
    const mockEv = generateMockEvent();
    console.log(`Mock Event ${i + 1}: [${mockEv.kind}] from ${mockEv.user.name} - text: ${mockEv.text || '-'}`);
    if (!mockEv.id || !mockEv.source || !mockEv.user) {
      throw new Error('Invalid mock event generated');
    }
  }

  console.log('\nAll Unit & Logic Tests Passed Successfully! ✅');
}

runTests().catch((err) => {
  console.error('Test Failed ❌:', err);
  process.exit(1);
});
