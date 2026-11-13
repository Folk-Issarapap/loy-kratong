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
}

export default function RiverPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const krathongsRef = useRef<VisualKrathong[]>([]);
  const [totalKrathongs, setTotalKrathongs] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [recentGift, setRecentGift] = useState<{ name: string; text: string } | null>(null);
  const [mode, setMode] = useState<'live' | 'fallback'>('live');

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
        backgroundColor: 0x070b19,
        antialias: true,
        resolution: 1,
      });

      if (isCancelled) {
        app.destroy(true);
        return;
      }

      appRef.current = app;

      // --- Background: Sky, Moon, Horizon, River ---
      const bgGraphics = new PIXI.Graphics();
      
      // Sky gradient (0 to 800)
      bgGraphics.rect(0, 0, 1080, 800);
      bgGraphics.fill(0x060918);

      // Moon
      bgGraphics.circle(850, 260, 90);
      bgGraphics.fill({ color: 0xfff4d0, alpha: 0.95 });
      bgGraphics.circle(850, 260, 120);
      bgGraphics.fill({ color: 0xffd27d, alpha: 0.15 });

      // Water area (800 to 1920)
      bgGraphics.rect(0, 800, 1080, 1120);
      bgGraphics.fill(0x0a1435);

      app.stage.addChild(bgGraphics);

      // River layer container
      const riverContainer = new PIXI.Container();
      app.stage.addChild(riverContainer);

      // Animation ticker
      app.ticker.add((time) => {
        const delta = time.deltaTime;

        // Animate each active krathong floating towards the horizon
        const activeList = krathongsRef.current;
        for (let i = activeList.length - 1; i >= 0; i--) {
          const item = activeList[i];
          item.progress += item.speed * delta;

          // Spawn Y is ~1350 (safe above bottom 35% chat), Horizon Y is ~850
          const startY = 1350;
          const endY = 850;
          const currentY = startY - (startY - endY) * item.progress;

          // Lane X positioning (5 lanes: 180, 360, 540, 720, 900)
          const laneX = 180 + item.lane * 180;
          const driftX = Math.sin(item.progress * 6 + item.driftOffset) * 20;

          item.container.x = laneX + driftX;
          item.container.y = currentY;

          // Perspective scaling & fading: 1.0 down to 0.4
          const scale = 1.0 - item.progress * 0.6;
          item.container.scale.set(scale);
          item.container.alpha = item.progress > 0.8 ? (1 - item.progress) / 0.2 : 1;

          // Removed when reached horizon
          if (item.progress >= 1) {
            riverContainer.removeChild(item.container);
            item.container.destroy({ children: true });
            activeList.splice(i, 1);
          }
        }
      });
    }

    initPixi();

    // --- WebSocket Client ---
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
          } else if (msg.type === 'krathong') {
            setTotalKrathongs((prev) => prev + 1);
            spawnKrathong(msg.event);
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

    function spawnKrathong(event: KrathongEvent) {
      if (!appRef.current) return;

      const container = new PIXI.Container();

      // Base body color by style
      const isGold = event.style === 'gold' || event.style === 'gold-aura';
      const isLotus = event.style === 'lotus';
      const isBread = event.style === 'bread';

      const baseColor = isGold ? 0xffd700 : (isLotus ? 0xff70a6 : (isBread ? 0xd4a373 : 0x2d6a4f));

      const graphics = new PIXI.Graphics();
      // Krathong base
      graphics.ellipse(0, 0, isGold ? 70 : 50, isGold ? 35 : 25);
      graphics.fill(baseColor);
      graphics.stroke({ width: 3, color: isGold ? 0xffffff : 0x1b4332 });

      // Candle flame
      graphics.circle(0, -18, isGold ? 12 : 8);
      graphics.fill(0xffa200);
      graphics.circle(0, -18, isGold ? 6 : 4);
      graphics.fill(0xffffff);

      container.addChild(graphics);

      // Name & Wish Text (Bitmap/Canvas Text)
      const labelText = event.text
        ? `${event.user.name}: ${event.text}`
        : event.user.name;

      const text = new PIXI.Text({
        text: labelText,
        style: {
          fontFamily: 'Noto Sans Thai, sans-serif',
          fontSize: isGold ? 26 : 22,
          fill: isGold ? '#ffe600' : '#ffffff',
          fontWeight: 'bold',
          dropShadow: {
            alpha: 0.9,
            blur: 4,
            distance: 2,
            color: '#000000',
          },
        },
      });
      text.anchor.set(0.5, 1);
      text.y = -35;
      container.addChild(text);

      const lane = Math.floor(Math.random() * 5);
      const visualItem: VisualKrathong = {
        id: event.id,
        container,
        event,
        lane,
        progress: 0,
        speed: isGold ? 0.0003 : 0.0005, // Gold stays longer
        driftOffset: Math.random() * Math.PI * 2,
      };

      appRef.current.stage.addChild(container);
      krathongsRef.current.push(visualItem);
    }

    function clearAllKrathongs() {
      for (const item of krathongsRef.current) {
        if (appRef.current) {
          appRef.current.stage.removeChild(item.container);
        }
        item.container.destroy({ children: true });
      }
      krathongsRef.current = [];
    }

    return () => {
      isCancelled = true;
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
      if (app) app.destroy(true);
    };
  }, []);

  return (
    <div className="relative w-[1080px] h-[1920px] overflow-hidden bg-black select-none">
      {/* PixiJS WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* --- HUD / UI Overlay Layer (React) --- */}

      {/* Top Safe Area & Stats Header */}
      <div className="absolute top-28 left-8 right-8 flex items-start justify-between pointer-events-none">
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
        <div className="absolute top-52 left-1/2 -translate-x-1/2 w-[700px] px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-yellow-600/90 border-2 border-yellow-200 text-slate-950 shadow-2xl flex items-center gap-4 animate-bounce">
          <div className="text-3xl">✨</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-950">
              ขอบคุณผู้สนับสนุน: {recentGift.name}
            </div>
            <div className="text-lg font-extrabold text-white drop-shadow">
              {recentGift.text}
            </div>
          </div>
        </div>
      )}

      {/* Mid-screen Helper / Instruction Banner */}
      <div className="absolute bottom-[38%] left-8 right-8 text-center pointer-events-none">
        <div className="inline-block px-8 py-3 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-700/60 text-slate-300 text-lg shadow-lg">
          พิมพ์คำอธิษฐานในแชต เช่น <span className="text-amber-300 font-bold">"ขอให้รวย #ดอกบัว"</span> เพื่อลอยกระทง
        </div>
      </div>

      {/* Fallback Mode Banner */}
      {mode === 'fallback' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg flex flex-col items-center justify-center p-12 text-center z-50">
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
  );
}

