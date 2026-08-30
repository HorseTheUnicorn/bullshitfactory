import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bullshit Factory — 16-Bit Continuous Nonsense Network',
  description:
    'A retro 16-bit animated workplace comedy about bad policies, worse ideas, and a dog who only barks.',
  openGraph: {
    title: 'Bullshit Factory — 16-Bit Continuous Nonsense Network',
    description:
      'A continuous animated stream of factory-floor bullshit with ten pixel characters.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bullshit Factory — 16-Bit Continuous Nonsense Network',
    description:
      'A continuous animated stream of factory-floor bullshit with ten pixel characters.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
