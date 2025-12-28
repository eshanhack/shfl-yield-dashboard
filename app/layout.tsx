import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ToastProvider } from "@/contexts/ToastContext";

export const metadata: Metadata = {
  title: "SHFLPro | SHFL Token Terminal",
  description: "Track SHFL token staking profitability and lottery yields with real-time data",
  keywords: ["SHFL", "SHFLPro", "Shuffle", "yield", "staking", "lottery", "crypto"],
  icons: {
    icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/29960.png",
    shortcut: "https://s2.coinmarketcap.com/static/img/coins/64x64/29960.png",
    apple: "https://s2.coinmarketcap.com/static/img/coins/64x64/29960.png",
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
        <link rel="icon" href="https://s2.coinmarketcap.com/static/img/coins/64x64/29960.png" />
        <meta name="color-scheme" content="dark" />
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
      </body>
    </html>
  );
}

