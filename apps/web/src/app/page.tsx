'use client';

import React, { useState } from 'react';
import { Sparkles, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { KrathongStyle } from '@loy-kratong/shared';

const ROOM_HTTP = process.env.NEXT_PUBLIC_ROOM_HTTP_URL || 'http://127.0.0.1:8787';

export default function HomePage() {
  const [name, setName] = useState('');
  const [wish, setWish] = useState('');
  const [style, setStyle] = useState<KrathongStyle>('banana');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !wish.trim()) {
      setError('กรุณากรอกชื่อเล่นและคำอธิษฐานให้ครบถ้วน');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${ROOM_HTTP}/krathong`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          wish: wish.trim(),
          style,
        }),
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถส่งกระทงได้ กรุณาลองใหม่อีกครั้ง');
      }

      setSuccess(true);
      setWish('');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#090e24] via-[#0d163a] to-[#060a17]">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-3">
            <Sparkles className="w-3.5 h-3.5" /> คืนวันลอยกระทง 2569
          </div>
          <h1 className="text-2xl font-bold text-amber-100 tracking-wide">
            ร่วมลอยกระทงออนไลน์
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            คำอธิษฐานของคุณจะไปปรากฏบนสายน้ำใน TikTok LIVE ทันที
          </p>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-semibold text-emerald-200">
              ลอยกระทงสำเร็จแล้ว!
            </h3>
            <p className="text-sm text-slate-300">
              กระทงของคุณกำลังลอยอยู่ในแม่น้ำบน TikTok LIVE ของเราแล้วนะ ✨
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-4 px-6 py-2 rounded-xl bg-amber-500 text-slate-950 font-medium hover:bg-amber-400 transition"
            >
              ลอยกระทงอีกใบ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ชื่อเล่นของคุณ
              </label>
              <input
                type="text"
                maxLength={20}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น น้องโบว์, พี่ท๊อป"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                คำอธิษฐาน (ไม่เกิน 40 ตัวอักษร)
              </label>
              <textarea
                maxLength={40}
                required
                rows={2}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="ขอให้มีแต่ความสุข ร่ำรวยเงินทอง..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-sm resize-none"
              />
              <div className="text-right text-[10px] text-slate-500 mt-1">
                {wish.length}/40 ตัวอักษร
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                เลือกแบบกระทง
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'banana', label: '🌿 ใบตอง' },
                  { id: 'lotus', label: '🪷 ดอกบัว' },
                  { id: 'bread', label: '🍞 ขนมปัง' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStyle(item.id as KrathongStyle)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition ${
                      style === item.id
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300 shadow-sm'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-semibold flex items-center justify-center gap-2 hover:from-amber-400 hover:to-amber-300 transition disabled:opacity-50 shadow-lg shadow-amber-500/20 text-sm"
            >
              {submitting ? (
                'กำลังลอยกระทง...'
              ) : (
                <>
                  <Send className="w-4 h-4" /> ส่งกระทงลงแม่น้ำ
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            ดูภาพกระทงของคุณได้สดๆ บนหน้าจอไลฟ์ TikTok
          </p>
        </div>
      </div>
    </main>
  );
}

