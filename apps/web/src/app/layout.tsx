import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ลอยกระทงออนไลน์ บน TikTok LIVE',
  description: 'ลอยกระทงเรียลไทม์ ร่วมส่งคำอธิษฐานลงบนแม่น้ำในไลฟ์สด',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased min-h-screen bg-[#070a14] text-white">
        {children}
      </body>
    </html>
  );
}

