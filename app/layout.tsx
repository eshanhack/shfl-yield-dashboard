import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://s2.coinmarketcap.com/static/img/coins/64x64/29960.png" />
      </head>
      <body className="min-h-screen bg-terminal-black text-terminal-text font-mono antialiased">
        <CurrencyProvider>
          {children}
        </CurrencyProvider>
      </body>
    </html>
  );
}

