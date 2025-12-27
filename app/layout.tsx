import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHFL Yield Dashboard | Bloomberg Terminal",
  description: "Track SHFL token staking profitability and lottery yields with real-time data",
  keywords: ["SHFL", "Shuffle", "yield", "staking", "lottery", "crypto"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-terminal-black text-terminal-text font-mono antialiased">
        {children}
      </body>
    </html>
  );
}

