import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FarcasterProvider } from "@/lib/farcaster-provider";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poker Manager",
  description: "Manage live poker games with automated wallet-based settlements",
  manifest: "/manifest.json",
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://poker-manager-murex.vercel.app/og-image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only load Farcaster Frame SDK on mainnet
  const isMainnet = process.env.NEXT_PUBLIC_USE_MAINNET === 'true'

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {isMainnet ? (
            <FarcasterProvider>
              {children}
            </FarcasterProvider>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
