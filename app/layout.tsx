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
  openGraph: {
    title: "Poker Manager",
    description: "Manage live poker games with automated wallet-based settlements",
    url: "https://poker-manager-murex.vercel.app",
    siteName: "Poker Manager",
    images: [
      {
        url: "https://poker-manager-murex.vercel.app/og-image.png",
        width: 3600,
        height: 1890,
        alt: "Poker Manager - Manage live poker games",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poker Manager",
    description: "Manage live poker games with automated wallet-based settlements",
    images: ["https://poker-manager-murex.vercel.app/og-image.png"],
  },
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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <FarcasterProvider>
            {children}
          </FarcasterProvider>
        </Providers>
      </body>
    </html>
  );
}
