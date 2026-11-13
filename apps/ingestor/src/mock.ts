import { KrathongEvent } from '@loy-kratong/shared';

const MOCK_USERS = [
  { id: 'mock-1', name: 'สมชาย สายบุญ' },
  { id: 'mock-2', name: 'น้องปราง ใจดี' },
  { id: 'mock-3', name: 'พี่เบิร์ด ร้อยล้าน' },
  { id: 'mock-4', name: 'กิตติกร รักแมว' },
  { id: 'mock-5', name: 'ใบเฟิร์น' },
  { id: 'mock-6', name: 'Nutty Story' },
  { id: 'mock-7', name: 'มินนี่' },
];

const MOCK_WISHES = [
  'ขอให้สุขภาพแข็งแรง ร่ำรวยเงินทอง #ใบตอง',
  'ขอให้สอบติด ได้งานใหม่ ปังๆ #ดอกบัว',
  'ขอให้เจอความรักดีๆ มีความสุขทุกวัน #ขนมปัง',
  'ขอให้ครอบครัวมีความสุข ปลอดภัยจากโรคภัย',
  'ขอให้ปีนี้มีแต่เรื่องดีๆ เข้ามาในชีวิต',
  'ขอให้ถูกหวยรางวัลที่ 1 สาธุๆ #ดอกบัว',
  'ขอให้คนไทยทุกคนมีความสุข สดใส',
];

export function generateMockEvent(): KrathongEvent {
  const rand = Math.random();
  const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

  if (rand < 0.1) {
    // 10% Follow
    return {
      id: crypto.randomUUID(),
      source: 'mock',
      kind: 'follow',
      user,
      ts: Date.now(),
    };
  }

  if (rand < 0.25) {
    // 15% Like
    return {
      id: crypto.randomUUID(),
      source: 'mock',
      kind: 'like',
      user,
      likeCount: Math.floor(Math.random() * 50) + 1,
      ts: Date.now(),
    };
  }

  if (rand < 0.35) {
    // 10% Gift
    const isBig = Math.random() < 0.2;
    return {
      id: crypto.randomUUID(),
      source: 'mock',
      kind: 'gift',
      user,
      giftValue: isBig ? 150 : 20,
      style: isBig ? 'gold-aura' : 'gold',
      text: isBig ? 'ขอให้เฮงๆ รวยๆ ปังๆ ทะลุเป้า!' : 'ส่งกำลังใจให้สตรีมเมอร์ครับ',
      ts: Date.now(),
    };
  }

  // 65% Comment
  const wish = MOCK_WISHES[Math.floor(Math.random() * MOCK_WISHES.length)];
  return {
    id: crypto.randomUUID(),
    source: 'mock',
    kind: 'comment',
    user,
    text: wish,
    ts: Date.now(),
  };
}

