import { KrathongEvent } from '@loy-kratong/shared';

const FIRST_NAMES = [
  'น้องฟ้า', 'พี่บอย', 'หมอน้ำใส', 'คุณแม่บงกช', 'ต้นกล้า', 'น้องมิวสิค',
  'กิตติเดช', 'แพรววา', 'ลุงสมพร', 'โบว์วี่', 'ต้า บอสใหญ่', 'พี่กอล์ฟ พระราม 9',
  'เนย สดใส', 'ไอซ์แลนด์', 'พิมมี่ ช็อปปิ้ง', 'เจมส์ ชวนเที่ยว', 'เชฟเต๋า',
  'ป้าแดง ตลาดพลู', 'ปอนด์ คนโก้', 'กัปตันมิว', 'ใบเตย กลิ่นหอม', 'นัท สตูดิโอ',
  'พี่อาร์ท กราฟิก', 'หญิงนุช', 'เต้ย คนเดิม', 'จิ๊บจิ๊บ', 'แบงค์ พันล้าน',
  'กี้ สายหวาน', 'วิว สวยงาม', 'อาร์ม นครปฐม', 'บีม สุพรรณ', 'เมย์ ชิลชิล'
];

const WISHES = [
  'ขอให้ปีนี้สอบผ่านเกียรตินิยม #ดอกบัว',
  'ขอให้ความรักสมหวัง เจอเนื้อคู่ที่ดี #ดอกบัว',
  'ขอให้สุขภาพร่างกายแข็งแรง ไร้โรคภัย #ใบตอง',
  'ขอให้ปลดหนี้ มีเงินเก็บเป็นล้านๆ #ใบตอง',
  'ขอให้ครอบครัวมีความสุข อยู่เย็นเป็นสุข #ขนมปัง',
  'ขอให้น้องหมาน้องแมวสุขภาพดี มีความสุข #ขนมปัง',
  'ขอให้งานปังๆ ได้เลื่อนตำแหน่ง โบนัสฉ่ำๆ #ใบตอง',
  'ขอให้ถูกรางวัลที่ 1 รวยข้ามคืน สาธุ! #ดอกบัว',
  'ลอยเคราะห์ ลอยโศก สิ่งไม่ดีทิ้งไปให้หมด #ใบตอง',
  'ขอให้ใจสงบ มีความสุขทุกๆ วัน #ดอกบัว',
  'ขอให้มีเงินใช้ไม่ขาดมือ รวยๆ เฮงๆ #ขนมปัง',
  'ขอให้ธุรกิจรุ่งเรือง ลูกค้าเข้าร้านแน่นๆ #ใบตอง',
  'ขอให้ความเศร้าจางหาย มีแต่รอยยิ้ม #ดอกบัว',
  'ขอให้ได้ไปเที่ยวต่างประเทศปลายปีนี้ #ขนมปัง',
  'ขอให้ความฝันทุกข้อเป็นจริง #ดอกบัว'
];

export function generateMockEvent(): KrathongEvent {
  const rand = Math.random();
  const randomName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const userId = `mock-${Math.floor(Math.random() * 100000)}`;

  const user = {
    id: userId,
    name: randomName,
  };

  if (rand < 0.15) {
    // 15% Like
    return {
      id: crypto.randomUUID(),
      source: 'mock',
      kind: 'like',
      user,
      likeCount: Math.floor(Math.random() * 45) + 5,
      ts: Date.now(),
    };
  }

  if (rand < 0.25) {
    // 10% Gift (Gold Krathong)
    const isBig = Math.random() < 0.35;
    return {
      id: crypto.randomUUID(),
      source: 'mock',
      kind: 'gift',
      user,
      giftValue: isBig ? 180 : 30,
      style: isBig ? 'gold-aura' : 'gold',
      text: isBig ? 'ขอให้ร่ำรวย เฮงๆ รวยปังตลอดปี!' : 'ส่งกระทงทองคำกำลังใจจ้า',
      ts: Date.now(),
    };
  }

  // 75% Comment
  const wish = WISHES[Math.floor(Math.random() * WISHES.length)];
  return {
    id: crypto.randomUUID(),
    source: 'mock',
    kind: 'comment',
    user,
    text: wish,
    ts: Date.now(),
  };
}
