import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navigation } from './components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Jetson - USDS Platform',
  description: 'The yield platform for exchanging USDC with synthetic token USDS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-gray-900 min-h-screen`}>
        <Providers>
          <Navigation />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
