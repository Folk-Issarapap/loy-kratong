import { KrathongStyle } from './types';

// Common profane words dictionary (Thai + English)
const BANNED_WORDS = [
  'ควย', 'เหี้ย', 'เย็ด', 'สัส', 'มึง', 'กู', 'ด่าง', 'ห่า', 'ดอกทอง', 'กะหรี่',
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'bastard', 'cunt'
];

export interface TextSanitizeResult {
  text: string;
  isProfane: boolean;
  style?: KrathongStyle;
}

export function sanitizeWishText(rawText: string = ''): TextSanitizeResult {
  let text = rawText.trim();
  let detectedStyle: KrathongStyle | undefined = undefined;

  // Extract style tag
  if (text.includes('#ดอกบัว') || text.includes('#บัว')) {
    detectedStyle = 'lotus';
    text = text.replace(/#(ดอกบัว|บัว)/g, '');
  } else if (text.includes('#ขนมปัง') || text.includes('#ปัง')) {
    detectedStyle = 'bread';
    text = text.replace(/#(ขนมปัง|ปัง)/g, '');
  } else if (text.includes('#ใบตอง')) {
    detectedStyle = 'banana';
    text = text.replace(/#ใบตอง/g, '');
  }

  // Remove URLs / Links
  text = text.replace(/https?:\/\/\S+/gi, '');
  text = text.replace(/www\.\S+/gi, '');
  text = text.replace(/[a-zA-Z0-9-]+\.(com|net|org|co|th|xyz|io|live|app)\b/gi, '');

  // Remove Phone numbers (e.g. 081-xxx-xxxx, 0812345678)
  text = text.replace(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g, '');
  text = text.replace(/\b\d{9,10}\b/g, '');

  // Remove @mentions
  text = text.replace(/@\w+/g, '');

  // Clean excess whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Check profanity
  const lowerText = text.toLowerCase();
  const isProfane = BANNED_WORDS.some(word => lowerText.includes(word));

  // Truncate to 40 characters
  if (text.length > 40) {
    text = text.slice(0, 40);
  }

  return {
    text: isProfane ? '' : text, // FR-06: if profane, hide wish text but allow krathong
    isProfane,
    style: detectedStyle,
  };
}

