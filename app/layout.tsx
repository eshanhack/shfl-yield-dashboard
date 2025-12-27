import type { Metadata } from "next";
import "./globals.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

export const metadata: Metadata = {
  title: "SHFLPro | SHFL Token Dashboard",
  description: "Track SHFL token staking profitability and lottery yields with real-time data",
  keywords: ["SHFL", "SHFLPro", "Shuffle", "yield", "staking", "lottery", "crypto"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-terminal-black text-terminal-text font-mono antialiased">
        <CurrencyProvider>
          {children}
        </CurrencyProvider>
      </body>
    </html>
  );
}

