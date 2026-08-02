import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from './Providers'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FacturaSUNAT AI — Facturación Electrónica para MYPES",
  description: "Sistema de facturación electrónica UBL 2.1 con envío directo a SUNAT, firma digital automática y reportes SIRE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
