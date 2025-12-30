import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ToastProvider } from "@/contexts/ToastContext";

export const metadata: Metadata = {
  title: "SHFLPro | SHFL Token Terminal",
  description: "Track SHFL token staking profitability and lottery yields with real-time data",
  keywords: ["SHFL", "SHFLPro", "Shuffle", "yield", "staking", "lottery", "crypto"],
  icons: {
    icon: "https://i.ibb.co/TDMBKTP7/shfl-logo-2.png",
    shortcut: "https://i.ibb.co/TDMBKTP7/shfl-logo-2.png",
    apple: "https://i.ibb.co/TDMBKTP7/shfl-logo-2.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical font */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          as="style"
        />
        
        {/* Preload critical API endpoints for faster initial load */}
        <link
          rel="preconnect"
          href="https://api.coingecko.com"
          crossOrigin="anonymous"
        />
        
        <link rel="icon" href="https://i.ibb.co/TDMBKTP7/shfl-logo-2.png" />
        <meta name="color-scheme" content="dark" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://shfl.shuffle.com" />
        <link rel="dns-prefetch" href="https://api.coingecko.com" />
        <link rel="dns-prefetch" href="https://cryptologos.cc" />
      </head>
      <body className="min-h-screen bg-terminal-black text-terminal-text font-mono antialiased">
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <CurrencyProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </CurrencyProvider>
        <Analytics />
      </body>
    </html>
  );
}
