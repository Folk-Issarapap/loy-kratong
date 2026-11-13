'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Play,
  Pause,
  Trash2,
  Radio,
  UserX,
  RefreshCw,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { AdminStats } from '@loy-kratong/shared';

const ROOM_HTTP = process.env.NEXT_PUBLIC_ROOM_HTTP_URL || 'http://127.0.0.1:8787';

export default function AdminPage() {
  const [token, setToken] = useState('admin_loy_kratong_master_token');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [blockUserId, setBlockUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch(`${ROOM_HTTP}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      // Ignored in polling
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAction = async (action: string, payload: any = {}) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${ROOM_HTTP}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`สำเร็จ: สั่งการ ${action} เรียบร้อยแล้ว`);
        fetchStats();
      } else {
        setMessage(`ผิดพลาด: ${data.error || 'ไม่สำเร็จ'}`);
      }
    } catch (err: any) {
      setMessage(`ข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isIngestorSilent = stats?.lastEventTime
    ? Date.now() - stats.lastEventTime > 60000
    : false;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                แผงควบคุมผู้คุมห้อง (Admin Dashboard)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                คืนวันลอยกระทง TikTok LIVE · ระบบมอนิเตอร์และควบคุมสด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Admin Bearer Token"
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={fetchStats}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ingestor Warning Alert */}
        {isIngestorSilent && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300">
            <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400 animate-bounce" />
            <div className="text-sm">
              <span className="font-bold">เตือนภัย Ingestor เงียบเกิน 60 วินาที!</span>{' '}
              TikTok อาจหลุดหรือเน็ตสตรีมเมอร์มีปัญหา กรุณาตรวจสอบสถานะโปรแกรม Ingestor บนเครื่อง หรือสลับเป็นโหมดสำรอง
            </div>
          </div>
        )}

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">กระทงทั้งหมดที่ลอยแล้ว</div>
            <div className="text-3xl font-bold text-amber-400 mt-2">
              {stats?.totalKrathongs.toLocaleString() ?? '-'}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">กระทงบนจอ / ในคิว</div>
            <div className="text-3xl font-bold text-cyan-400 mt-2">
              {stats?.activeCount ?? '-'} <span className="text-sm font-normal text-slate-500">/ {stats?.queueCount ?? 0}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">ยอดไลก์สะสม</div>
            <div className="text-3xl font-bold text-rose-400 mt-2">
              {stats?.likeTotal.toLocaleString() ?? '-'}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">สถานะห้อง / โหมด</div>
            <div className="text-2xl font-bold mt-2 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  stats?.isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                }`}
              />
              <span className={stats?.isPaused ? 'text-amber-400' : 'text-emerald-400'}>
                {stats?.isPaused ? 'PAUSED' : 'ACTIVE'}
              </span>
              <span className="text-xs font-normal text-slate-400 uppercase">
                ({stats?.mode})
              </span>
            </div>
          </div>
        </div>

        {/* Notification Feedback */}
        {message && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-center font-medium">
            {message}
          </div>
        )}

        {/* Quick Action Controls */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            ปุ่มควบคุมเร่งด่วน (Live Actions)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pause / Resume */}
            {stats?.isPaused ? (
              <button
                disabled={loading}
                onClick={() => handleAction('resume')}
                className="p-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center justify-center gap-2 transition"
              >
                <Play className="w-5 h-5" /> ปลดหยุดชั่วคราว (Resume)
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={() => handleAction('pause')}
                className="p-4 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold flex items-center justify-center gap-2 transition"
              >
                <Pause className="w-5 h-5" /> พักรับกระทง (Pause)
              </button>
            )}

            {/* Clear Screen */}
            <button
              disabled={loading}
              onClick={() => handleAction('clear')}
              className="p-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-semibold flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-5 h-5" /> ล้างกระทงบนจอทั้งหมด (Clear)
            </button>

            {/* Toggle Fallback Mode */}
            {stats?.mode === 'live' ? (
              <button
                disabled={loading}
                onClick={() => handleAction('fallback')}
                className="p-4 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-semibold flex items-center justify-center gap-2 transition"
              >
                <Radio className="w-5 h-5" /> สลับโหมดสำรอง (Fallback QR)
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={() => handleAction('live')}
                className="p-4 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-semibold flex items-center justify-center gap-2 transition"
              >
                <Radio className="w-5 h-5" /> สลับกลับโหมดปกติ (Live)
              </button>
            )}
          </div>

          {/* User Moderation */}
          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 mb-2">
              บล็อกผู้ใช้ที่ไม่เหมาะสม (Block User by ID)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={blockUserId}
                onChange={(e) => setBlockUserId(e.target.value)}
                placeholder="ใส่ TikTok User ID ที่ต้องการบล็อก..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-rose-400 focus:outline-none"
              />
              <button
                disabled={loading || !blockUserId.trim()}
                onClick={() => {
                  handleAction('block', { userId: blockUserId.trim() });
                  setBlockUserId('');
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-500 transition text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <UserX className="w-4 h-4" /> บล็อกทันที
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

