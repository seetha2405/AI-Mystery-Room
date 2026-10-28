import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Mystery Room',
  description: 'Generate a mystery from a story seed and solve the case.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
