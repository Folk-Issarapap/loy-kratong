export type KrathongSource = 'tiktok' | 'web' | 'mock';
export type KrathongKind = 'comment' | 'gift' | 'like' | 'follow' | 'share';
export type KrathongStyle = 'banana' | 'lotus' | 'bread' | 'gold' | 'gold-aura';

export interface KrathongUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface KrathongEvent {
  id: string; // uuid
  source: KrathongSource;
  kind: KrathongKind;
  user: KrathongUser;
  text?: string; // filtered wish
  style?: KrathongStyle;
  giftValue?: number; // diamonds total
  likeCount?: number;
  ts: number; // ms epoch
}

export type ServerMessage =
  | { type: 'snapshot'; total: number; active: KrathongEvent[]; mode: 'live' | 'fallback' }
  | { type: 'krathong'; event: KrathongEvent }
  | { type: 'lantern'; likeTotal: number }
  | { type: 'firework'; name: string }
  | { type: 'control'; action: 'clear' | 'pause' | 'resume' | 'fallback' | 'live' };

export interface AdminStats {
  totalKrathongs: number;
  activeCount: number;
  queueCount: number;
  likeTotal: number;
  lastEventTime: number;
  isPaused: boolean;
  mode: 'live' | 'fallback';
  blockedUsersCount: number;
}

