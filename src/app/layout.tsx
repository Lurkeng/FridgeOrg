import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'FreshTrack — Fridge & Freezer Organizer',
  description: 'Track your food, reduce waste, and discover recipes with what you have.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto scrollbar-thin animate-page-enter">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
