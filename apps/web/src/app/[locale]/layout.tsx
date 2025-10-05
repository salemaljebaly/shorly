import React from 'react';
import type { Metadata } from 'next';
import { Inter, Zain } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const zain = Zain({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-zain',
});

export const metadata: Metadata = {
  title: 'shorly - Global Link Management Platform',
  description: 'Create short links and OneLinks with device-based routing, analytics, and QR codes',
};

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ar' }];
}

export default function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = React.use(params);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? zain.className : inter.className;

  return (
    <html lang={locale} dir={dir}>
      <body className={fontClass}>{children}</body>
    </html>
  );
}
