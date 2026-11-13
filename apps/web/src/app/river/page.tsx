'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { KrathongEvent, ServerMessage } from '@loy-kratong/shared';
import { Sparkles, Heart } from 'lucide-react';

const WS_URL = process.env.NEXT_PUBLIC_ROOM_WS_URL || 'ws://127.0.0.1:8787/ws';

interface VisualKrathong {
  id: string;
  container: PIXI.Container;
  event: KrathongEvent;
  lane: number;
  progress: number; // 0 (spawn) to 1 (horizon)
  speed: number;
  driftOffset: number;
  isAmbient?: boolean;
}

interface SkyStar {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

interface SkyLantern {
  x: number;
  y: number;
  speedY: number;
  swaySpeed: number;
  swayAmp: number;
  phase: number;
  scale: number;
  alpha: number;
}

export default function RiverPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const krathongsRef = useRef<VisualKrathong[]>([]);
  const riverContainerRef = useRef<PIXI.Container | null>(null);

  const [scale, setScale] = useState(1);
  const [totalKrathongs, setTotalKrathongs] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [recentGift, setRecentGift] = useState<{ name: string; text: string } | null>(null);
  const [mode, setMode] = useState<'live' | 'fallback'>('live');
  const [recentWishes, setRecentWishes] = useState<KrathongEvent[]>([]);

  // Handle responsive scaling for desktop/browser preview vs OBS 1080x1920
  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1080;
      const scaleY = window.innerHeight / 1920;
      setScale(Math.min(scaleX, scaleY));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let app: PIXI.Application;
    let isCancelled = false;

    async function initPixi() {
      if (!canvasRef.current) return;

      app = new PIXI.Application();
      await app.init({
        canvas: canvasRef.current,
        width: 1080,
        height: 1920,
        backgroundColor: 0x050816,
        antialias: true,
        resolution: 1,
      });

      if (isCancelled) {
        app.destroy(true);
        return;
      }

      appRef.current = app;

      // ==========================================
      // 1. SKY & MOON LAYER
      // ==========================================
      const skyContainer = new PIXI.Container();
      app.stage.addChild(skyContainer);

      const skyBg = new PIXI.Graphics();
      // Deep midnight gradient simulation
      skyBg.rect(0, 0, 1080, 820);
      skyBg.fill(0x060919);
      skyContainer.addChild(skyBg);

      // Stars
      const starsGraphics = new PIXI.Graphics();
      skyContainer.addChild(starsGraphics);

      const stars: SkyStar[] = [];
      for (let i = 0; i < 90; i++) {
        stars.push({
          x: Math.random() * 1080,
          y: Math.random() * 750,
          radius: Math.random() * 2 + 0.8,
          baseAlpha: Math.random() * 0.7 + 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.04 + 0.01,
        });
      }

      // Full Moon & Glowing Halos
      const moonContainer = new PIXI.Container();
      moonContainer.x = 840;
      moonContainer.y = 260;

      const moonGlow = new PIXI.Graphics();
      // Outer aura
      moonGlow.circle(0, 0, 160);
      moonGlow.fill({ color: 0xffd27d, alpha: 0.08 });
      moonGlow.circle(0, 0, 120);
      moonGlow.fill({ color: 0xffe89e, alpha: 0.16 });
      moonGlow.circle(0, 0, 85);
      moonGlow.fill({ color: 0xfff3c4, alpha: 0.35 });
      // Moon surface
      moonGlow.circle(0, 0, 65);
      moonGlow.fill(0xfff8db);
      // Soft crater textures
      moonGlow.circle(-18, -12, 14);
      moonGlow.fill({ color: 0xeadbb0, alpha: 0.35 });
      moonGlow.circle(16, 14, 18);
      moonGlow.fill({ color: 0xeadbb0, alpha: 0.3 });
      moonGlow.circle(-8, 22, 10);
      moonGlow.fill({ color: 0xeadbb0, alpha: 0.25 });

      moonContainer.addChild(moonGlow);
      skyContainer.addChild(moonContainer);

      // Sky Lanterns (โคมลอย) in background
      const lanternsContainer = new PIXI.Container();
      skyContainer.addChild(lanternsContainer);

      const skyLanterns: SkyLantern[] = [];
      for (let i = 0; i < 12; i++) {
        skyLanterns.push({
          x: Math.random() * 950 + 50,
          y: Math.random() * 700 + 50,
          speedY: Math.random() * 0.3 + 0.15,
          swaySpeed: Math.random() * 0.02 + 0.01,
          swayAmp: Math.random() * 15 + 5,
          phase: Math.random() * Math.PI * 2,
          scale: Math.random() * 0.5 + 0.4,
          alpha: Math.random() * 0.4 + 0.5,
        });
      }

      // ==========================================
      // 2. HORIZON SILHOUETTES (วัด & เจดีย์ & ต้นไม้)
      // ==========================================
      const horizonGraphics = new PIXI.Graphics();
      const horizonY = 820;

      // Temple Pagoda Silhouette (เจดีย์ทรงไทย)
      horizonGraphics.poly([
        540, horizonY - 140, // Spire top
        544, horizonY - 110,
        555, horizonY - 80,
        570, horizonY - 50,
        585, horizonY - 20,
        595, horizonY,
        485, horizonY,
        495, horizonY - 20,
        510, horizonY - 50,
        525, horizonY - 80,
        536, horizonY - 110,
      ]);
      horizonGraphics.fill(0x040611);

      // Distant tree lines & riverside banks
      for (let x = 0; x <= 1080; x += 40) {
        const treeH = Math.sin(x * 0.05) * 18 + 25;
        horizonGraphics.ellipse(x, horizonY - treeH / 2, 28, treeH);
        horizonGraphics.fill(0x050814);
      }

      app.stage.addChild(horizonGraphics);

      // ==========================================
      // 3. RIVER WATER & WAVES LAYER
      // ==========================================
      const riverBg = new PIXI.Graphics();
      riverBg.rect(0, horizonY, 1080, 1100);
      riverBg.fill(0x08132e);
      app.stage.addChild(riverBg);

      // Moonlight shimmer path on water
      const moonReflection = new PIXI.Graphics();
      app.stage.addChild(moonReflection);

      // Waves graphics
      const waveGraphics = new PIXI.Graphics();
      app.stage.addChild(waveGraphics);

      // River Container for Krathongs
      const riverContainer = new PIXI.Container();
      app.stage.addChild(riverContainer);
      riverContainerRef.current = riverContainer;

      // ==========================================
      // 4. ANIMATION TICKER LOOP
      // ==========================================
      let timeCount = 0;

      app.ticker.add((time) => {
        const delta = time.deltaTime;
        timeCount += delta * 0.04;

        // Twinkle stars
        starsGraphics.clear();
        for (const star of stars) {
          star.phase += star.speed * delta;
          const currentAlpha = star.baseAlpha + Math.sin(star.phase) * 0.25;
          starsGraphics.circle(star.x, star.y, star.radius);
          starsGraphics.fill({ color: 0xffffff, alpha: Math.max(0.1, currentAlpha) });
        }

        // Animate sky lanterns rising
        lanternsContainer.removeChildren();
        for (const lantern of skyLanterns) {
          lantern.y -= lantern.speedY * delta;
          lantern.phase += lantern.swaySpeed * delta;
          const lanternX = lantern.x + Math.sin(lantern.phase) * lantern.swayAmp;

          if (lantern.y < -30) {
            lantern.y = 780;
            lantern.x = Math.random() * 950 + 50;
          }

          const lg = new PIXI.Graphics();
          // Lantern glow
          lg.circle(lanternX, lantern.y, 16 * lantern.scale);
          lg.fill({ color: 0xffa040, alpha: 0.2 * lantern.alpha });
          // Lantern body
          lg.roundRect(
            lanternX - 7 * lantern.scale,
            lantern.y - 10 * lantern.scale,
            14 * lantern.scale,
            18 * lantern.scale,
            3 * lantern.scale
          );
          lg.fill({ color: 0xffdd77, alpha: 0.9 * lantern.alpha });
          lanternsContainer.addChild(lg);
        }

        // Moonlight reflection on river
        moonReflection.clear();
        for (let y = horizonY + 10; y < 1920; y += 35) {
          const depthProgress = (y - horizonY) / 1100;
          const width = 120 + depthProgress * 280;
          const shimmer = Math.sin(y * 0.05 + timeCount * 1.5) * 20;
          moonReflection.ellipse(840 + shimmer, y, width / 2, 4);
          moonReflection.fill({ color: 0xffe28a, alpha: 0.08 + (1 - depthProgress) * 0.08 });
        }

        // Gentle animated waves
        waveGraphics.clear();
        for (let row = 0; row < 12; row++) {
          const waveY = horizonY + 80 + row * 85;
          const wavePhase = timeCount + row * 0.8;
          const waveWidth = 70 + row * 15;
          for (let col = 0; col < 6; col++) {
            const waveX = (col * 220 + Math.sin(wavePhase) * 40 + (row % 2) * 110) % 1150 - 50;
            waveGraphics.arc(waveX, waveY, waveWidth / 2, 0, Math.PI);
            waveGraphics.stroke({
              width: 1.5 + (row / 12) * 1.5,
              color: 0x1d3568,
              alpha: 0.35 + (row / 12) * 0.3,
            });
          }
        }

        // Update active Krathongs
        const activeList = krathongsRef.current;
        for (let i = activeList.length - 1; i >= 0; i--) {
          const item = activeList[i];
          item.progress += item.speed * delta;

          // Stagger spawn Y by lane so they do not line up horizontally
          const startY = 1440 + (item.lane % 3) * 40;
          const endY = 830;
          const currentY = startY - (startY - endY) * item.progress;

          // 5 lanes across 1080 width: [180, 360, 540, 720, 900]
          const laneX = 180 + item.lane * 180;
          const driftX = Math.sin(item.progress * 5 + item.driftOffset) * 22;

          item.container.x = laneX + driftX;
          item.container.y = currentY;

          // Perspective scaling & fading: 1.0 down to 0.4 near horizon
          const scaleVal = 1.0 - item.progress * 0.6;
          item.container.scale.set(scaleVal);
          item.container.alpha = item.progress > 0.85 ? (1 - item.progress) / 0.15 : 1;

          // Fade out the name badge as krathong floats deeper into the river
          const badge = item.container.getChildByLabel('badge');
          if (badge) {
            badge.alpha = item.progress > 0.35 ? Math.max(0, (0.65 - item.progress) / 0.3) : 1;
          }

          // Remove when reaching horizon
          if (item.progress >= 1) {
            riverContainer.removeChild(item.container);
            item.container.destroy({ children: true });
            activeList.splice(i, 1);

            // If ambient krathong finished, spawn a new one to keep river alive
            if (item.isAmbient) {
              spawnAmbientKrathong();
            }
          }
        }
      });

      // Spawn initial ambient krathongs so river is NEVER empty
      for (let i = 0; i < 6; i++) {
        spawnAmbientKrathong(Math.random() * 0.7);
      }
    }

    // Helper: Draw detailed Krathong
    function createKrathongGraphics(style: string) {
      const g = new PIXI.Graphics();
      const isGold = style === 'gold' || style === 'gold-aura';
      const isLotus = style === 'lotus';
      const isBread = style === 'bread';

      // 1. Water ripple underneath
      g.ellipse(0, 16, isGold ? 80 : 60, 18);
      g.fill({ color: isGold ? 0xffea75 : 0x173a70, alpha: 0.25 });

      // 2. Base layer (กระทงใบตอง / ขนมปัง / ดอกบัว)
      if (isLotus) {
        // Outer lotus petals (pink)
        for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 4) {
          const px = Math.cos(a) * 42;
          const py = Math.sin(a) * 20 + 4;
          g.ellipse(px, py, 22, 12);
          g.fill(0xf77fbe);
        }
        // Inner petals
        for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 3) {
          const px = Math.cos(a) * 24;
          const py = Math.sin(a) * 12 + 2;
          g.ellipse(px, py, 16, 9);
          g.fill(0xffb3da);
        }
        // Yellow pistil center
        g.ellipse(0, 0, 22, 12);
        g.fill(0xffea00);
      } else if (isGold) {
        // Gold Krathong base with aura
        g.circle(0, -10, 85);
        g.fill({ color: 0xffd700, alpha: 0.18 });

        // Lotus gold petals
        for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 4) {
          const px = Math.cos(a) * 55;
          const py = Math.sin(a) * 25 + 6;
          g.ellipse(px, py, 28, 16);
          g.fill(0xffc800);
          g.stroke({ width: 2, color: 0xfff099 });
        }
        g.ellipse(0, 4, 48, 24);
        g.fill(0xffea00);
      } else if (isBread) {
        // Bread Krathong (ขนมปังอบอุ่น)
        g.roundRect(-42, -12, 84, 32, 16);
        g.fill(0xc48b52);
        g.roundRect(-36, -8, 72, 24, 12);
        g.fill(0xdfad74);
      } else {
        // Traditional Banana Leaf (ใบตองจีบ)
        for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 5) {
          const px = Math.cos(a) * 44;
          const py = Math.sin(a) * 20 + 4;
          g.poly([
            px, py - 18,
            px + 14, py + 8,
            px - 14, py + 8,
          ]);
          g.fill(0x2d6a4f);
          g.stroke({ width: 1.5, color: 0x52b788 });
        }
        // Leaf disk
        g.ellipse(0, 4, 38, 18);
        g.fill(0x1b4332);
      }

      // 3. Three Incense Sticks (ธูป 3 ดอก)
      g.rect(-6, -38, 2, 28);
      g.fill(0xd97706);
      g.rect(-2, -44, 2, 34);
      g.fill(0xd97706);
      g.rect(2, -40, 2, 30);
      g.fill(0xd97706);
      // Incense glowing tips
      g.circle(-5, -38, 2);
      g.fill(0xff3b30);
      g.circle(-1, -44, 2);
      g.fill(0xff3b30);
      g.circle(3, -40, 2);
      g.fill(0xff3b30);

      // 4. Candle & Candlelight Aura (เทียนและแสงเทียน)
      // Wax body
      g.roundRect(8, -26, 8, 24, 2);
      g.fill(0xfff3b0);
      // Flame Glow Aura
      g.circle(12, -32, isGold ? 28 : 20);
      g.fill({ color: 0xffa500, alpha: 0.35 });
      // Flame outer
      g.ellipse(12, -32, isGold ? 8 : 6, isGold ? 14 : 10);
      g.fill(0xff6a00);
      // Flame core (bright yellow/white)
      g.ellipse(12, -30, isGold ? 4 : 3, isGold ? 8 : 6);
      g.fill(0xfffee0);

      return g;
    }

    // Spawn an ambient krathong without text to ensure scene is active
    function spawnAmbientKrathong(initialProgress: number = 0) {
      if (!riverContainerRef.current) return;

      const styles = ['banana', 'lotus', 'bread'];
      const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
      const container = new PIXI.Container();

      const graphics = createKrathongGraphics(chosenStyle);
      container.addChild(graphics);

      const lane = Math.floor(Math.random() * 5);
      const visualItem: VisualKrathong = {
        id: `ambient-${Math.random()}`,
        container,
        event: {
          id: '',
          source: 'mock',
          kind: 'comment',
          user: { id: '', name: '' },
          ts: Date.now(),
        },
        lane,
        progress: initialProgress,
        speed: 0.00028,
        driftOffset: Math.random() * Math.PI * 2,
        isAmbient: true,
      };

      riverContainerRef.current.addChild(container);
      krathongsRef.current.push(visualItem);
    }

    function spawnUserKrathong(event: KrathongEvent) {
      if (!riverContainerRef.current) return;

      const container = new PIXI.Container();
      const style = event.style || 'banana';
      const isGold = style === 'gold' || style === 'gold-aura';
      const isLotus = style === 'lotus';
      const isBread = style === 'bread';

      // 1. Krathong Visual Art
      const graphics = createKrathongGraphics(style);
      container.addChild(graphics);

      // 2. Compact Glassmorphism Name Badge
      const badgeContainer = new PIXI.Container();
      badgeContainer.label = 'badge';

      const iconPrefix = isGold ? '👑 ' : (isLotus ? '🪷 ' : (isBread ? '🍞 ' : '🌿 '));
      const shortName = event.user.name.length > 12 ? event.user.name.slice(0, 12) + '..' : event.user.name;
      const displayName = `${iconPrefix}${shortName}`;

      const nameText = new PIXI.Text({
        text: displayName,
        style: {
          fontFamily: 'Noto Sans Thai, sans-serif',
          fontSize: isGold ? 22 : 18,
          fill: isGold ? '#ffe600' : '#ffffff',
          fontWeight: 'bold',
        },
      });
      nameText.anchor.set(0.5, 0.5);

      const badgeW = Math.max(80, nameText.width + 24);
      const badgeH = 30;

      const badgeBg = new PIXI.Graphics();
      badgeBg.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 15);
      badgeBg.fill({ color: 0x050a18, alpha: 0.88 });
      badgeBg.stroke({
        width: 1.5,
        color: isGold ? 0xffd700 : (isLotus ? 0xf472b6 : (isBread ? 0xd97706 : 0x22c55e)),
        alpha: 0.9,
      });

      badgeContainer.addChild(badgeBg);
      badgeContainer.addChild(nameText);
      badgeContainer.y = -46;
      container.addChild(badgeContainer);

      const lane = Math.floor(Math.random() * 5);
      const visualItem: VisualKrathong = {
        id: event.id,
        container,
        event,
        lane,
        progress: 0,
        speed: isGold ? 0.00022 : 0.00035,
        driftOffset: Math.random() * Math.PI * 2,
        isAmbient: false,
      };

      riverContainerRef.current.addChild(container);
      krathongsRef.current.push(visualItem);
    }

    function clearAllKrathongs() {
      if (!riverContainerRef.current) return;
      for (const item of krathongsRef.current) {
        riverContainerRef.current.removeChild(item.container);
        item.container.destroy({ children: true });
      }
      krathongsRef.current = [];
      // Re-add ambient
      for (let i = 0; i < 5; i++) {
        spawnAmbientKrathong(Math.random() * 0.6);
      }
    }

    initPixi();

    // ==========================================
    // 5. WEBSOCKET SYNC
    // ==========================================
    let ws: WebSocket;
    let reconnectTimeout: any;

    function connectWs() {
      ws = new WebSocket(WS_URL);

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          if (msg.type === 'snapshot') {
            setTotalKrathongs(msg.total);
            setMode(msg.mode);
            // Spawn any active krathongs from snapshot
            if (Array.isArray(msg.active)) {
              for (const activeEvt of msg.active) {
                spawnUserKrathong(activeEvt);
              }
              const wishes = msg.active.filter(k => !!k.text).slice(-4).reverse();
              setRecentWishes(wishes);
            }
          } else if (msg.type === 'krathong') {
            setTotalKrathongs((prev) => prev + 1);
            spawnUserKrathong(msg.event);
            if (msg.event.text) {
              setRecentWishes((prev) => [msg.event, ...prev.slice(0, 3)]);
            }
            if (msg.event.kind === 'gift') {
              setRecentGift({
                name: msg.event.user.name,
                text: msg.event.text || 'ส่งของขวัญพิเศษ!',
              });
              setTimeout(() => setRecentGift(null), 8000);
            }
          } else if (msg.type === 'lantern') {
            setTotalLikes(msg.likeTotal);
          } else if (msg.type === 'control') {
            if (msg.action === 'clear') {
              clearAllKrathongs();
            } else if (msg.action === 'fallback' || msg.action === 'live') {
              setMode(msg.action);
            }
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWs, 3000);
      };
    }

    connectWs();

    return () => {
      isCancelled = true;
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
      if (app) app.destroy(true);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-[#02050f] flex items-center justify-center overflow-hidden">
      {/* 1080x1920 Stage with auto-fit scale */}
      <div
        style={{
          width: '1080px',
          height: '1920px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative shrink-0 overflow-hidden bg-black select-none shadow-2xl"
      >
        {/* PixiJS WebGL Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* --- HUD / UI Overlay Layer (React) --- */}

        {/* Top Safe Area & Stats Header */}
        <div className="absolute top-28 left-10 right-10 flex items-start justify-between pointer-events-none z-10">
          {/* Total Krathong Counter */}
          <div className="px-6 py-3.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-amber-500/30 shadow-2xl flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <div className="text-xs text-amber-300 font-medium tracking-wider uppercase">
                ลอยกระทงแล้ว
              </div>
              <div className="text-3xl font-extrabold text-amber-100">
                {totalKrathongs.toLocaleString()} <span className="text-lg font-normal text-slate-400">ใบ</span>
              </div>
            </div>
          </div>

          {/* Like Accumulation Bar */}
          <div className="px-6 py-3.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-rose-500/30 shadow-2xl flex items-center gap-3">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500 animate-pulse" />
            <div>
              <div className="text-xs text-rose-300 font-medium">พลังไลก์ปล่อยโคม</div>
              <div className="text-xl font-bold text-white">
                {totalLikes.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ 500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gift Banner Notification */}
        {recentGift && (
          <div className="absolute top-52 left-1/2 -translate-x-1/2 w-[720px] px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-600/95 via-amber-500/95 to-yellow-500/95 border-2 border-yellow-200 text-slate-950 shadow-2xl flex items-center gap-4 animate-bounce z-20">
            <div className="text-4xl">✨</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-950">
                ขอบคุณผู้สนับสนุน: {recentGift.name}
              </div>
              <div className="text-xl font-extrabold text-white drop-shadow">
                {recentGift.text}
              </div>
            </div>
          </div>
        )}

        {/* Live Wish Stream Feed (Floating Card Stack on Left) */}
        <div className="absolute top-[28%] left-10 w-[420px] space-y-3 pointer-events-none z-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-amber-500/30 text-amber-300 text-xs shadow-lg backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold tracking-wide">สายธารคำอธิษฐานสด</span>
          </div>

          <div className="space-y-2.5">
            {recentWishes.map((item, idx) => {
              const isGold = item.style === 'gold' || item.style === 'gold-aura';
              const isLotus = item.style === 'lotus';
              const isBread = item.style === 'bread';

              return (
                <div
                  key={item.id + idx}
                  className={`p-3.5 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-xl ${
                    isGold
                      ? 'bg-gradient-to-r from-amber-950/85 via-slate-900/90 to-slate-950/90 border-amber-400/60 ring-1 ring-amber-400/40 text-amber-100'
                      : isLotus
                      ? 'bg-slate-950/85 border-pink-500/40 text-pink-100'
                      : isBread
                      ? 'bg-slate-950/85 border-amber-600/40 text-amber-100'
                      : 'bg-slate-950/85 border-emerald-500/40 text-emerald-100'
                  }`}
                  style={{
                    opacity: Math.max(0.2, 1 - idx * 0.22),
                    transform: `scale(${1 - idx * 0.04})`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {isGold ? '👑' : isLotus ? '🪷' : isBread ? '🍞' : '🌿'}
                      </span>
                      <span className="text-xs font-bold text-white tracking-wide">
                        {item.user.name}
                      </span>
                    </div>
                    {item.source === 'web' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        เว็บ
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-100 line-clamp-2 leading-snug drop-shadow-sm">
                    "{item.text}"
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Riverbank Helper Banner (Anchored at the bottom dock above TikTok chat safe zone) */}
        <div className="absolute bottom-[22%] left-10 right-10 text-center pointer-events-none z-10">
          <div className="inline-block px-8 py-3 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-500/30 text-slate-200 text-lg shadow-2xl">
            พิมพ์คำอธิษฐานในแชต เช่น <span className="text-amber-300 font-bold">"ขอให้รวย #ดอกบัว"</span> เพื่อลอยกระทง
          </div>
        </div>

        {/* Fallback Mode Banner */}
        {mode === 'fallback' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center z-50">
            <div className="w-64 h-64 bg-white p-4 rounded-3xl shadow-2xl flex items-center justify-center text-slate-950 font-bold text-xl mb-6">
              [ สแกน QR Code ตรงนี้เพื่อลอยกระทง ]
            </div>
            <h2 className="text-4xl font-bold text-amber-200 mb-2">
              ร่วมส่งคำอธิษฐานผ่านหน้าเว็บ
            </h2>
            <p className="text-xl text-slate-300">
              สแกนแล้วพิมพ์ชื่อกับคำอธิษฐานได้เลย กระทงจะลอยขึ้นบนจอนี้ทันที
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


